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

  const PROXIMOS = buildProximosSeparacao(colunas);
  const proximo = PROXIMOS[sep.status];
  if (!proximo) return { proximo: null, updates: null };

  const agora = agoraISO();
  const updates = { status: proximo };
  if (proximo === 'em_separacao') updates.data_inicio_separacao = agora;
  if (proximo === 'separado') updates.data_separado = agora;
  if (proximo === 'em_conferencia') updates.data_conferencia = agora;
  if (proximo === 'liberado_expedicao') updates.data_liberacao = agora;

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
