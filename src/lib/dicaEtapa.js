// Descrições amigáveis das ações automáticas das etapas dos Kanbans.
import { acoesEfetivas } from './movimentoEstoque';

export const ACAO_DESC = {
  registrar_data_inicio: 'Registra a data/hora de início da produção.',
  registrar_data_fim_producao: 'Finaliza a produção e dá ENTRADA das unidades no estoque.',
  registrar_data_embalagem: 'Registra a data/hora da embalagem.',
  finalizar_producao: 'Finaliza a produção e cria o card na Separação.',
  saida_estoque: 'Dá SAÍDA das unidades do estoque.',
  gerar_etiquetas: 'Gera as etiquetas dos itens.',
  finalizar_expedicao: 'Marca o pedido como pronto para expedir.',
  entrada_estoque: 'Dá ENTRADA das unidades no estoque.',
  criar_separacao: 'Cria o card na Separação Industria.',
  criar_separacao_galpao: 'Cria o card na Separação Galpão.',
  criar_expedicao: 'Cria o card na Expedição.',
  criar_producao: 'Cria a Ordem de Produção.',
  marcar_pedido_separado: 'Marca o pedido como separado.',
  finalizar_pedido: 'Finaliza o pedido.',
  notificar_cliente: 'Envia notificação ao cliente.',
};

/** Monta a dica contextual de uma etapa: o que acontece ao mover um card para ela. */
export function dicaEtapa(coluna, kanbanKey, proximoLabel) {
  const acoes = acoesEfetivas(coluna, kanbanKey)
    .map((a) => ACAO_DESC[a])
    .filter(Boolean);
  return {
    titulo: coluna?.label || '',
    acoes,
    proximo: proximoLabel || null,
  };
}