// Configuração centralizada dos fluxos de Kanban (Pedidos, Produção, Separação, Expedição)
// Fonte canônica: AppConfig (banco). Espelha para localStorage para leitura instantânea das páginas.
import { loadConfig, saveConfig } from './appConfig';
import {
  Clock, Factory, CheckCircle, Package, Flag, Layers, Archive, Truck,
  ShoppingCart, ClipboardCheck, BadgeCheck, PackageCheck, Send, MapPin,
  Home, Building2, FileText, ClipboardList, Tag, Boxes, AlertTriangle, CircleDollarSign,
  Store, PackageSearch, SearchCheck, XCircle,
} from 'lucide-react';

export const ICON_MAP = {
  Clock, Factory, CheckCircle, Package, Flag, Layers, Archive, Truck,
  ShoppingCart, ClipboardCheck, BadgeCheck, PackageCheck, Send, MapPin,
  Home, Building2, FileText, ClipboardList, Tag, Boxes, AlertTriangle, CircleDollarSign,
  Store, PackageSearch, SearchCheck, XCircle,
};

export const ICONES = Object.keys(ICON_MAP);

export function getIcon(name) { return ICON_MAP[name] || Clock; }

// Paleta: cada índice tem a cor de destaque + tons claros para coluna/card
export const CORES = [
  { label: 'Cinza',    accent: '#64748B', bg: '#F8FAFC', border: '#CBD5E1', dot: '#94A3B8' },
  { label: 'Azul',     accent: '#0EA5E9', bg: '#F0F9FF', border: '#7DD3FC', dot: '#0EA5E9' },
  { label: 'Verde',    accent: '#22C55E', bg: '#F0FDF4', border: '#86EFAC', dot: '#22C55E' },
  { label: 'Amarelo',  accent: '#F59E0B', bg: '#FFFBEB', border: '#FCD34D', dot: '#F59E0B' },
  { label: 'Roxo',     accent: '#A855F7', bg: '#FAF5FF', border: '#D8B4FE', dot: '#A855F7' },
  { label: 'Vermelho', accent: '#EF4444', bg: '#FEF2F2', border: '#FCA5A5', dot: '#EF4444' },
  { label: 'Laranja',  accent: '#F97316', bg: '#FFF7ED', border: '#FDBA74', dot: '#F97316' },
  { label: 'Teal',     accent: '#14B8A6', bg: '#F0FDFA', border: '#99F6E4', dot: '#14B8A6' },
];

export const ROLES = [
  { key: 'admin', label: 'Administrador' },
  { key: 'gerente_producao', label: 'Gerente de Produção' },
  { key: 'vendedor', label: 'Vendedor' },
  { key: 'maquinista', label: 'Maquinista' },
  { key: 'embalador', label: 'Embalador' },
  { key: 'estoquista', label: 'Estoquista' },
  { key: 'motorista', label: 'Motorista' },
];

export const KANBANS = [
  { key: 'pedidos',   label: 'Pedidos',             icon: 'ShoppingCart', entidade: 'Pedido',       cor: '#0EA5E9' },
  { key: 'producao',  label: 'Kanban Produção',     icon: 'Factory',       entidade: 'OrdemProducao',cor: '#F59E0B' },
  { key: 'separacao', label: 'Separação Industria', icon: 'ClipboardCheck',entidade: 'Separacao',   cor: '#22C55E' },
  { key: 'expedicao', label: 'Expedição',           icon: 'Truck',        entidade: 'Expedicao',    cor: '#A855F7' },
  { key: 'pedidos_franqueados', label: 'Pedidos Franqueados', icon: 'Store',          entidade: 'Microvix',        cor: '#F97316' },
  { key: 'separacao_galpao',    label: 'Separação Galpão',    icon: 'ClipboardCheck', entidade: 'SeparacaoGalpao', cor: '#14B8A6' },
];

