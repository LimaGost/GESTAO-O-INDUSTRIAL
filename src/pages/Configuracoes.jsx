import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Plus, Trash2, Save, CheckSquare, ChevronDown,
  Settings2, GripVertical, Shield, Search,
  RefreshCw, User, LogOut, Tag, Activity, AlertTriangle, Users, Factory, Paintbrush, Printer, Database, Columns, MessageCircle, Truck, Link2, Zap
} from 'lucide-react';
import SupabaseSchemas from '@/pages/SupabaseSchemas';
import AbaUsuarios from '@/components/configuracoes/AbaUsuarios';
import AbaPersonalizacao from '@/components/configuracoes/AbaPersonalizacao.jsx';
import AbaEtiquetas from '@/components/configuracoes/AbaEtiquetas.jsx';
import AbaGestaoFluxos from '@/components/configuracoes/AbaGestaoFluxos.jsx';
import AbaAcoes from '@/components/configuracoes/AbaAcoes.jsx';
import AbaRegrasAutomacao from '@/components/configuracoes/AbaRegrasAutomacao.jsx';
import AbaWhatsapp from '@/components/configuracoes/AbaWhatsapp.jsx';
import AbaBling from '@/components/configuracoes/AbaBling';
import AbaMural from '@/components/configuracoes/AbaMural.jsx';
import { Megaphone } from 'lucide-react';
import { usePermissoes } from '@/lib/usePermissoes.jsx';

const BADGE_CORES = [
  'bg-slate-100 text-slate-600', 'bg-sky-blue/10 text-sky-blue',
  'bg-rainbow-green/10 text-rainbow-green', 'bg-sun-yellow/10 text-sun-yellow',
  'bg-rainbow-purple/10 text-rainbow-purple', 'bg-rainbow-orange/10 text-rainbow-orange',
  'bg-rainbow-indigo/10 text-rainbow-indigo', 'bg-muted text-muted-foreground',
];

const KANBAN_ETAPAS_DEFAULT = [
  { key: 'a_produzir', label: 'A Produzir' }, { key: 'em_producao', label: 'Em Produção' },
  { key: 'produzido', label: 'Produzido' }, { key: 'em_embalagem', label: 'Em Embalagem' },
  { key: 'em_separacao', label: 'Em Separação' }, { key: 'finalizado', label: 'Finalizado' },
];

function buildEtapas() {
  try {
    const saved = JSON.parse(localStorage.getItem('kanban_colunas_config') || 'null');
    if (saved && Array.isArray(saved) && saved.length > 0) {
      return saved.map((c, i) => ({ key: c.key, label: c.label, badge: BADGE_CORES[i % BADGE_CORES.length] }));
    }
  } catch {}
  return KANBAN_ETAPAS_DEFAULT.map((c, i) => ({ key: c.key, label: c.label, badge: BADGE_CORES[i % BADGE_CORES.length] }));
}

const ENTIDADES = ['Todas', 'Pedido', 'OrdemProducao', 'Produto', 'Estoque', 'Expedicao', 'Cliente', 'Etiqueta'];

const ACOES_LABEL = {
  CRIACAO: 'Criação', CRIACAO_MANUAL: 'Criação Manual', CRIACAO_REPOSICAO: 'Criação Reposição',
  STATUS: 'Mudança de Status', AVANCO_STATUS: 'Avanço de Status',
  ENTRADA_ESTOQUE: 'Entrada Estoque', SAIDA_ESTOQUE: 'Saída Estoque', AJUSTE_ESTOQUE: 'Ajuste de Estoque',
  EMBALAGEM_INICIO: 'Início Embalagem', EMBALAGEM_CONCLUIDA: 'Embalagem Concluída',
  EXPEDICAO_CRIADA: 'Expedição Criada', EXPEDICAO_STATUS: 'Status Expedição',
  CANCELAMENTO: 'Cancelamento',
};

