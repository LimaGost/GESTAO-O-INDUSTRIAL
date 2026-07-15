/**
 * Motor de execução das Regras de Automação (Configurações > Regras de Automação).
 * Executa as regras salvas em 'regras_automacao_v2' quando cards se movem nos Kanbans.
 */
import { base44 } from '@/api/base44Client';
import { loadConfig } from './appConfig';
import { registrarLog } from './audit';

const ENTIDADES = { pedidos: 'Pedido', producao: 'OrdemProducao', separacao: 'Separacao', expedicao: 'Expedicao' };

let cache = null;
let cacheAt = 0;

async function getRegras() {
  if (cache && Date.now() - cacheAt < 30_000) return cache;
  const val = await loadConfig('regras_automacao_v2');
  cache = Array.isArray(val?.regras) ? val.regras : [];
  cacheAt = Date.now();
  return cache;
}

export function invalidarCacheRegras() { cache = null; }

// Encontra o registro correspondente ao card em outro kanban, usando os vínculos entre entidades
async function resolverAlvo(kanbanOrigem, card, kanbanDestino) {
  if (kanbanDestino === kanbanOrigem) return card;
  const E = base44.entities;
  const pedidoId = card.pedido_id || (kanbanOrigem === 'pedidos' ? card.id : null);

  if (kanbanDestino === 'producao') {
    if (card.ordem_producao_id) {
      const r = await E.OrdemProducao.filter({ id: card.ordem_producao_id });
      if (r[0]) return r[0];
    }
    if (pedidoId) {
      const r = await E.OrdemProducao.filter({ pedido_id: pedidoId });
      return r[0] || null;
    }
  }
  if (kanbanDestino === 'separacao') {
    if (card.separacao_id) {
      const r = await E.Separacao.filter({ id: card.separacao_id });
      if (r[0]) return r[0];
    }
    if (kanbanOrigem === 'producao') {
      const r = await E.Separacao.filter({ ordem_producao_id: card.id });
      if (r[0]) return r[0];
    }
    if (pedidoId) {
      const r = await E.Separacao.filter({ pedido_id: pedidoId });
      return r[0] || null;
    }
  }
  if (kanbanDestino === 'pedidos' && pedidoId) {
    const r = await E.Pedido.filter({ id: pedidoId });
    return r[0] || null;
  }
  if (kanbanDestino === 'expedicao' && pedidoId) {
    const r = await E.Expedicao.filter({ pedido_id: pedidoId });
    return r[0] || null;
  }
  return null;
}

/**
 * Executa as regras com gatilho "card movido para a etapa X" de um kanban.
 * Chamar após o card ter sido movido/atualizado com sucesso.
 */
export async function executarRegrasCardMovido(kanban, card, novaEtapa) {
  const regras = (await getRegras()).filter(r =>
    r.ativo !== false &&
    r.kanban === kanban &&
    r.gatilho?.key === 'card_movido_para' &&
    r.gatilho?.params?.etapa === novaEtapa
  );

  for (const regra of regras) {
    for (const acao of (regra.acoes || [])) {
      try {
        if (acao.key === 'mover_card') {
          const kanbanDestino = acao.params?.kanban || kanban;
          const etapaDestino = acao.params?.etapa;
          const entidade = ENTIDADES[kanbanDestino];
          if (!etapaDestino || !entidade) continue;
          const alvo = await resolverAlvo(kanban, card, kanbanDestino);
          if (!alvo || alvo.status === etapaDestino) continue;
          await base44.entities[entidade].update(alvo.id, { status: etapaDestino });
          registrarLog(entidade, alvo.id, 'AUTOMACAO',
            `Regra "${regra.nome}" executada: card ${alvo.numero || alvo.id} movido para "${etapaDestino}" no kanban ${kanbanDestino}`).catch(() => {});
        }
      } catch (e) {
        console.warn('[regrasAutomacao] falha ao executar ação da regra', regra.nome, e);
      }
    }
  }
}