// Fluxos operacionais: agrupam os kanbans que compõem cada cadeia
export const FLUXOS = [
  { key: 'industria', label: 'Fluxo Industria de Velas', kanbans: ['pedidos', 'producao', 'separacao', 'expedicao'] },
  { key: 'microvix',  label: 'Fluxo Microvix',           kanbans: ['pedidos_franqueados', 'separacao_galpao', 'expedicao'] },
];

export const DEFAULTS = {
  pedidos: {
    stages: [
      { key: 'pendente',  label: 'Pendente',  cor: 3, icone: 'Clock',        responsaveis: ['vendedor'] },
      { key: 'expedido',  label: 'Expedido',  cor: 6, icone: 'Truck',        responsaveis: ['motorista'] },
      { key: 'entregue',  label: 'Entregue',  cor: 2, icone: 'PackageCheck', responsaveis: ['motorista'] },
      { key: 'cancelado', label: 'Cancelado', cor: 5, icone: 'AlertTriangle',responsaveis: [] },
    ],
    automacoes: [
      { trigger: 'separacao_concluida', acao: 'criar_expedicao', ativo: true },
    ],
  },
  producao: {
    stages: [
      { key: 'a_produzir',   label: 'Aguardando Produção', cor: 0, icone: 'Clock',      responsaveis: ['gerente_producao'], acao: 'nenhuma' },
      { key: 'em_producao',  label: 'Em Produção',         cor: 1, icone: 'Factory',    responsaveis: ['maquinista'],    acao: 'registrar_data_inicio' },
      { key: 'produzido',    label: 'Produzido',           cor: 2, icone: 'CheckCircle',responsaveis: ['maquinista'],    acao: 'registrar_data_fim_producao' },
      { key: 'em_embalagem', label: 'Em Embalagem',        cor: 3, icone: 'Package',    responsaveis: ['embalador'],     acao: 'registrar_data_embalagem' },
      { key: 'em_separacao', label: 'Em Separação',        cor: 7, icone: 'Layers',     responsaveis: ['estoquista'],    acao: 'saida_estoque' },
      { key: 'finalizado',   label: 'Finalizado',          cor: 4, icone: 'Flag',       responsaveis: ['gerente_producao'], acao: 'finalizar_expedicao' },
    ],
    automacoes: [
      { trigger: 'producao_finalizada', acao: 'criar_separacao', ativo: true },
    ],
  },
  separacao: {
    stages: [
      { key: 'aguardando_separacao', label: 'Aguardando Separação', cor: 0, icone: 'Clock',          responsaveis: ['estoquista'] },
      { key: 'em_separacao',         label: 'Em Separação',         cor: 1, icone: 'ClipboardCheck', responsaveis: ['estoquista'] },
      { key: 'separado',             label: 'Separado',             cor: 2, icone: 'CheckCircle',    responsaveis: ['estoquista'] },
      { key: 'em_conferencia',       label: 'Em Conferência',       cor: 3, icone: 'ClipboardList', responsaveis: ['embalador'] },
      { key: 'conferido',            label: 'Conferido',            cor: 7, icone: 'BadgeCheck',     responsaveis: ['embalador'] },
      { key: 'liberado_expedicao',   label: 'Liberado p/ Expedição',cor: 4, icone: 'Send',          responsaveis: ['gerente_producao'] },
    ],
    automacoes: [
      { trigger: 'separacao_liberada', acao: 'marcar_pedido_separado', ativo: true },
    ],
  },
  expedicao: {
    stages: [
      { key: 'a_expedir', label: 'Aguardando Expedição', cor: 0, icone: 'Package',   responsaveis: ['gerente_producao'], fixo: true },
      { key: 'emitida',   label: 'NF Emitida',           cor: 1, icone: 'FileText', responsaveis: ['gerente_producao'], fixo: true },
      { key: 'enviada',   label: 'Em Transporte',       cor: 3, icone: 'Truck',    responsaveis: ['motorista'],       fixo: true },
      { key: 'entregue',  label: 'Entregue',             cor: 2, icone: 'PackageCheck', responsaveis: ['motorista'],   fixo: true },
    ],
    automacoes: [
      { trigger: 'pedido_entregue', acao: 'finalizar_pedido', ativo: true },
    ],
  },
  pedidos_franqueados: {
    stages: [
      { key: 'pendente',     label: 'Pendente',     cor: 3, icone: 'Clock',       responsaveis: ['vendedor'] },
      { key: 'aprovado',     label: 'Aprovado',     cor: 2, icone: 'CheckCircle', responsaveis: ['vendedor'] },
      { key: 'em_expedicao', label: 'Em Expedição', cor: 1, icone: 'Package',     responsaveis: ['estoquista'] },
      { key: 'faturado',     label: 'Faturado',     cor: 4, icone: 'FileText',    responsaveis: [] },
      { key: 'cancelado',    label: 'Cancelado',    cor: 5, icone: 'XCircle',     responsaveis: [] },
    ],
    automacoes: [],
  },
  separacao_galpao: {
    stages: [
      { key: 'aguardando_separacao', label: 'Aguardando Separação',  cor: 0, icone: 'Clock',         responsaveis: ['estoquista'] },
      { key: 'em_separacao',         label: 'Em Separação',          cor: 1, icone: 'PackageSearch', responsaveis: ['estoquista'] },
      { key: 'separado',             label: 'Separado',              cor: 2, icone: 'PackageCheck',  responsaveis: ['estoquista'] },
      { key: 'em_conferencia',       label: 'Em Conferência',        cor: 3, icone: 'SearchCheck',   responsaveis: ['embalador'] },
      { key: 'conferido',            label: 'Conferido',             cor: 4, icone: 'CheckCircle',   responsaveis: ['embalador'] },
      { key: 'liberado_expedicao',   label: 'Liberado p/ Expedição', cor: 7, icone: 'Truck',         responsaveis: ['gerente_producao'] },
    ],
    automacoes: [],
  },
};