const ACAO_COR = {
  CRIACAO: 'bg-rainbow-green/10 text-rainbow-green', CRIACAO_MANUAL: 'bg-rainbow-green/10 text-rainbow-green',
  CRIACAO_REPOSICAO: 'bg-rainbow-green/10 text-rainbow-green', STATUS: 'bg-sky-blue/10 text-sky-blue',
  AVANCO_STATUS: 'bg-sky-blue/10 text-sky-blue', ENTRADA_ESTOQUE: 'bg-rainbow-green/10 text-rainbow-green',
  SAIDA_ESTOQUE: 'bg-rainbow-red/10 text-rainbow-red', AJUSTE_ESTOQUE: 'bg-rainbow-orange/10 text-rainbow-orange',
  EMBALAGEM_INICIO: 'bg-sun-yellow/10 text-sun-yellow', EMBALAGEM_CONCLUIDA: 'bg-sun-yellow/10 text-sun-yellow',
  EXPEDICAO_CRIADA: 'bg-rainbow-purple/10 text-rainbow-purple', EXPEDICAO_STATUS: 'bg-rainbow-purple/10 text-rainbow-purple',
  CANCELAMENTO: 'bg-rainbow-red/10 text-rainbow-red',
};

const ENTIDADE_COR = {
  Pedido: 'bg-sky-blue/10 text-sky-blue', OrdemProducao: 'bg-sun-yellow/10 text-sun-yellow',
  Produto: 'bg-rainbow-green/10 text-rainbow-green', Expedicao: 'bg-rainbow-purple/10 text-rainbow-purple',
  Cliente: 'bg-rainbow-orange/10 text-rainbow-orange', Etiqueta: 'bg-muted text-muted-foreground',
};

// ── Sub-componentes ──────────────────────────────────────────────────────────

function SubItem({ icon: Icon, iconBg, iconColor, title, badge, badgeClass, open, onToggle, children }) {
  return (
    <div className={`rounded-xl border overflow-hidden transition-all duration-150 ${open ? 'border-border shadow-sm' : 'border-border/60'}`}>
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors ${open ? 'bg-muted/50' : 'bg-card hover:bg-muted/20'}`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${iconBg}`}>
            <Icon size={14} className={iconColor} />
          </div>
          <span className="font-semibold text-sm text-foreground">{title}</span>
          {badge !== undefined && (
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${badgeClass || 'bg-muted text-muted-foreground'}`}>
              {badge} {badge === 1 ? 'item' : 'itens'}
            </span>
          )}
        </div>
        <ChevronDown size={14} className={`text-muted-foreground transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 pt-3 border-t border-border/60 bg-card space-y-3">
          {children}
        </div>
      )}
    </div>
  );
}

