// Utilidades de status de Ordem de Produção — cobre o fluxo atual e chaves legadas
export const OP_STATUS_FINALIZADA = ['finalizado', 'producao_finalizada'];

export const isOPFinalizada = (o) => OP_STATUS_FINALIZADA.includes(o?.status);

// Data de conclusão da OP, com fallback para o fim da produção
export const dataFinalizacaoOP = (o) => o?.data_finalizacao || o?.data_fim_producao || null;

export const OP_STATUS_LABEL = {
  a_produzir: 'A Produzir',
  producao_planejada: 'Planejada',
  em_producao: 'Em Produção',
  aguardando_finalizacao: 'Ag. Finalização',
  produzido: 'Produzido',
  em_embalagem: 'Embalagem',
  em_separacao: 'Em Separação',
  producao_finalizada: 'Prod. Finalizada',
  finalizado: 'Finalizado',
  cancelado: 'Cancelado',
};