export const TRIGGERS = {
  pedidos: [
    { key: 'pedido_criado', label: 'Pedido Criado' },
    { key: 'separacao_concluida', label: 'Separação Concluída' },
    { key: 'pedido_entregue', label: 'Pedido Entregue' },
  ],
  producao: [
    { key: 'producao_iniciada', label: 'Produção Iniciada' },
    { key: 'producao_finalizada', label: 'Produção Finalizada' },
  ],
  separacao: [
    { key: 'separacao_criada', label: 'Separação Criada' },
    { key: 'separacao_liberada', label: 'Separação Liberada' },
    { key: 'separacao_concluida', label: 'Separação Concluída' },
  ],
  expedicao: [
    { key: 'nf_emitida', label: 'NF Emitida' },
    { key: 'pedido_enviado', label: 'Pedido Enviado' },
    { key: 'pedido_entregue', label: 'Pedido Entregue' },
  ],
  pedidos_franqueados: [
    { key: 'pedido_franqueado_recebido', label: 'Pedido Franqueado Recebido' },
    { key: 'enviado_separacao_galpao', label: 'Enviado p/ Separação Galpão' },
  ],
  separacao_galpao: [
    { key: 'separacao_galpao_criada', label: 'Separação Galpão Criada' },
    { key: 'separacao_galpao_liberada', label: 'Separação Galpão Liberada' },
  ],
};

