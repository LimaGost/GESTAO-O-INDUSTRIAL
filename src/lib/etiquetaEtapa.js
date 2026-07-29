// Identifica se uma etapa do Kanban gera/imprime etiquetas, para sinalização visual.
import { acoesEfetivas } from './movimentoEstoque';

export const ETIQUETA_INFO = {
  gerar: {
    tipo: 'gerar',
    label: 'Gera Etiquetas',
    curto: 'Gera etiqueta',
    descricao: 'Ao mover o card para esta etapa, as etiquetas dos itens são geradas automaticamente e ficam disponíveis em Etiquetas.',
    cor: '#7C3AED',
    bg: '#F5F3FF',
    border: '#DDD6FE',
  },
  imprimir: {
    tipo: 'imprimir',
    label: 'Imprime Etiqueta',
    curto: 'Imprime etiqueta',
    descricao: 'Ao emitir a NF e o card entrar nesta etapa, a etiqueta de endereço é aberta para impressão.',
    cor: '#7C3AED',
    bg: '#F5F3FF',
    border: '#DDD6FE',
  },
};

/** Retorna as informações de etiqueta da etapa, ou null se ela não envolve etiquetas. */
export function etiquetaDaEtapa(coluna, kanbanKey) {
  if (!coluna) return null;
  if (kanbanKey === 'expedicao') {
    return coluna.key === 'emitida' ? ETIQUETA_INFO.imprimir : null;
  }
  const acoes = acoesEfetivas(coluna, kanbanKey);
  if (acoes.includes('gerar_etiquetas')) return ETIQUETA_INFO.gerar;
  if (/etiqueta/i.test(coluna.label || '') || /etiqueta/i.test(coluna.key || '')) return ETIQUETA_INFO.gerar;
  return null;
}