function ChecklistEditor({ itens, onAdd, onRemove, onSave, saving, inputValue, onInputChange, placeholder }) {
  return (
    <>
      {itens.length > 0 ? (
        <div className="space-y-1.5">
          {itens.map((item, idx) => (
            <div key={idx} className="flex items-center gap-3 bg-muted/50 rounded-lg px-3.5 py-2.5 group">
              <GripVertical size={13} className="text-muted-foreground/40 flex-shrink-0" />
              <div className="w-3.5 h-3.5 rounded border-2 border-muted-foreground/30 flex-shrink-0" />
              <span className="flex-1 text-sm text-foreground">{item}</span>
              <button onClick={() => onRemove(idx)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded-md transition-all">
                <Trash2 size={12} className="text-destructive" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center py-5 text-muted-foreground/50 bg-muted/30 rounded-xl">
          <CheckSquare size={22} className="mb-1.5 opacity-40" />
          <p className="text-xs">Nenhuma verificação. Adicione abaixo.</p>
        </div>
      )}
      <div className="flex gap-2">
        <input
          value={inputValue}
          onChange={e => onInputChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onAdd()}
          placeholder={placeholder}
          className="flex-1 border border-border rounded-xl px-3.5 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground/50"
        />
        <button onClick={onAdd} className="px-3.5 py-2 bg-muted hover:bg-muted/70 border border-border rounded-xl text-muted-foreground hover:text-foreground transition-colors">
          <Plus size={16} />
        </button>
      </div>
      <button onClick={onSave} disabled={saving}
        className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-50">
        <Save size={14} /> {saving ? 'Salvando...' : 'Salvar alterações'}
      </button>
    </>
  );
}

// ── Aba: Checklists ──────────────────────────────────────────────────────────

function AbaChecklists() {
  const [configs, setConfigs]   = useState({});
  const [saving, setSaving]     = useState(null);
  const [newItem, setNewItem]   = useState({});
  const [openEtapa, setOpenEtapa] = useState(null);
  const [etapas, setEtapas]     = useState(buildEtapas);

  useEffect(() => {
    const onSettings = () => setEtapas(buildEtapas());
    window.addEventListener('settings:saved', onSettings);
    return () => window.removeEventListener('settings:saved', onSettings);
  }, []);

  useEffect(() => {
    base44.entities.ChecklistConfig.list().then(data => {
      const map = {};
      for (const d of data) map[d.etapa] = d;
      setConfigs(map);
    });
  }, []);

  const addItem = (etapa) => {
    const texto = (newItem[etapa] || '').trim();
    if (!texto) return;
    const config = configs[etapa] || { etapa, itens: [] };
    setConfigs(prev => ({ ...prev, [etapa]: { ...config, itens: [...(config.itens || []), texto] } }));
    setNewItem(prev => ({ ...prev, [etapa]: '' }));
  };

  const removeItem = (etapa, idx) => {
    const config = configs[etapa];
    if (!config) return;
    setConfigs(prev => ({ ...prev, [etapa]: { ...config, itens: config.itens.filter((_, i) => i !== idx) } }));
  };

  const save = async (etapa) => {
    setSaving(etapa);
    const config = configs[etapa] || { etapa, itens: [] };
    if (config.id) {
      await base44.entities.ChecklistConfig.update(config.id, { etapa, itens: config.itens });
    } else {
      const created = await base44.entities.ChecklistConfig.create({ etapa, itens: config.itens });
      setConfigs(prev => ({ ...prev, [etapa]: created }));
    }
    setSaving(null);
  };

  const totalItens = etapas.reduce((s, e) => s + (configs[e.key]?.itens?.length || 0), 0);

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center gap-4 px-6 py-5 border-b border-border">
        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
          <CheckSquare size={20} className="text-primary" />
        </div>
        <div>
          <p className="font-bold text-base text-foreground">Checklist por Etapa do Kanban</p>
          <p className="text-xs text-muted-foreground">
            {totalItens} verificaç{totalItens === 1 ? 'ão' : 'ões'} configurada{totalItens === 1 ? '' : 's'} em {etapas.length} etapas
          </p>
        </div>
      </div>
      <div className="px-6 py-5 space-y-3">
        {etapas.map(({ key, label, badge }) => {
          const itens = configs[key]?.itens || [];
          const isOpen = openEtapa === key;
          return (
            <SubItem key={key} icon={CheckSquare} iconBg="bg-primary/10" iconColor="text-primary"
              title={label} badge={itens.length} badgeClass={badge}
              open={isOpen} onToggle={() => setOpenEtapa(isOpen ? null : key)}>
              <ChecklistEditor
                itens={itens}
                onAdd={() => addItem(key)}
                onRemove={(idx) => removeItem(key, idx)}
                onSave={() => save(key)}
                saving={saving === key}
                inputValue={newItem[key] || ''}
                onInputChange={(v) => setNewItem(prev => ({ ...prev, [key]: v }))}
                placeholder={`Nova verificação para "${label}"...`}
              />
            </SubItem>
          );
        })}
      </div>
    </div>
  );
}

// ── Aba: Auditoria ───────────────────────────────────────────────────────────

const ROLE_LABELS = {
  admin: 'Administrador', gerente_producao: 'Gerente de Produção',
  vendedor: 'Vendedor', maquinista: 'Maquinista', embalador: 'Embalador',
  estoquista: 'Estoquista', motorista: 'Motorista',
  estoquista_industria: 'Estoquista Industria', estoquista_galpao: 'Estoquista Galpão',
  vendedor_industria: 'Vendedor Industria', vendedor_loja: 'Vendedor Loja',
  conferente_industria: 'Conferente Industria', conferente_galpao: 'Conferente Galpão',
};

const ROLE_COLORS = {
  admin: 'bg-rainbow-red/10 text-rainbow-red border-rainbow-red/30',
  gerente_producao: 'bg-rainbow-purple/10 text-rainbow-purple border-rainbow-purple/30',
  vendedor: 'bg-sky-blue/10 text-sky-blue border-sky-blue/30',
  maquinista: 'bg-rainbow-orange/10 text-rainbow-orange border-rainbow-orange/30',
  embalador: 'bg-sun-yellow/10 text-sun-yellow border-sun-yellow/30',
  estoquista: 'bg-rainbow-green/10 text-rainbow-green border-rainbow-green/30',
  motorista: 'bg-muted text-muted-foreground border-border',
  estoquista_industria: 'bg-rainbow-green/10 text-rainbow-green border-rainbow-green/30',
  estoquista_galpao: 'bg-rainbow-green/10 text-rainbow-green border-rainbow-green/30',
  vendedor_industria: 'bg-sky-blue/10 text-sky-blue border-sky-blue/30',
  vendedor_loja: 'bg-rainbow-indigo/10 text-rainbow-indigo border-rainbow-indigo/30',
  conferente_industria: 'bg-teal-dark/10 text-teal-dark border-teal-dark/30',
  conferente_galpao: 'bg-rainbow-purple/10 text-rainbow-purple border-rainbow-purple/30',
};

const NIVEL_LABEL = { none: 'Sem acesso', view: 'Visualização', full: 'Completo' };

function UserBadge({ email, userMap, permissaoMap, expandido, onToggle }) {
  const u = userMap[email];
  const role = u?.role;
  const roleCor = ROLE_COLORS[role] || 'bg-muted text-muted-foreground border-border';
  const roleLabel = ROLE_LABELS[role] || role || 'Sem perfil';
  const permissao = permissaoMap[role];
  const modulos = permissao?.modulos_niveis || {};
  const modulosComAcesso = Object.entries(modulos).filter(([, v]) => v !== 'none');

  return (
    <div className="inline-flex flex-col gap-1">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <User size={10} /> {email}
        </span>
        {role && (
          <button
            onClick={onToggle}
            className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold transition-all ${roleCor} ${expandido ? 'ring-1 ring-current/30' : ''}`}
          >
            {roleLabel}
          </button>
        )}
      </div>
      {expandido && (
        <div className="mt-1 bg-muted/60 border border-border rounded-xl px-3 py-2 text-[11px] space-y-1 max-w-xs">
          <p className="font-bold text-foreground mb-1.5">{roleLabel} — Permissões</p>
          {role === 'admin' ? (
            <p className="text-rainbow-green font-medium">✓ Acesso completo a todos os módulos</p>
          ) : modulosComAcesso.length === 0 ? (
            <p className="text-muted-foreground">Sem permissões configuradas</p>
          ) : (
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
              {modulosComAcesso.map(([mod, nivel]) => (
                <div key={mod} className="flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${nivel === 'full' ? 'bg-rainbow-green' : 'bg-sky-blue'}`} />
                  <span className="text-muted-foreground truncate">{mod}</span>
                  <span className={`text-[10px] font-medium ${nivel === 'full' ? 'text-rainbow-green' : 'text-sky-blue'}`}>{NIVEL_LABEL[nivel]}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AbaAuditoria() {
  const [logs, setLogs]                     = useState([]);
  const [loading, setLoading]               = useState(true);
  const [busca, setBusca]                   = useState('');
  const [filtroEntidade, setFiltroEntidade] = useState('Todas');
  const [filtroAcao, setFiltroAcao]         = useState('');
  const [filtroUsuario, setFiltroUsuario]   = useState('');
  const [filtroRole, setFiltroRole]         = useState('');
  const [dataInicio, setDataInicio]         = useState('');
  const [dataFim, setDataFim]               = useState('');
  const [expandido, setExpandido]           = useState({});
  const [userExpandido, setUserExpandido]   = useState({});
  const [userMap, setUserMap]               = useState({});
  const [permissaoMap, setPermissaoMap]     = useState({});

  const load = async () => {
    setLoading(true);
    const [data, users, permissoes] = await Promise.all([
      base44.entities.LogAuditoria.list('-created_date', 200),
      base44.entities.User.list(),
      base44.entities.PermissaoRole.list(),
    ]);
    setLogs(data);
    const um = {};
    for (const u of users) um[u.email] = u;
    setUserMap(um);
    const pm = {};
    for (const p of permissoes) pm[p.role] = p;
    setPermissaoMap(pm);
    setLoading(false);
  };

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (!mounted) { setMounted(true); load(); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const usuarios = [...new Set(logs.map(l => l.usuario).filter(Boolean))];
  const acoes    = [...new Set(logs.map(l => l.acao).filter(Boolean))];

  const logsFiltrados = logs.filter(l => {
    const matchEntidade = filtroEntidade === 'Todas' || l.entidade === filtroEntidade;
    const matchAcao     = !filtroAcao    || l.acao === filtroAcao;
    const matchUsuario  = !filtroUsuario || l.usuario === filtroUsuario;
    const matchRole     = !filtroRole    || userMap[l.usuario]?.role === filtroRole;
    const matchBusca    = !busca || (l.descricao || '').toLowerCase().includes(busca.toLowerCase()) || (l.entidade_id || '').toLowerCase().includes(busca.toLowerCase());
    const dataLog       = l.created_date ? new Date(l.created_date) : null;
    const matchInicio   = !dataInicio || (dataLog && dataLog >= new Date(dataInicio + 'T00:00:00'));
    const matchFim      = !dataFim    || (dataLog && dataLog <= new Date(dataFim + 'T23:59:59'));
    return matchEntidade && matchAcao && matchUsuario && matchRole && matchBusca && matchInicio && matchFim;
  });

  const toggleExpandido = (id) => setExpandido(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{logsFiltrados.length} registro(s) encontrado(s)</p>
        <button onClick={load} className="p-2 border border-border rounded-xl hover:bg-muted transition-colors" title="Atualizar">
          <RefreshCw size={14} className={`text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2.5">
          <Search size={14} className="text-muted-foreground flex-shrink-0" />
          <input value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por descrição ou ID..."
            className="bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground w-full" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1 block">
              <Activity size={11} /> Data início
            </label>
            <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
              className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1 block">
              <Activity size={11} /> Data fim
            </label>
            <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
              className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1 block"><Tag size={11} /> Entidade</label>
            <select value={filtroEntidade} onChange={e => setFiltroEntidade(e.target.value)}
              className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
              {ENTIDADES.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1 block"><Activity size={11} /> Ação</label>
            <select value={filtroAcao} onChange={e => setFiltroAcao(e.target.value)}
              className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="">Todas as ações</option>
              {acoes.map(a => <option key={a} value={a}>{ACOES_LABEL[a] || a}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1 block"><User size={11} /> Usuário</label>
            <select value={filtroUsuario} onChange={e => setFiltroUsuario(e.target.value)}
              className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="">Todos</option>
              {usuarios.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1 block"><Shield size={11} /> Perfil</label>
            <select value={filtroRole} onChange={e => setFiltroRole(e.target.value)}
              className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="">Todos os perfis</option>
              {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>

        {(dataInicio || dataFim || filtroEntidade !== 'Todas' || filtroAcao || filtroUsuario || filtroRole || busca) && (
          <button
            onClick={() => { setBusca(''); setFiltroEntidade('Todas'); setFiltroAcao(''); setFiltroUsuario(''); setFiltroRole(''); setDataInicio(''); setDataFim(''); }}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            ✕ Limpar filtros
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded-2xl" />)}
        </div>
      ) : logsFiltrados.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Shield size={48} className="mx-auto mb-4 opacity-20" />
          <p className="text-sm">Nenhum registro encontrado.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logsFiltrados.map(log => {
            const aberto = expandido[log.id];
            const temDetalhes = log.dados_anteriores || log.dados_novos;
            return (
              <div key={log.id} className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-sm transition-all">
                <div className="px-4 py-3 flex items-start gap-3">
                  <div className="flex-shrink-0 text-center min-w-[60px]">
                    {log.created_date ? (
                      <>
                        <p className="text-xs font-mono text-muted-foreground leading-tight">
                          {new Date(log.created_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                        </p>
                        <p className="text-xs font-mono font-semibold text-foreground leading-tight">
                          {new Date(log.created_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </p>
                      </>
                    ) : <p className="text-xs text-muted-foreground">—</p>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ENTIDADE_COR[log.entidade] || 'bg-muted text-muted-foreground'}`}>
                        {log.entidade}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ACAO_COR[log.acao] || 'bg-muted text-muted-foreground'}`}>
                        {ACOES_LABEL[log.acao] || log.acao}
                      </span>
                      {log.usuario && (
                        <UserBadge
                          email={log.usuario}
                          userMap={userMap}
                          permissaoMap={permissaoMap}
                          expandido={!!userExpandido[log.id]}
                          onToggle={() => setUserExpandido(prev => ({ ...prev, [log.id]: !prev[log.id] }))}
                        />
                      )}
                    </div>
                    <p className="text-sm text-foreground leading-snug">{log.descricao}</p>
                    {log.entidade_id && <p className="text-xs text-muted-foreground font-mono mt-0.5">ID: {log.entidade_id}</p>}
                  </div>
                  {temDetalhes && (
                    <button onClick={() => toggleExpandido(log.id)}
                      className="flex-shrink-0 p-1.5 hover:bg-muted rounded-lg text-muted-foreground transition-colors">
                      <ChevronDown size={14} className={`transition-transform ${aberto ? 'rotate-180' : ''}`} />
                    </button>
                  )}
                </div>
                {aberto && temDetalhes && (
                  <div className="border-t border-border px-4 py-3 bg-muted/30 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {log.dados_anteriores && (
                      <div>
                        <p className="text-xs font-semibold text-rainbow-red mb-1">Antes:</p>
                        <pre className="text-xs text-muted-foreground bg-card rounded-lg p-2 overflow-x-auto whitespace-pre-wrap">
                          {(() => { try { return JSON.stringify(JSON.parse(log.dados_anteriores), null, 2); } catch { return log.dados_anteriores; } })()}
                        </pre>
                      </div>
                    )}
                    {log.dados_novos && (
                      <div>
                        <p className="text-xs font-semibold text-rainbow-green mb-1">Depois:</p>
                        <pre className="text-xs text-muted-foreground bg-card rounded-lg p-2 overflow-x-auto whitespace-pre-wrap">
                          {(() => { try { return JSON.stringify(JSON.parse(log.dados_novos), null, 2); } catch { return log.dados_novos; } })()}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Aba: Produção ────────────────────────────────────────────────────────────

function AbaProducao() {
  const [capacidade, setCapacidade] = useState(1000);
  const [input, setInput] = useState('1000');
  const [saved, setSaved] = useState(false);
  const [loadingCfg, setLoadingCfg] = useState(true);

  useEffect(() => {
    import('@/lib/appConfig').then(({ loadConfig }) => {
      loadConfig('producao_capacidade').then(val => {
        if (val && val.capacidade) {
          setCapacidade(val.capacidade);
          setInput(String(val.capacidade));
        } else {
          // Tenta migrar do localStorage
          const local = parseInt(localStorage.getItem('producao_capacidade_semanal') || '0', 10);
          if (local > 0) {
            setCapacidade(local);
            setInput(String(local));
            import('@/lib/appConfig').then(({ saveConfig }) => {
              saveConfig('producao_capacidade', { capacidade: local }).then(() => {
                localStorage.removeItem('producao_capacidade_semanal');
              });
            });
          }
        }
        setLoadingCfg(false);
      });
    });
  }, []);

  const salvar = async () => {
    const val = parseInt(input, 10);
    if (!val || val <= 0) return;
    const { saveConfig } = await import('@/lib/appConfig');
    await saveConfig('producao_capacidade', { capacidade: val });
    localStorage.setItem('producao_capacidade_semanal', String(val));
    window.dispatchEvent(new Event('settings:saved'));
    setCapacidade(val);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loadingCfg) return <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">Carregando configurações...</div>;

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rainbow-orange/10 flex items-center justify-center">
            <Factory size={18} className="text-rainbow-orange" />
          </div>
          <div>
            <p className="font-bold text-sm text-foreground">Capacidade de Produção Semanal</p>
            <p className="text-xs text-muted-foreground">Define o limite usado no botão "Total" do Kanban para calcular semanas necessárias.</p>
          </div>
        </div>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Unidades por semana</label>
            <input
              type="number"
              min="1"
              value={input}
              onChange={e => setInput(e.target.value)}
              className="w-full border border-border rounded-xl px-4 py-3 text-lg font-bold bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            onClick={salvar}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all ${
              saved ? 'bg-rainbow-green text-white' : 'bg-primary text-primary-foreground hover:opacity-90'
            }`}
          >
            <Save size={14} /> {saved ? 'Salvo!' : 'Salvar'}
          </button>
        </div>
        <div className="bg-muted/50 rounded-xl px-4 py-3 text-xs text-muted-foreground">
          Capacidade atual: <strong className="text-foreground">{capacidade.toLocaleString('pt-BR')} unidades/semana</strong>
        </div>
      </div>
    </div>
  );
}

// ── Aba: Conta ───────────────────────────────────────────────────────────────

function AbaConta() {
  const [confirm, setConfirm]   = useState(false);
  const [input, setInput]       = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (input !== 'EXCLUIR') return;
    setDeleting(true);
    await base44.auth.logout();
  };

  return (
    <div className="space-y-4">
      {/* Botão de logout */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
            <User size={18} className="text-muted-foreground" />
          </div>
          <div>
            <p className="font-bold text-sm text-foreground">Sessão</p>
            <p className="text-xs text-muted-foreground">Encerrar sua sessão atual no sistema</p>
          </div>
        </div>
        <button
          onClick={() => base44.auth.logout('/')}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border text-foreground text-sm font-semibold hover:bg-muted transition-colors min-h-[44px]"
        >
          <AlertTriangle size={15} className="text-destructive" /> Sair / Deslogar
        </button>
      </div>

      <div className="bg-card border border-destructive/30 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={18} className="text-destructive" />
          </div>
          <div>
            <p className="font-bold text-sm text-foreground">Excluir Conta</p>
            <p className="text-xs text-muted-foreground">Esta ação é permanente e não pode ser desfeita.</p>
          </div>
        </div>
        {!confirm ? (
          <button onClick={() => setConfirm(true)}
            className="w-full py-2.5 rounded-xl border border-destructive text-destructive text-sm font-semibold hover:bg-destructive/10 transition-colors min-h-[44px]">
            Solicitar exclusão de conta
          </button>
        ) : (
          <div className="space-y-3 border border-destructive/20 rounded-xl p-4 bg-destructive/5">
            <p className="text-sm text-foreground">
              Para confirmar, digite <strong className="font-mono">EXCLUIR</strong> abaixo:
            </p>
            <input value={input} onChange={e => setInput(e.target.value)} placeholder="EXCLUIR"
              className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-destructive min-h-[44px]" />
            <div className="flex gap-2">
              <button onClick={handleDelete} disabled={input !== 'EXCLUIR' || deleting}
                className="flex-1 py-2.5 rounded-xl bg-destructive text-white text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity min-h-[44px]">
                {deleting ? 'Processando...' : 'Confirmar exclusão'}
              </button>
              <button onClick={() => { setConfirm(false); setInput(''); }}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted transition-colors min-h-[44px]">
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Página principal ─────────────────────────────────────────────────────────

const TAB_GROUPS = [
  {
    label: 'Sistema',
    items: [
      { key: 'gestao_fluxos',  label: 'Gestão de Fluxos / Kanbans', icon: Columns,      desc: 'Etapas, automações e fluxo integrado' },
      { key: 'acoes',          label: 'Ações',           icon: Zap,         desc: 'Ações de etapa dos Kanbans' },
      { key: 'regras',         label: 'Regras de Automação', icon: Activity, desc: 'Gatilhos e ações das automações' },
      { key: 'personalizacao', label: 'Personalização', icon: Paintbrush,  desc: 'Logo, empresa e visual' },
      { key: 'producao',       label: 'Produção',        icon: Factory,     desc: 'Capacidade semanal' },
      { key: 'checklists',     label: 'Checklists',      icon: CheckSquare, desc: 'Etapas do Kanban' },
      { key: 'etiquetas',      label: 'Etiquetas',        icon: Printer,     desc: 'Configuração de impressora' },
      { key: 'whatsapp',       label: 'WhatsApp',         icon: MessageCircle, desc: 'Notificações automáticas' },
      { key: 'mural',          label: 'Mural de Avisos',  icon: Megaphone,   desc: 'Avisos para todos os usuários', adminOnly: true },
    ],
  },
  {
    label: 'Acesso',
    items: [
      { key: 'usuarios',  label: 'Usuários',  icon: Users,  desc: 'Perfis e permissões' },
      { key: 'auditoria', label: 'Auditoria', icon: Shield, desc: 'Logs de atividade' },
    ],
  },
  {
    label: 'Integrações',
    items: [
      { key: 'bling', label: 'Bling', icon: Link2, desc: 'Importar pedidos do Bling', adminOnly: true },
    ],
  },
  {
    label: 'Avançado',
    items: [
      { key: 'supabase', label: 'Supabase Schemas', icon: Database, desc: 'Estrutura do banco de dados', adminOnly: true },
    ],
  },
  {
    label: 'Conta',
    items: [
      { key: 'conta', label: 'Minha Conta', icon: User, desc: 'Configurações da conta' },
    ],
  },
];

const ALL_TABS = TAB_GROUPS.flatMap(g => g.items);

export default function Configuracoes() {
  const [aba, setAba] = useState('personalizacao');
  const { getNivel } = usePermissoes();
  const isAdmin = getNivel('Configuracoes') === 'full';
  const current = ALL_TABS.find(t => t.key === aba);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Settings2 size={22} className="text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Configurações</h2>
          <p className="text-sm text-muted-foreground">Personalize o sistema, gerencie usuários e monitore a auditoria</p>
        </div>
      </div>

      {/* Layout sidebar + conteúdo */}
      <div className="flex gap-5 items-start">
        {/* Sidebar */}
        <aside className="w-52 flex-shrink-0 bg-card border border-border rounded-2xl overflow-hidden sticky top-4">
          {TAB_GROUPS.map((group, gi) => {
            const visibleItems = group.items.filter(item => !item.adminOnly || isAdmin);
            if (visibleItems.length === 0) return null;
            return (
              <div key={gi} className={gi > 0 ? 'border-t border-border' : ''}>
                <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {group.label}
                </p>
                {visibleItems.map(({ key, label, icon: Icon, desc }) => {
                  const active = aba === key;
                  return (
                    <button key={key} onClick={() => setAba(key)}
                      className={`flex items-center gap-3 px-3 mx-1 py-2.5 rounded-xl mb-0.5 text-left transition-all ${
                        active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                      style={{ width: 'calc(100% - 8px)' }}
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${active ? 'bg-primary/15' : 'bg-muted'}`}>
                        <Icon size={14} className={active ? 'text-primary' : 'text-muted-foreground'} />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs font-semibold truncate ${active ? 'text-primary' : ''}`}>{label}</p>
                        <p className="text-[10px] text-muted-foreground truncate leading-tight">{desc}</p>
                      </div>
                      {active && <div className="w-1 h-5 rounded-full bg-primary flex-shrink-0 ml-auto" />}
                    </button>
                  );
                })}
                <div className="pb-1" />
              </div>
            );
          })}
        </aside>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-4">
            {current && (
              <>
                <current.icon size={16} className="text-primary" />
                <h3 className="text-base font-bold text-foreground">{current.label}</h3>
                <span className="text-muted-foreground text-sm">—</span>
                <span className="text-sm text-muted-foreground">{current.desc}</span>
              </>
            )}
          </div>

          {aba === 'personalizacao'  && <AbaPersonalizacao />}
          {aba === 'gestao_fluxos'   && <AbaGestaoFluxos />}
          {aba === 'acoes'           && <AbaAcoes />}
          {aba === 'regras'          && <AbaRegrasAutomacao />}
          {aba === 'checklists'     && <AbaChecklists />}
          {aba === 'producao'       && <AbaProducao />}
          {aba === 'etiquetas'      && <AbaEtiquetas />}
          {aba === 'whatsapp'       && <AbaWhatsapp />}
          {aba === 'mural'    && isAdmin && <AbaMural />}
          {aba === 'usuarios'       && <AbaUsuarios />}
          {aba === 'auditoria'      && <AbaAuditoria />}
          {aba === 'bling'    && isAdmin && <AbaBling />}
          {aba === 'bling'    && !isAdmin && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <span className="text-4xl">🔒</span>
              <p className="font-bold text-foreground">Acesso Restrito</p>
            </div>
          )}
          {aba === 'supabase' && isAdmin && <SupabaseSchemas />}
          {aba === 'supabase' && !isAdmin && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <span className="text-4xl">🔒</span>
              <p className="font-bold text-foreground">Acesso Restrito</p>
              <p className="text-sm text-muted-foreground">Apenas administradores podem acessar os schemas do Supabase.</p>
            </div>
          )}
          {aba === 'conta' && <AbaConta />}
        </div>
      </div>
    </div>
  );
}