export const ACOES = {
  pedidos: [
    { key: 'criar_producao', label: 'Criar Ordem de Produção' },
    { key: 'criar_separacao', label: 'Criar Separação' },
    { key: 'criar_expedicao', label: 'Criar Expedição' },
    { key: 'finalizar_pedido', label: 'Finalizar Pedido' },
  ],
  producao: [
    { key: 'criar_separacao', label: 'Criar card na Separação Industria' },
    { key: 'entrada_estoque', label: 'Dar entrada no estoque' },
  ],
  separacao: [
    { key: 'marcar_pedido_separado', label: 'Marcar pedido como separado' },
    { key: 'criar_expedicao', label: 'Criar card na Expedição' },
    { key: 'saida_estoque', label: 'Dar saída no estoque' },
  ],
  expedicao: [
    { key: 'finalizar_pedido', label: 'Finalizar pedido' },
    { key: 'notificar_cliente', label: 'Notificar cliente' },
  ],
  pedidos_franqueados: [
    { key: 'criar_separacao_galpao', label: 'Criar card na Separação Galpão' },
  ],
  separacao_galpao: [
    { key: 'criar_expedicao', label: 'Criar card na Expedição' },
  ],
};

// Ações automáticas executadas quando um card ENTRA na etapa
export const ACOES_ETAPA = {
  pedidos: [
    { key: 'nenhuma', label: 'Nenhuma ação' },
  ],
  producao: [
    { key: 'nenhuma', label: 'Nenhuma ação' },
    { key: 'registrar_data_inicio', label: 'Registrar início da produção' },
    { key: 'registrar_data_fim_producao', label: 'Finalizar produção (entrada no estoque)' },
    { key: 'registrar_data_embalagem', label: 'Registrar data de embalagem' },
    { key: 'finalizar_producao', label: 'Finalizar produção + criar Separação' },
    { key: 'saida_estoque', label: 'Saída de estoque + gerar etiquetas' },
    { key: 'finalizar_expedicao', label: 'Finalizar (pedido pronto p/ expedir)' },
  ],
  separacao: [
    { key: 'nenhuma', label: 'Nenhuma ação' },
    { key: 'gerar_etiquetas', label: 'Gerar etiquetas dos itens' },
    { key: 'saida_estoque', label: 'Dar saída no estoque' },
  ],
  expedicao: [
    { key: 'nenhuma', label: 'Nenhuma ação' },
    { key: 'notificar_cliente', label: 'Notificar cliente' },
  ],
  pedidos_franqueados: [
    { key: 'nenhuma', label: 'Nenhuma ação' },
  ],
  separacao_galpao: [
    { key: 'nenhuma', label: 'Nenhuma ação' },
    { key: 'gerar_etiquetas', label: 'Gerar etiquetas dos itens' },
  ],
};

// Consolida todas as ações do sistema: uma entrada por ação, com os kanbans padrão onde existe
export function getAcoesSistema() {
  const map = {};
  for (const k of KANBANS) {
    for (const a of (ACOES_ETAPA[k.key] || [])) {
      if (a.key === 'nenhuma') continue;
      if (!map[a.key]) map[a.key] = { key: a.key, label: a.label, kanbans: [] };
      map[a.key].kanbans.push(k.key);
    }
  }
  return Object.values(map);
}

// Configuração completa de ações (Configurações > Ações):
// acoes = personalizadas · overrides = renomeações do sistema · sistema_kanbans = kanbans habilitados por ação do sistema
export async function loadAcoesConfig() {
  const val = await loadConfig('acoes_etapa_custom');
  return {
    acoes: Array.isArray(val?.acoes) ? val.acoes : [],
    overrides: val?.overrides && typeof val.overrides === 'object' ? val.overrides : {},
    sistema_kanbans: val?.sistema_kanbans && typeof val.sistema_kanbans === 'object' ? val.sistema_kanbans : {},
  };
}

// Compat: retorna apenas as ações personalizadas
export async function loadAcoesCustom() {
  const cfg = await loadAcoesConfig();
  return cfg.acoes;
}

