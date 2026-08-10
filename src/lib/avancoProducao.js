// Lógica central de avanço de status da OrdemProducao no fluxo de Produção.
// Extraída de src/pages/Kanban.jsx para ser reaproveitada também pela tela de
// Posto de Trabalho (tablet), garantindo que ambas disparem exatamente as
// mesmas automações (estoque, etiquetas, WhatsApp, sincronização de Pedido/Grupo).
//
// IMPORTANTE: esta função não mexe em estado de UI (setOrdens/setLoadingId) —
// isso é responsabilidade de quem chama (Kanban.jsx ou PostoTrabalho.jsx).

import { base44 } from '@/api/base44Client';
import { registrarLog } from '@/lib/audit';
import { gerarLote } from '@/lib/numeracao';
import { agoraISO, hojeData } from '@/lib/brasilia';
import { cachedFetch, cacheInvalidate, cacheGet, cacheSet } from '@/lib/entityCache';

export function buildProximos(colunas) {
  const map = {};
  for (let i = 0; i < colunas.length - 1; i++) map[colunas[i].key] = colunas[i + 1].key;
  return map;
}

/**
 * Avança o status de uma OrdemProducao para a próxima etapa configurada,
 * executando todas as automações associadas (entrada/saída de estoque,
 * geração de etiquetas, criação de Separação, sincronização de Pedido/Grupo,
 * notificação WhatsApp, log de auditoria).
 *
 * @param {object} ordem - registro atual da OrdemProducao
 * @param {object} contexto
 * @param {Array}  contexto.kanbanColunas - colunas atuais do Kanban de Produção (com campo `acao`/`acoes`)
 * @param {object} contexto.pedidoMap - mapa pedido_id -> { nome, cliente_id, white_label, ... }
 * @param {object} contexto.grupoMapById - mapa grupo_id -> GrupoPedidos
 * @param {object} [contexto.waCfg] - config de notificação WhatsApp (etapas_notificar, notificar_cliente, numeros_internos)
 * @param {Array}  [contexto.descarte] - itens descartados nesta transição, quando aplicável
 * @returns {Promise<{ proximo: string, updates: object }>}
 */
