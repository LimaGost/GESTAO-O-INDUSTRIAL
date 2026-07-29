// Subtítulo curto de cada coluna do Kanban — explica em uma linha o que ocorre na etapa.
import { acoesEfetivas } from './movimentoEstoque';

const SUBTITULO_ACAO = {
  registrar_data_inicio: 'Marca o início da produção',
  registrar_data_fim_producao: 'Marca o final da produção',
  registrar_data_embalagem: 'Itens sendo embalados',
  finalizar_producao: 'Vai para a Separação',
  saida_estoque: 'Saída do estoque',
  gerar_etiquetas: 'Gera as etiquetas',
  entrada_estoque: 'Entrada no estoque',
  criar_separacao: 'Cria card na Separação',
  criar_separacao_galpao: 'Cria card na Separação Galpão',
  criar_expedicao: 'Cria card na Expedição',
  criar_producao: 'Cria a Ordem de Produção',
  marcar_pedido_separado: 'Pedido marcado como separado',
  finalizar_expedicao: 'Pronto para expedir',
  finalizar_pedido: 'Pedido finalizado',
  notificar_cliente: 'Notifica o cliente',
};

const SUBTITULO_PADRAO = {
  a_produzir: 'Aguardando início da produção',
  producao_planejada: 'Produção planejada, sem movimentação',
  em_producao: 'Marca o início da produção',
  produzido: 'Marca o final da produção',
  producao_finalizada: 'Marca o final da produção',
  aguardando_finalizacao: 'Aguardando conferência final',
};

/** Retorna um subtítulo curto para a coluna, ou null se não houver o que explicar. */
export function subtituloEtapa(coluna, kanbanKey) {
  if (!coluna) return null;
  const textos = acoesEfetivas(coluna, kanbanKey).map((a) => SUBTITULO_ACAO[a]).filter(Boolean);
  if (textos.length > 0) return textos.join(' · ');
  return SUBTITULO_PADRAO[coluna.key] || 'Sem movimentação de estoque';
}