// Ações disponíveis para um kanban: sistema (respeitando kanbans habilitados + renomeações) + personalizadas
export function getAcoesEtapa(kanbanKey, cfg = {}) {
  // Compat: chamadas antigas passavam o array de ações custom diretamente
  const conf = Array.isArray(cfg) ? { acoes: cfg } : cfg;
  const { acoes = [], overrides = {}, sistema_kanbans = {} } = conf;
  const base = getAcoesSistema()
    .filter(a => (sistema_kanbans[a.key] || a.kanbans).includes(kanbanKey))
    .map(a => ({ key: a.key, label: overrides[a.key] || a.label }));
  const custom = acoes
    .filter(a => (a.kanbans || []).includes(kanbanKey) && (a.label || '').trim())
    .map(a => ({ key: a.key, label: a.label }));
  return [{ key: 'nenhuma', label: 'Nenhuma ação' }, ...base, ...custom];
}

// ── Regras de Automação: gatilhos e ações do sistema consolidados + personalizados ──

// Consolida todos os gatilhos do sistema: uma entrada por gatilho, com os kanbans padrão onde existe
export function getTriggersSistema() {
  const map = {};
  for (const k of KANBANS) {
    for (const t of (TRIGGERS[k.key] || [])) {
      if (!map[t.key]) map[t.key] = { key: t.key, label: t.label, kanbans: [] };
      map[t.key].kanbans.push(k.key);
    }
  }
  return Object.values(map);
}

// Consolida todas as ações de automação do sistema
export function getAcoesAutoSistema() {
  const map = {};
  for (const k of KANBANS) {
    for (const a of (ACOES[k.key] || [])) {
      if (!map[a.key]) map[a.key] = { key: a.key, label: a.label, kanbans: [] };
      map[a.key].kanbans.push(k.key);
    }
  }
  return Object.values(map);
}

// Configuração completa de regras de automação (Configurações > Regras de Automação)
export async function loadRegrasConfig() {
  const val = await loadConfig('regras_automacao_custom');
  const obj = (v) => (v && typeof v === 'object' ? v : {});
  return {
    triggers: Array.isArray(val?.triggers) ? val.triggers : [],
    acoes: Array.isArray(val?.acoes) ? val.acoes : [],
    trigger_overrides: obj(val?.trigger_overrides),
    acao_overrides: obj(val?.acao_overrides),
    trigger_kanbans: obj(val?.trigger_kanbans),
    acao_kanbans: obj(val?.acao_kanbans),
  };
}

// Gatilhos disponíveis para um kanban: sistema (kanbans habilitados + renomeações) + personalizados
export function getTriggersKanban(kanbanKey, cfg = {}) {
  const { triggers = [], trigger_overrides = {}, trigger_kanbans = {} } = cfg;
  const base = getTriggersSistema()
    .filter(t => (trigger_kanbans[t.key] || t.kanbans).includes(kanbanKey))
    .map(t => ({ key: t.key, label: trigger_overrides[t.key] || t.label }));
  const custom = triggers
    .filter(t => (t.kanbans || []).includes(kanbanKey) && (t.label || '').trim())
    .map(t => ({ key: t.key, label: t.label }));
  return [...base, ...custom];
}

// Ações de automação disponíveis para um kanban
export function getAcoesAutomacao(kanbanKey, cfg = {}) {
  const { acoes = [], acao_overrides = {}, acao_kanbans = {} } = cfg;
  const base = getAcoesAutoSistema()
    .filter(a => (acao_kanbans[a.key] || a.kanbans).includes(kanbanKey))
    .map(a => ({ key: a.key, label: acao_overrides[a.key] || a.label }));
  const custom = acoes
    .filter(a => (a.kanbans || []).includes(kanbanKey) && (a.label || '').trim())
    .map(a => ({ key: a.key, label: a.label }));
  return [...base, ...custom];
}

const LS_KEYS = {
  pedidos: 'pedidos_colunas_config',
  producao: 'kanban_colunas_config',
  separacao: 'separacao_colunas_config',
  expedicao: 'expedicao_colunas_config',
  pedidos_franqueados: 'franqueados_colunas_config',
  separacao_galpao: 'galpao_colunas_config',
};
const EVENTS = {
  pedidos: 'pedidos:settings:saved',
  producao: 'settings:saved',
  separacao: 'separacao:settings:saved',
  expedicao: 'expedicao:settings:saved',
  pedidos_franqueados: 'franqueados:settings:saved',
  separacao_galpao: 'galpao:settings:saved',
};

