// Identifica se uma etapa do Kanban movimenta o estoque (entrada ou saída).
// Fonte: as ações configuradas na etapa (Configurações > Gestão de Fluxos).

const ACOES_ENTRADA = ['registrar_data_fim_producao', 'finalizar_producao', 'entrada_estoque'];
const ACOES_SAIDA = ['saida_estoque'];

export const MOVIMENTO_INFO = {
  entrada: {
    tipo: 'entrada',
    label: 'Entrada no Estoque',
    curto: 'Entra no estoque',
    descricao: 'Ao mover o card para esta etapa, as unidades produzidas dão ENTRADA automática no estoque.',
    cor: '#16A34A',
    bg: '#F0FDF4',
    border: '#BBF7D0',
  },
  saida: {
    tipo: 'saida',
    label: 'Saída do Estoque',
    curto: 'Sai do estoque',
    descricao: 'Ao mover o card para esta etapa, as unidades são BAIXADAS (saída) do estoque automaticamente.',
    cor: '#EA580C',
    bg: '#FFF7ED',
    border: '#FED7AA',
  },
};

/** Ações efetivas de uma coluna (respeita o fallback legado por status do fluxo de Separação). */
export function acoesEfetivas(coluna, kanbanKey) {
  const acoes = Array.isArray(coluna?.acoes) && coluna.acoes.length > 0
    ? coluna.acoes
    : (coluna?.acao && coluna.acao !== 'nenhuma' ? [coluna.acao] : []);
  if (acoes.length > 0) return acoes;
  if (kanbanKey === 'separacao') {
    if (coluna?.key === 'separado') return ['gerar_etiquetas'];
    if (coluna?.key === 'liberado_expedicao') return ['saida_estoque'];
  }
  return [];
}

/** Retorna as informações de movimentação da etapa, ou null se ela não movimenta estoque. */
export function movimentoDaEtapa(coluna, kanbanKey) {
  const acoes = acoesEfetivas(coluna, kanbanKey);
  if (acoes.some(a => ACOES_ENTRADA.includes(a))) return MOVIMENTO_INFO.entrada;
  if (acoes.some(a => ACOES_SAIDA.includes(a))) return MOVIMENTO_INFO.saida;
  return null;
}