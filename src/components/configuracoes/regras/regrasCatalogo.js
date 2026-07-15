// Catálogo de gatilhos e ações do Construtor de Regras (estilo Trello), em português.
// partes: strings fixas, { chip: '...' } (destaque) ou { param, tipo, ... } (campo editável)
import {
  ArrowRight, SlidersHorizontal, Clock, CheckSquare, MessageSquare,
  Bell, Package, Webhook,
} from 'lucide-react';

export const CATEGORIAS_GATILHO = [
  { key: 'movimentacao', label: 'Movimentação', Icon: ArrowRight },
  { key: 'alteracoes',   label: 'Alterações',   Icon: SlidersHorizontal },
  { key: 'datas',        label: 'Datas',        Icon: Clock },
  { key: 'checklists',   label: 'Checklists',   Icon: CheckSquare },
  { key: 'conteudo',     label: 'Conteúdo',     Icon: MessageSquare },
];

export const GATILHOS = [
  {
    key: 'card_criado', categoria: 'movimentacao',
    partes: ['quando um card for', { chip: 'criado' }, 'no kanban'],
    descricao: '"Criado" significa adicionado manualmente, via pedido, portal ou integração.',
  },
  {
    key: 'card_movido_para', categoria: 'movimentacao',
    partes: ['quando um card for', { chip: 'movido para' }, 'a etapa', { param: 'etapa', tipo: 'etapa', placeholder: 'Etapa' }],
    descricao: '"Movido" inclui avanço manual ou automático entre etapas.',
  },
  {
    key: 'card_sair_de', categoria: 'movimentacao',
    partes: ['quando um card', { chip: 'sair' }, 'da etapa', { param: 'etapa', tipo: 'etapa', placeholder: 'Etapa' }],
  },
  {
    key: 'card_cancelado', categoria: 'alteracoes',
    partes: ['quando um card for', { chip: 'cancelado' }],
  },
  {
    key: 'prioridade_definida', categoria: 'alteracoes',
    partes: ['quando a prioridade do card for definida como', { param: 'prioridade', tipo: 'opcoes', opcoes: [{ v: 'alta', l: 'Alta' }, { v: 'normal', l: 'Normal' }, { v: 'baixa', l: 'Baixa' }], default: 'alta' }],
  },
  {
    key: 'origem_criado', categoria: 'alteracoes',
    partes: ['quando um card com origem', { param: 'origem', tipo: 'opcoes', opcoes: [{ v: 'bling', l: 'Bling' }, { v: 'portal', l: 'Portal' }, { v: 'manual', l: 'Manual' }, { v: 'pedido', l: 'Pedido' }], default: 'bling' }, 'for criado'],
  },
  {
    key: 'data_prevista_proxima', categoria: 'datas',
    partes: ['quando a data prevista de entrega estiver a', { param: 'dias', tipo: 'numero', default: 1 }, 'dia(s) de vencer'],
  },
  {
    key: 'card_parado', categoria: 'datas',
    partes: ['quando um card ficar parado na etapa', { param: 'etapa', tipo: 'etapa', placeholder: 'Etapa' }, 'por mais de', { param: 'horas', tipo: 'numero', default: 24 }, 'hora(s)'],
  },
  {
    key: 'checklist_concluido', categoria: 'checklists',
    partes: ['quando o checklist da etapa', { param: 'etapa', tipo: 'etapa', placeholder: 'Etapa' }, 'for', { chip: 'concluído' }],
  },
  {
    key: 'obs_contem', categoria: 'conteudo',
    partes: ['quando as observações do card contiverem o texto', { param: 'texto', tipo: 'texto', placeholder: 'Texto' }],
  },
  {
    key: 'cliente_igual', categoria: 'conteudo',
    partes: ['quando o cliente do card for', { param: 'cliente', tipo: 'texto', placeholder: 'Nome do cliente' }],
  },
];

export const CATEGORIAS_ACAO = [
  { key: 'movimentacao', label: 'Movimentação',        Icon: ArrowRight },
  { key: 'notificacoes', label: 'Notificações',        Icon: Bell },
  { key: 'estoque',      label: 'Estoque e Etiquetas', Icon: Package },
  { key: 'integracoes',  label: 'Integrações',         Icon: Webhook },
];

export const ACOES = [
  {
    key: 'mover_card', categoria: 'movimentacao',
    partes: [{ chip: 'mover' }, 'o card para a etapa', { param: 'etapa', tipo: 'etapa', placeholder: 'Etapa' }],
  },
  {
    key: 'cancelar_card', categoria: 'movimentacao',
    partes: [{ chip: 'cancelar' }, 'o card'],
  },
  {
    key: 'whatsapp_cliente', categoria: 'notificacoes',
    partes: ['enviar', { chip: 'WhatsApp' }, 'para o cliente com a mensagem', { param: 'mensagem', tipo: 'texto', placeholder: 'Mensagem' }],
    descricao: 'Variáveis disponíveis: {{cliente}}, {{numero}}, {{etapa}}',
  },
  {
    key: 'whatsapp_interno', categoria: 'notificacoes',
    partes: ['enviar', { chip: 'WhatsApp' }, 'para os números internos com a mensagem', { param: 'mensagem', tipo: 'texto', placeholder: 'Mensagem' }],
    descricao: 'Usa os números internos configurados na aba WhatsApp. Variáveis: {{cliente}}, {{numero}}, {{etapa}}',
  },
  {
    key: 'notificacao_interna', categoria: 'notificacoes',
    partes: ['criar uma', { chip: 'notificação interna' }, 'com o texto', { param: 'texto', tipo: 'texto', placeholder: 'Texto da notificação' }],
  },
  {
    key: 'gerar_etiquetas', categoria: 'estoque',
    partes: [{ chip: 'gerar etiquetas' }, 'dos itens do card'],
  },
  {
    key: 'entrada_estoque', categoria: 'estoque',
    partes: ['dar', { chip: 'entrada' }, 'no estoque dos itens do card'],
  },
  {
    key: 'saida_estoque', categoria: 'estoque',
    partes: ['dar', { chip: 'saída' }, 'no estoque dos itens do card'],
  },
  {
    key: 'post_url', categoria: 'integracoes',
    partes: ['enviar', { chip: 'POST' }, 'para a URL', { param: 'url', tipo: 'texto', placeholder: 'https://...' }, 'com o payload', { param: 'payload', tipo: 'texto', placeholder: '{"telefone": "{{whatsapp}}"}' }],
    descricao: 'Variáveis no payload: {{cliente}}, {{numero}}, {{etapa}}, {{whatsapp}}',
  },
];

export const gatilhoByKey = (k) => GATILHOS.find(g => g.key === k);
export const acaoByKey = (k) => ACOES.find(a => a.key === k);

// Monta a frase completa de um template com os parâmetros preenchidos
export function montarFrase(template, params = {}, etapas = []) {
  if (!template) return '';
  return template.partes.map(p => {
    if (typeof p === 'string') return p;
    if (p.chip) return p.chip;
    const v = params?.[p.param] ?? p.default;
    if (p.tipo === 'etapa') return `"${(etapas.find(e => e.key === v) || {}).label || v || '—'}"`;
    if (p.tipo === 'opcoes') return `"${((p.opcoes || []).find(o => o.v === v) || {}).l || v || '—'}"`;
    return `"${v ?? '—'}"`;
  }).join(' ');
}