// Lê a config de um kanban do banco (com fallback p/ defaults)
export async function loadKanbanFluxo(kanbanKey) {
  const val = await loadConfig(`kanban_fluxo_${kanbanKey}`);
  if (val && Array.isArray(val.stages) && val.stages.length > 0) {
    return { stages: val.stages, automacoes: val.automacoes || [] };
  }
  // Sem config no banco: usa os defaults (ignora localStorage, que pode estar desatualizado)
  return DEFAULTS[kanbanKey];
}

// Salva no banco e espelha p/ localStorage + dispara eventos p/ as páginas atualizarem ao vivo
export async function saveKanbanFluxo(kanbanKey, data) {
  await saveConfig(`kanban_fluxo_${kanbanKey}`, data);
  const ls = LS_KEYS[kanbanKey];
  if (ls) {
    // Para produção/expedição, mantém o formato legado esperado pelas páginas
    if (kanbanKey === 'producao') {
      localStorage.setItem(ls, JSON.stringify(data.stages.map(s => ({ key: s.key, label: s.label, cor: s.cor, icone: s.icone, acao: s.acao || 'nenhuma', acoes: Array.isArray(s.acoes) ? s.acoes : [] }))));
    } else if (kanbanKey === 'expedicao') {
      localStorage.setItem(ls, JSON.stringify(data.stages.map(s => ({ key: s.key, label: s.label, cor: s.cor, desc: '', fixo: !!s.fixo, acao: s.acao || 'nenhuma', acoes: Array.isArray(s.acoes) ? s.acoes : [] }))));
    } else {
      localStorage.setItem(ls, JSON.stringify(data.stages));
    }
  }
  window.dispatchEvent(new CustomEvent(EVENTS[kanbanKey]));
  if (kanbanKey === 'expedicao') window.dispatchEvent(new Event('settings:saved'));
}

// Constrói a estrutura de colunas usada pelas páginas Kanban (com cores + ícone + próximo)
export function buildColunas(stages) {
  return stages.map((s, i) => {
    const cor = CORES[s.cor] || CORES[0];
    const next = stages[i + 1];
    return {
      key: s.key,
      label: s.label,
      accent: cor.accent,
      bg: cor.bg,
      border: cor.border,
      dot: cor.dot,
      icon: getIcon(s.icone),
      proximo: next ? next.key : null,
      proximoLabel: next ? `→ ${next.label}` : null,
      fixo: !!s.fixo,
      acao: s.acao || 'nenhuma',
      acoes: Array.isArray(s.acoes) && s.acoes.length > 0 ? s.acoes : (s.acao && s.acao !== 'nenhuma' ? [s.acao] : []),
    };
  });
}

// Lê stages de um kanban do localStorage (formato salvo) p/ uso síncrono nas páginas
export function readStagesLocal(kanbanKey) {
  const ls = LS_KEYS[kanbanKey];
  if (!ls) return DEFAULTS[kanbanKey].stages;
  try {
    const parsed = JSON.parse(localStorage.getItem(ls) || 'null');
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Normaliza: garante campos cor/icone
      return parsed.map(s => ({
        key: s.key,
        label: s.label,
        cor: typeof s.cor === 'number' ? s.cor : 0,
        icone: s.icone || s.icon || 'Clock',
        responsaveis: s.responsaveis || [],
        fixo: !!s.fixo,
        acao: s.acao || 'nenhuma',
        acoes: Array.isArray(s.acoes) && s.acoes.length > 0 ? s.acoes : (s.acao && s.acao !== 'nenhuma' ? [s.acao] : []),
      }));
    }
  } catch {}
  return DEFAULTS[kanbanKey].stages;
}