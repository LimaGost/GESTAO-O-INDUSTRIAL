// Passo a passo de cada coluna do Kanban — instrução curta do que o usuário deve fazer na etapa.
import { acoesEfetivas } from './movimentoEstoque';

const INSTRUCAO_ACAO = {
  registrar_data_inicio: 'Inicie a produção das unidades',
  registrar_data_fim_producao: 'Confira a quantidade produzida — as unidades entram no estoque',
  registrar_data_embalagem: 'Embale os itens e confira as quantidades',
  finalizar_producao: 'Finalize a produção — o card segue para a Separação',
  saida_estoque: 'Separe os itens — as unidades saem do estoque',
  gerar_etiquetas: 'Imprima e aplique as etiquetas nos itens',
  entrada_estoque: 'Confira as unidades — elas entram no estoque',
  criar_separacao: 'Ao avançar, o card é criado na Separação',
  criar_separacao_galpao: 'Ao avançar, o card é criado na Separação Galpão',
  criar_expedicao: 'Ao avançar, o card é criado na Expedição',
  criar_producao: 'Ao avançar, a Ordem de Produção é criada',
  marcar_pedido_separado: 'Confira o pedido e marque como separado',
  finalizar_expedicao: 'Confira e libere o pedido para expedição',
  finalizar_pedido: 'Finalize o pedido',
  notificar_cliente: 'Ao avançar, o cliente é notificado',
};

const INSTRUCAO_PADRAO = {
  a_produzir: 'Confira os itens e avance quando iniciar a produção',
  producao_planejada: 'Programe a produção e avance quando começar',
  produzido: 'Confira o resultado e avance para a próxima etapa',
  aguardando_finalizacao: 'Faça a conferência final e avance',
};

/** Instrução curta ("passo a passo") da coluna para o usuário. */
export function subtituloEtapa(coluna, kanbanKey, passo) {
  if (!coluna) return null;
  const textos = acoesEfetivas(coluna, kanbanKey).map((a) => INSTRUCAO_ACAO[a]).filter(Boolean);
  const texto = textos.length > 0
    ? textos.join(' · ')
    : (INSTRUCAO_PADRAO[coluna.key] || 'Confira os itens e avance para a próxima etapa');
  return passo ? `Passo ${passo}: ${texto}` : texto;
}