export async function avancarStatusOP(ordem, contexto) {
  const { kanbanColunas, pedidoMap = {}, grupoMapById = {}, waCfg = {}, descarte = null } = contexto;
  const PROXIMOS = buildProximos(kanbanColunas);
  const proximo = PROXIMOS[ordem.status];
  if (!proximo) return { proximo: null, updates: null };

  const agora = agoraISO();
  const updates = { status: proximo };
  let usuarioAtual = 'sistema';
  try {
    const me = await base44.auth.me();
    usuarioAtual = me?.email || me?.full_name || 'sistema';
  } catch {}

  const colunaProximo = kanbanColunas.find((c) => c.key === proximo);
  const acoesProximo = Array.isArray(colunaProximo?.acoes) && colunaProximo.acoes.length > 0 ?
    colunaProximo.acoes :
    colunaProximo?.acao && colunaProximo.acao !== 'nenhuma' ? [colunaProximo.acao] : [];
  const temAcao = (a) => acoesProximo.includes(a);

  // ── Registrar data de início ────────────────────────────────────────────
  if (temAcao('registrar_data_inicio')) updates.data_inicio = agora;

  // ── Produzido: finaliza produção + entrada no estoque ──────────────────
  if (temAcao('registrar_data_fim_producao') || temAcao('finalizar_producao')) {
    updates.data_fim_producao = agora;
    updates.lote = ordem.lote || gerarLote(ordem.produto_id);
    cacheInvalidate('Produto');
    const produtosFrescos = await cachedFetch('Produto', () => base44.entities.Produto.list(), 0);
    const itensOP = ordem.itens && ordem.itens.length > 0 ?
      ordem.itens :
      ordem.produto_id ? [{ produto_id: ordem.produto_id, produto_nome: ordem.produto_nome, quantidade: ordem.quantidade }] : [];
    await Promise.all(itensOP.map(async (item) => {
      const prod = produtosFrescos.find((p) => p.id === item.produto_id);
      if (!prod) return;
      const descarteItem = Array.isArray(descarte) ? descarte.find((d) => d.produto_id === item.produto_id) : null;
      const qtdDescartada = descarteItem?.quantidade || 0;
      const qtdFinal = item.quantidade - qtdDescartada;
      await base44.entities.Produto.update(prod.id, { estoque_atual: (prod.estoque_atual || 0) + qtdFinal });
      registrarLog('Produto', prod.id, 'ENTRADA_ESTOQUE', `Entrada de ${qtdFinal} un de ${prod.nome} via OP ${ordem.numero}${qtdDescartada > 0 ? ` (${qtdDescartada} un descartadas)` : ''}`).catch(() => {});
    }));
  }

  // ── Produção Finalizada: envia automaticamente para o Kanban de Separação ──
  if (temAcao('finalizar_producao')) {
    import('@/lib/separacao').then(({ criarSeparacaoFromOP }) => {
      criarSeparacaoFromOP({ ...ordem, ...updates }).catch((e) => console.warn('Erro ao criar separação:', e.message));
    });
  }

  // ── Embalagem: registrar data ───────────────────────────────────────────
  if (temAcao('registrar_data_embalagem')) updates.data_embalagem = agora;

  // ── Em Separação: saída do estoque ─────────────────────────────────────
  if (temAcao('saida_estoque')) {
    cacheInvalidate('Produto');
    const produtosFrescos = await cachedFetch('Produto', () => base44.entities.Produto.list(), 0);
    const itensParaProcessar = ordem.itens && ordem.itens.length > 0 ? ordem.itens :
      ordem.produto_id ? [{ produto_id: ordem.produto_id, produto_nome: ordem.produto_nome, quantidade: ordem.quantidade }] : [];
    if (ordem.itens && ordem.itens.length > 0) {
      await base44.entities.OrdemProducao.update(ordem.id, { itens: ordem.itens });
    }
    await Promise.all(itensParaProcessar.map(async (item) => {
      const prod = produtosFrescos.find((p) => p.id === item.produto_id);
      if (!prod) return;
      await base44.entities.Produto.update(prod.id, { estoque_atual: Math.max(0, (prod.estoque_atual || 0) - item.quantidade) });
      registrarLog('Produto', prod.id, 'SAIDA_ESTOQUE', `Saída de ${item.quantidade} un de ${prod.nome} via separação OP ${ordem.numero}`).catch(() => {});
    }));
  }

  // ── Etiquetagem: gera as etiquetas dos itens ao entrar nesta coluna ─────
  if (temAcao('gerar_etiquetas') || /etiqueta/i.test(colunaProximo?.label || '') || /etiqueta/i.test(proximo)) {
    const lote = ordem.lote || gerarLote(ordem.id);
    const dataProducao = hojeData();
    const produtosEtq = await cachedFetch('Produto', () => base44.entities.Produto.list(), 60_000);
    const itensEtq = ordem.itens && ordem.itens.length > 0 ? ordem.itens :
      ordem.produto_id ? [{ produto_id: ordem.produto_id, produto_nome: ordem.produto_nome, quantidade: ordem.quantidade }] : [];
    await Promise.all(itensEtq.map((item) => {
      const prod = produtosEtq.find((p) => p.id === item.produto_id);
      return base44.entities.Etiqueta.create({
        ordem_producao_id: ordem.id, produto_id: item.produto_id,
        produto_nome: item.produto_nome, quantidade: item.quantidade,
        lote, data_producao: dataProducao,
        codigo_barras: prod?.codigo ? String(prod.codigo) : '', impresso: false
      }).catch(() => {});
    }));
  }

  // ── Finalizado: marca pedido como "separado" para liberar expedição em Pedidos ──
  if (temAcao('finalizar_expedicao')) {
    updates.data_finalizacao = agora;
    const { concluirProducaoParaSeparacao } = await import('@/lib/alocacaoPedido');
    const mesclou = await concluirProducaoParaSeparacao(ordem).catch(() => false);
    if (mesclou && ordem.pedido_id) {
      await base44.entities.Pedido.update(ordem.pedido_id, { status: 'separacao' }).catch(() => {});
      await registrarLog('Pedido', ordem.pedido_id, 'STATUS', `Produção da OP ${ordem.numero} concluída — pedido completo e pronto para separação.`);
    } else if (ordem.pedido_id) {
      const todosPedidos = await base44.entities.Pedido.list();
      const ped = todosPedidos.find((p) => p.id === ordem.pedido_id);
      if (ped) {
        const todasOrdens = await base44.entities.OrdemProducao.list();
        const ordens_pedido = todasOrdens.filter((o) => o.pedido_id === ordem.pedido_id);
        const todasFin = ordens_pedido.every((o) => o.id === ordem.id ? true : o.status === proximo);
        if (todasFin) {
          await base44.entities.Pedido.update(ped.id, { status: 'separado' });
          await registrarLog('Pedido', ped.id, 'STATUS', `Pedido ${ped.numero} separado pela Produção. Aguardando expedição.`);
        }
      }
    }
  }

  await base44.entities.OrdemProducao.update(ordem.id, updates);

  import('@/lib/regrasAutomacao').then(({ executarRegrasCardMovido }) =>
    executarRegrasCardMovido('producao', { ...ordem, ...updates }, proximo).catch(() => {}));

  const statusPedidoConfigurado = colunaProximo?.status_pedido;
  if (statusPedidoConfigurado && ordem.pedido_id && !temAcao('finalizar_expedicao')) {
    base44.entities.Pedido.update(ordem.pedido_id, { status: statusPedidoConfigurado }).
      then(() => registrarLog('Pedido', ordem.pedido_id, 'STATUS',
        `Status do pedido sincronizado para "${statusPedidoConfigurado}" via avanço da OP ${ordem.numero}`).catch(() => {})).
      catch(() => {});
  }

  if (ordem.grupo_id) {
    const grupoUpdates = { status_op: proximo };
    if (temAcao('registrar_data_fim_producao')) {
      const grupo = grupoMapById[ordem.grupo_id];
      if (grupo) {
        const qtdProduzida = ordem.itens?.length > 0 ?
          ordem.itens.reduce((s, i) => s + (i.quantidade || 0), 0) :
          ordem.quantidade || 0;
        grupoUpdates.quantidade_produzida = (grupo.quantidade_produzida || 0) + qtdProduzida;
      }
    }
    base44.entities.GrupoPedidos.update(ordem.grupo_id, grupoUpdates).catch(() => {});
  }

  const cachedOrdens = cacheGet('OrdemProducao');
  if (cachedOrdens) {
    cacheSet('OrdemProducao', cachedOrdens.map((o) => (o.id === ordem.id ? { ...o, ...updates } : o)));
  }

  const labelProximo = kanbanColunas.find((c) => c.key === proximo)?.label || proximo;
  registrarLog('OrdemProducao', ordem.id, 'AVANCO_STATUS', `OP ${ordem.numero} (${ordem.produto_nome || ''}) avançou para "${labelProximo}" por ${usuarioAtual}`, usuarioAtual).catch(() => {});

  const etapasWhatsapp = Array.isArray(waCfg.etapas_notificar) ? waCfg.etapas_notificar : ['produzido', 'finalizado'];
  const notificarCliente = waCfg.notificar_cliente !== false;
  const numerosInternos = waCfg.numeros_internos || [];
  if (etapasWhatsapp.includes(proximo)) {
    (async () => {
      try {
        const pedInfo = ordem.pedido_id ? pedidoMap[ordem.pedido_id] : null;
        const clienteNome = pedInfo?.nome || null;
        let clienteTelefone = null;
        if (pedInfo?.cliente_id) {
          const clientes = await base44.entities.Cliente.filter({ id: pedInfo.cliente_id });
          clienteTelefone = clientes[0]?.telefone || null;
        }
        base44.functions.invoke('enviarWhatsappKanban', {
          ordem: { numero: ordem.numero, produto_nome: ordem.produto_nome, quantidade: ordem.quantidade },
          novoStatus: proximo,
          clienteNome,
          clienteTelefone: notificarCliente ? clienteTelefone : null,
          numeros_internos: numerosInternos,
          msg_interno: waCfg.msg_interno || null,
          msg_cliente: waCfg.msg_cliente || null
        }).catch(() => {});
      } catch {}
    })();
  }

  cacheInvalidate('Produto');

  return { proximo, updates };
}
