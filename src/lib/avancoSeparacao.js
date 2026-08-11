// Lógica central de avanço de status da Separação. Extraída de
// src/pages/KanbanSeparacao.jsx para ser reaproveitada também pela tela de
// Posto de Trabalho (tablet), garantindo que ambas disparem exatamente as
// mesmas automações (saída de estoque, marcar pedido como separado, etc).
//
// IMPORTANTE: esta função não mexe em estado de UI (setSeparacoes/setLoadingId)
// — isso é responsabilidade de quem chama.

import { base44 } from '@/api/base44Client';
import { registrarLog } from '@/lib/audit';
import { agoraISO } from '@/lib/brasilia';

export function buildProximosSeparacao(colunas) {
  const map = {};
  for (let i = 0; i < colunas.length - 1; i++) map[colunas[i].key] = colunas[i + 1].key;
  return map;
}

/**
 * Avança o status de uma Separação para a próxima etapa configurada,
 * executando as automações associadas (saída de estoque, sincronização de
 * status do Pedido, log de auditoria, regras de automação).
 *
 * @param {object} sep - registro atual da Separacao
 * @param {object} contexto
 * @param {Array}  contexto.colunas - colunas atuais do Kanban de Separação
 * @returns {Promise<{ proximo: string, updates: object }>}
 */
export async function avancarStatusSeparacao(sep, contexto) {
  const { colunas } = contexto;
  if (sep.status === 'aguardando_producao') return { proximo: null, updates: null }; // bloqueado até a produção concluir

  // Bloqueada em "Separado" aguardando a irmã chegar também — só avança sozinha
  // se o gerente liberar via PIN (o que zera separacao_irma_id).
  if (sep.status === 'separado' && sep.separacao_irma_id) {
    return { proximo: null, updates: null, bloqueadaPorIrma: true };
  }

  const PROXIMOS = buildProximosSeparacao(colunas);
  const proximo = PROXIMOS[sep.status];
  if (!proximo) return { proximo: null, updates: null };

  const agora = agoraISO();
  const updates = { status: proximo };
  if (proximo === 'em_separacao') updates.data_inicio_separacao = agora;
  if (proximo === 'separado') updates.data_separado = agora;
  if (proximo === 'em_conferencia') updates.data_conferencia = agora;
  if (proximo === 'liberado_expedicao') updates.data_liberacao = agora;

  // Fusão automática: ao entrar em "Separado", se a irmã já está esperando lá, funde as duas num card só
  if (proximo === 'separado' && sep.separacao_irma_id) {
    const irmas = await base44.entities.Separacao.filter({ id: sep.separacao_irma_id }).catch(() => []);
    const irma = irmas[0];
    if (irma && irma.status === 'separado') {
      const itensMap = {};
      for (const i of (sep.itens || [])) itensMap[i.produto_id || i.produto_nome] = { ...i };
      for (const i of (irma.itens || [])) {
        const k = i.produto_id || i.produto_nome;
        if (itensMap[k]) itensMap[k].quantidade = (itensMap[k].quantidade || 0) + (i.quantidade || 0);
        else itensMap[k] = { ...i };
      }
      const itensFundidos = Object.values(itensMap);
      updates.itens = itensFundidos;
      updates.quantidade_itens = itensFundidos.length;
      updates.quantidade_total = itensFundidos.reduce((s, i) => s + (i.quantidade || 0), 0);
      updates.separacao_irma_id = null;
      updates.separacao_irma_numero = null;

      await base44.entities.Separacao.update(irma.id, {
        status: 'mesclada',
        mesclada_em_id: sep.id,
        separacao_irma_id: null,
      });
      registrarLog('Separacao', irma.id, 'FUNDIDA',
        `Separação ${irma.numero} fundida em ${sep.numero} — as duas partes do pedido chegaram em Separado`).catch(() => {});
      registrarLog('Separacao', sep.id, 'FUNDIU_IRMA',
        `Separação ${sep.numero} absorveu a irmã ${irma.numero} — pedido completo, seguindo unificado`).catch(() => {});
    }
    // Se a irmã ainda não chegou em "Separado", esta segue pra "Separado" mas mantém
    // separacao_irma_id preenchido — fica bloqueada ali até a irmã chegar ou o gerente liberar.
  }

  const colProx = colunas.find((c) => c.key === proximo);
  const acoesProx = Array.isArray(colProx?.acoes) && colProx.acoes.length > 0 ?
    colProx.acoes :
    proximo === 'liberado_expedicao' ? ['saida_estoque', 'marcar_pedido_separado'] : [];
  const temAcao = (a) => acoesProx.includes(a);

  if (temAcao('saida_estoque') && sep.itens?.length > 0 && !sep.estoque_ja_reservado) {
    const produtos = await base44.entities.Produto.list();
    await Promise.all((sep.itens || []).map(async (item) => {
      const prod = produtos.find((p) => p.id === item.produto_id);
      if (!prod) return;
      await base44.entities.Produto.update(prod.id, { estoque_atual: Math.max(0, (prod.estoque_atual || 0) - (item.quantidade || 0)) });
      registrarLog('Produto', prod.id, 'SAIDA_ESTOQUE',
        `Saída de ${item.quantidade} un de ${prod.nome} — reservado ao pedido ${sep.pedido_numero || sep.grupo_cliente_nome || sep.numero} (separação ${sep.numero} finalizada)`).catch(() => {});
    }));
  }

  await base44.entities.Separacao.update(sep.id, updates);

  import('@/lib/regrasAutomacao').then(({ executarRegrasCardMovido }) =>
    executarRegrasCardMovido('separacao', { ...sep, ...updates }, proximo).catch(() => {}));

  const labelProximo = colunas.find((c) => c.key === proximo)?.label || proximo;
  registrarLog('Separacao', sep.id, 'AVANCO_STATUS', `Separação ${sep.numero} avançou para "${labelProximo}"`).catch(() => {});

  if (temAcao('marcar_pedido_separado') && sep.pedido_id) {
    const todas = await base44.entities.Separacao.filter({ pedido_id: sep.pedido_id });
    const todasLiberadas = todas.every((s) => s.id === sep.id ? true : s.status === proximo);
    if (todasLiberadas) {
      const peds = await base44.entities.Pedido.filter({ id: sep.pedido_id });
      if (peds[0]) {
        await base44.entities.Pedido.update(peds[0].id, { status: 'separado' });
        registrarLog('Pedido', peds[0].id, 'STATUS', `Pedido ${peds[0].numero} separado. Aguardando expedição.`).catch(() => {});
      }
    }
  }

  return { proximo, updates };
}
