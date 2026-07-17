import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Users, Shield, Save, Check, Eye, X, EyeOff, Lock, Unlock, ChevronDown, ChevronUp, AlertTriangle, DollarSign } from 'lucide-react';

const ROLES = [
  { key: 'admin',            label: 'Administrador',       color: 'bg-red-100 text-red-700 border-red-300' },
  { key: 'gerente_producao', label: 'Gerente de Produção', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  { key: 'vendedor',         label: 'Vendedor',            color: 'bg-sky-100 text-sky-700 border-sky-300' },
  { key: 'maquinista',       label: 'Maquinista',          color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { key: 'embalador',        label: 'Embalador',           color: 'bg-amber-100 text-amber-700 border-amber-300' },
  { key: 'estoquista',       label: 'Estoquista',          color: 'bg-green-100 text-green-700 border-green-300' },
  { key: 'motorista',        label: 'Motorista',           color: 'bg-muted text-muted-foreground border-border' },
  { key: 'estoquista_industria', label: 'Estoquista Industria', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  { key: 'estoquista_galpao',    label: 'Estoquista Galpão',    color: 'bg-lime-100 text-lime-700 border-lime-300' },
  { key: 'vendedor_industria',   label: 'Vendedor Industria',   color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { key: 'vendedor_loja',        label: 'Vendedor Loja',        color: 'bg-indigo-100 text-indigo-700 border-indigo-300' },
  { key: 'conferente_industria', label: 'Conferente Industria', color: 'bg-cyan-100 text-cyan-700 border-cyan-300' },
  { key: 'conferente_galpao',    label: 'Conferente Galpão',    color: 'bg-violet-100 text-violet-700 border-violet-300' },
];

// Grupos de módulos
const GRUPOS = [
  {
    key: 'operacional',
    label: 'Operacional',
    icon: '🏭',
    modulos: [
      { key: 'Dashboard',    label: 'Dashboard',         icon: '📊' },
      { key: 'Pedidos',      label: 'Pedidos',           icon: '🛒' },
      { key: 'Kanban',       label: 'Kanban / Produção', icon: '🏭' },
      { key: 'Separacao',    label: 'Separação Industria', icon: '📋' },
      { key: 'SeparacaoGalpao', label: 'Separação Galpão', icon: '🏪' },
      { key: 'Estoque',      label: 'Estoque',           icon: '📦' },
      { key: 'Embalagem',    label: 'Embalagem',         icon: '🎁' },
      { key: 'Etiquetas',    label: 'Etiquetas',         icon: '🏷️' },
      { key: 'Expedicao',    label: 'Expedição',         icon: '🚚' },
      { key: 'Clientes',     label: 'Clientes / CRM',   icon: '👥' },
      { key: 'Produtos',     label: 'Produtos',          icon: '🕯️' },
      { key: 'Perdas',       label: 'Perdas / Descartes',icon: '♻️' },
      { key: 'Auditoria',    label: 'Auditoria',         icon: '🔍' },
      { key: 'Configuracoes',label: 'Configurações',     icon: '⚙️' },
    ],
  },
  {
    key: 'financeiro',
    label: 'Financeiro & Relatórios',
    icon: '💰',
    isFinanceiro: true,
    modulos: [
      { key: 'Relatorios',   label: 'Relatórios',        icon: '📈' },
      { key: 'Faturamento',  label: 'Faturamento',       icon: '🧾' },
      { key: 'Precos',       label: 'Preços / Custos',   icon: '💵' },
    ],
  },
];

const TODOS_MODULOS = GRUPOS.flatMap(g => g.modulos);
const MODULOS_FINANCEIROS = GRUPOS.find(g => g.isFinanceiro)?.modulos.map(m => m.key) || [];

const NIVEIS = [
  { key: 'none', label: 'Sem acesso',    icon: X,       style: 'bg-red-50 border-red-300 text-red-600' },
  { key: 'view', label: 'Somente ver',   icon: Eye,     style: 'bg-sky-50 border-sky-300 text-sky-600' },
  { key: 'full', label: 'Completo',      icon: Check,   style: 'bg-green-50 border-green-300 text-green-600' },
];

const DEFAULTS = {
  admin:            Object.fromEntries(TODOS_MODULOS.map(m => [m.key, 'full'])),
  gerente_producao: { Dashboard: 'full', Pedidos: 'full', Kanban: 'full', Separacao: 'full', SeparacaoGalpao: 'full', Estoque: 'full', Embalagem: 'full', Etiquetas: 'full', Expedicao: 'full', Clientes: 'view', Produtos: 'full', Relatorios: 'full', Perdas: 'full', Faturamento: 'view', Precos: 'view', Auditoria: 'view', Configuracoes: 'none' },
  vendedor:         { Dashboard: 'view', Pedidos: 'full', Kanban: 'view', Separacao: 'view', SeparacaoGalpao: 'view', Estoque: 'view', Embalagem: 'none', Etiquetas: 'none', Expedicao: 'view', Clientes: 'full', Produtos: 'view', Relatorios: 'none', Perdas: 'none', Faturamento: 'none', Precos: 'none', Auditoria: 'none', Configuracoes: 'none' },
  maquinista:       { Dashboard: 'view', Pedidos: 'none', Kanban: 'full', Separacao: 'none', SeparacaoGalpao: 'none', Estoque: 'view', Embalagem: 'none', Etiquetas: 'none', Expedicao: 'none', Clientes: 'none', Produtos: 'none', Relatorios: 'none', Perdas: 'view', Faturamento: 'none', Precos: 'none', Auditoria: 'none', Configuracoes: 'none' },
  embalador:        { Dashboard: 'view', Pedidos: 'none', Kanban: 'view', Separacao: 'view', SeparacaoGalpao: 'view', Estoque: 'view', Embalagem: 'full', Etiquetas: 'full', Expedicao: 'none', Clientes: 'none', Produtos: 'none', Relatorios: 'none', Perdas: 'view', Faturamento: 'none', Precos: 'none', Auditoria: 'none', Configuracoes: 'none' },
  estoquista:       { Dashboard: 'view', Pedidos: 'view', Kanban: 'view', Separacao: 'full', SeparacaoGalpao: 'full', Estoque: 'full', Embalagem: 'none', Etiquetas: 'full', Expedicao: 'none', Clientes: 'none', Produtos: 'view', Relatorios: 'none', Perdas: 'view', Faturamento: 'none', Precos: 'none', Auditoria: 'none', Configuracoes: 'none' },
  motorista:        { Dashboard: 'view', Pedidos: 'none', Kanban: 'none', Separacao: 'none', SeparacaoGalpao: 'none', Estoque: 'none', Embalagem: 'none', Etiquetas: 'none', Expedicao: 'full', Clientes: 'none', Produtos: 'none', Relatorios: 'none', Perdas: 'none', Faturamento: 'none', Precos: 'none', Auditoria: 'none', Configuracoes: 'none' },
  estoquista_industria: { Dashboard: 'view', Pedidos: 'view', Kanban: 'view', Separacao: 'full', SeparacaoGalpao: 'none', Estoque: 'full', Embalagem: 'none', Etiquetas: 'full', Expedicao: 'none', Clientes: 'none', Produtos: 'view', Relatorios: 'none', Perdas: 'view', Faturamento: 'none', Precos: 'none', Auditoria: 'none', Configuracoes: 'none' },
  estoquista_galpao:    { Dashboard: 'view', Pedidos: 'none', Kanban: 'none', Separacao: 'none', SeparacaoGalpao: 'full', Estoque: 'view', Embalagem: 'none', Etiquetas: 'full', Expedicao: 'view', Clientes: 'none', Produtos: 'view', Relatorios: 'none', Perdas: 'view', Faturamento: 'none', Precos: 'none', Auditoria: 'none', Configuracoes: 'none' },
  vendedor_industria:   { Dashboard: 'view', Pedidos: 'full', Kanban: 'view', Separacao: 'view', SeparacaoGalpao: 'none', Estoque: 'view', Embalagem: 'none', Etiquetas: 'none', Expedicao: 'view', Clientes: 'full', Produtos: 'view', Relatorios: 'none', Perdas: 'none', Faturamento: 'none', Precos: 'none', Auditoria: 'none', Configuracoes: 'none' },
  vendedor_loja:        { Dashboard: 'view', Pedidos: 'full', Kanban: 'none', Separacao: 'none', SeparacaoGalpao: 'none', Estoque: 'view', Embalagem: 'none', Etiquetas: 'none', Expedicao: 'view', Clientes: 'full', Produtos: 'view', Relatorios: 'none', Perdas: 'none', Faturamento: 'none', Precos: 'none', Auditoria: 'none', Configuracoes: 'none' },
  conferente_industria: { Dashboard: 'view', Pedidos: 'view', Kanban: 'view', Separacao: 'full', SeparacaoGalpao: 'none', Estoque: 'view', Embalagem: 'none', Etiquetas: 'none', Expedicao: 'view', Clientes: 'none', Produtos: 'view', Relatorios: 'none', Perdas: 'none', Faturamento: 'none', Precos: 'none', Auditoria: 'none', Configuracoes: 'none' },
  conferente_galpao:    { Dashboard: 'view', Pedidos: 'none', Kanban: 'none', Separacao: 'none', SeparacaoGalpao: 'full', Estoque: 'none', Embalagem: 'none', Etiquetas: 'none', Expedicao: 'view', Clientes: 'none', Produtos: 'view', Relatorios: 'none', Perdas: 'none', Faturamento: 'none', Precos: 'none', Auditoria: 'none', Configuracoes: 'none' },
};

const ROLE_LABEL = Object.fromEntries(ROLES.map(r => [r.key, r.label]));

// Botão de nível — clica para ciclar entre none → view → full → none
function NivelCycleButton({ nivel, onClick, disabled }) {
  const cfg = NIVEIS.find(n => n.key === nivel) || NIVEIS[0];
  const Icon = cfg.icon;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all min-w-[110px] justify-center ${disabled ? 'opacity-40 cursor-not-allowed bg-muted border-border text-muted-foreground' : `cursor-pointer hover:opacity-80 ${cfg.style}`}`}
      title={disabled ? 'Admin sempre tem acesso completo' : `Clique para alterar (atual: ${cfg.label})`}
    >
      <Icon size={11} />
      {cfg.label}
    </button>
  );
}

function RoleCard({ role, permissao, onSave }) {
  const cfg = ROLES.find(r => r.key === role);
  const [open, setOpen] = useState(false);
  const [modulos, setModulos] = useState(() => permissao?.modulos_niveis ?? DEFAULTS[role] ?? {});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Sync when permissao loads
  useEffect(() => {
    setModulos(permissao?.modulos_niveis ?? DEFAULTS[role] ?? {});
  }, [permissao]);

  const cycleNivel = (key) => {
    if (role === 'admin') return;
    const order = ['none', 'view', 'full'];
    const current = modulos[key] ?? 'none';
    const next = order[(order.indexOf(current) + 1) % order.length];
    setModulos(prev => ({ ...prev, [key]: next }));
  };

  const setGrupo = (grupoModulos, nivel) => {
    if (role === 'admin') return;
    const updates = {};
    grupoModulos.forEach(m => { updates[m.key] = nivel; });
    setModulos(prev => ({ ...prev, ...updates }));
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(role, modulos, permissao?.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const countByNivel = (nivel) => TODOS_MODULOS.filter(m => (modulos[m.key] ?? 'none') === nivel).length;
  const financeiroTudoBloqueado = MODULOS_FINANCEIROS.every(k => (modulos[k] ?? 'none') === 'none');

  return (
    <div className={`border rounded-2xl overflow-hidden transition-all ${open ? 'border-primary/30 shadow-sm' : 'border-border'}`}>
      {/* Header */}
      <button onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center justify-between px-5 py-4 text-left transition-colors ${open ? 'bg-muted/40' : 'bg-card hover:bg-muted/20'}`}>
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${cfg?.color || 'bg-muted text-muted-foreground border-border'}`}>
            {cfg?.label}
          </span>
          {role === 'admin' ? (
            <span className="text-xs text-muted-foreground flex items-center gap-1"><Unlock size={11} /> Acesso total — irrestrito</span>
          ) : (
            <div className="flex gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1 text-green-600"><Check size={10} />{countByNivel('full')} completo</span>
              <span className="flex items-center gap-1 text-sky-600"><Eye size={10} />{countByNivel('view')} visualização</span>
              <span className="flex items-center gap-1 text-red-500"><X size={10} />{countByNivel('none')} bloqueado</span>
              {financeiroTudoBloqueado && (
                <span className="flex items-center gap-1 text-amber-600 font-semibold"><DollarSign size={10} />Fin. oculto</span>
              )}
            </div>
          )}
        </div>
        {open ? <ChevronUp size={14} className="text-muted-foreground flex-shrink-0" /> : <ChevronDown size={14} className="text-muted-foreground flex-shrink-0" />}
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-5 border-t border-border pt-4">
          {role === 'admin' ? (
            <p className="text-xs text-muted-foreground bg-muted/30 rounded-xl px-3 py-2.5 flex items-center gap-2">
              <Shield size={13} /> O Administrador tem acesso irrestrito a todos os módulos e não pode ser limitado.
            </p>
          ) : (
            <>
              {/* Legenda */}
              <div className="flex gap-4 text-xs text-muted-foreground">
                {NIVEIS.map(n => { const Icon = n.icon; return (
                  <span key={n.key} className="flex items-center gap-1"><Icon size={10} /> {n.label}</span>
                ); })}
                <span className="text-muted-foreground/60 ml-1">— clique no botão para alternar</span>
              </div>

              {/* Grupos */}
              {GRUPOS.map(grupo => (
                <div key={grupo.key} className={`rounded-2xl border overflow-hidden ${grupo.isFinanceiro ? 'border-amber-200' : 'border-border'}`}>
                  {/* Cabeçalho do grupo */}
                  <div className={`flex items-center justify-between px-4 py-3 ${grupo.isFinanceiro ? 'bg-amber-50' : 'bg-muted/30'}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{grupo.icon}</span>
                      <p className="text-xs font-bold text-foreground uppercase tracking-wide">{grupo.label}</p>
                      {grupo.isFinanceiro && (
                        <span className="text-[10px] bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full font-bold">SENSÍVEL</span>
                      )}
                    </div>
                    {/* Ações rápidas do grupo */}
                    <div className="flex gap-1.5">
                      <button onClick={() => setGrupo(grupo.modulos, 'none')}
                        className="flex items-center gap-1 text-[10px] px-2 py-1 bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-semibold">
                        <EyeOff size={10} /> Ocultar tudo
                      </button>
                      <button onClick={() => setGrupo(grupo.modulos, 'view')}
                        className="flex items-center gap-1 text-[10px] px-2 py-1 bg-sky-50 border border-sky-200 text-sky-600 rounded-lg hover:bg-sky-100 transition-colors font-semibold">
                        <Eye size={10} /> Só ver
                      </button>
                      <button onClick={() => setGrupo(grupo.modulos, 'full')}
                        className="flex items-center gap-1 text-[10px] px-2 py-1 bg-green-50 border border-green-200 text-green-600 rounded-lg hover:bg-green-100 transition-colors font-semibold">
                        <Unlock size={10} /> Liberar
                      </button>
                    </div>
                  </div>

                  {/* Módulos do grupo */}
                  <div className="divide-y divide-border/40">
                    {grupo.modulos.map(m => {
                      const nivelAtual = modulos[m.key] ?? 'none';
                      return (
                        <div key={m.key} className={`flex items-center justify-between px-4 py-2.5 ${nivelAtual === 'none' ? 'opacity-50' : ''}`}>
                          <span className="text-sm text-foreground">{m.icon} {m.label}</span>
                          <NivelCycleButton
                            nivel={nivelAtual}
                            onClick={() => cycleNivel(m.key)}
                            disabled={false}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Aviso financeiro */}
                  {grupo.isFinanceiro && (
                    <div className="px-4 py-2.5 bg-amber-50/50 border-t border-amber-100">
                      <p className="text-[10px] text-amber-700 flex items-center gap-1.5">
                        <AlertTriangle size={10} />
                        <strong>Somente ver</strong>: o usuário acessa a página mas <strong>valores monetários e lucros ficam ocultos</strong>.
                        <strong>Sem acesso</strong>: a página fica completamente invisível no menu.
                      </p>
                    </div>
                  )}
                </div>
              ))}

              {/* Botão salvar */}
              <div className="flex items-center gap-3 pt-1">
                <button onClick={handleSave} disabled={saving}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${saved ? 'bg-green-500 text-white' : 'bg-primary text-primary-foreground hover:opacity-90'} disabled:opacity-50`}>
                  {saved ? <><Check size={14} /> Permissões salvas!</> : saving ? 'Salvando...' : <><Save size={14} /> Salvar permissões</>}
                </button>
                <button onClick={() => setModulos(DEFAULTS[role] ?? {})}
                  className="text-xs text-muted-foreground hover:text-foreground underline">
                  Restaurar padrão
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function AbaPermissoes({ permissoes, onSave }) {
  return (
    <div className="space-y-3">
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-800 space-y-1">
        <p className="font-semibold flex items-center gap-1.5"><Shield size={12} /> Como funcionam os níveis de acesso:</p>
        <p><strong>Sem acesso</strong> — módulo oculto no menu, página bloqueada.</p>
        <p><strong>Somente ver</strong> — usuário vê o módulo mas não pode criar/editar/excluir. Em módulos financeiros, valores monetários ficam ocultos.</p>
        <p><strong>Completo</strong> — acesso total ao módulo.</p>
      </div>
      {ROLES.map(r => (
        <RoleCard key={r.key} role={r.key} permissao={permissoes.find(p => p.role === r.key)} onSave={onSave} />
      ))}
    </div>
  );
}

function AbaUsuariosList({ usuarios, onRoleChange }) {
  const [busca, setBusca] = useState('');
  const [editandoId, setEditandoId] = useState(null);
  const [salvando, setSalvando] = useState(null);

  const filtrados = usuarios.filter(u =>
    !busca || u.full_name?.toLowerCase().includes(busca.toLowerCase()) || u.email?.toLowerCase().includes(busca.toLowerCase())
  );

  const handleRoleChange = async (u, novoRole) => {
    setSalvando(u.id);
    await onRoleChange(u.id, novoRole);
    setSalvando(null);
    setEditandoId(null);
  };

  const ROLES_SISTEMA = ROLES.map(r => r.key);

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 flex items-center gap-2">
        <AlertTriangle size={13} className="text-amber-600 flex-shrink-0" />
        Usuários sem perfil <strong>não acessam o sistema</strong>. Clique no badge de perfil para atribuir ou alterar.
      </p>
      <input value={busca} onChange={e => setBusca(e.target.value)}
        placeholder="Buscar por nome ou e-mail..."
        className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />

      <div className="space-y-2">
        {filtrados.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum usuário encontrado.</p>
        ) : filtrados.map(u => {
          const cfg = ROLES.find(r => r.key === u.role);
          const semRole = !ROLES_SISTEMA.includes(u.role);
          const isEditando = editandoId === u.id;
          return (
            <div key={u.id} className={`border rounded-xl p-3 space-y-2 transition-all ${isEditando ? 'border-primary/30 bg-primary/5' : 'border-border'}`}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center font-bold text-sm text-primary flex-shrink-0">
                  {(u.full_name || u.email || '?').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{u.full_name || '—'}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                </div>
                <button onClick={() => setEditandoId(isEditando ? null : u.id)}
                  className={`text-xs px-2.5 py-1 rounded-full border font-semibold flex-shrink-0 transition-all hover:opacity-80 ${semRole ? 'bg-amber-100 text-amber-700 border-amber-300' : cfg?.color || 'bg-muted text-muted-foreground border-border'}`}>
                  {semRole ? '⚠ Sem perfil' : (ROLE_LABEL[u.role] || u.role)}
                </button>
              </div>

              {isEditando && (
                <div className="bg-muted/30 rounded-xl p-3 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">Selecionar perfil para <strong>{u.full_name || u.email}</strong>:</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {ROLES.map(r => (
                      <button key={r.key} onClick={() => handleRoleChange(u, r.key)}
                        disabled={salvando === u.id}
                        className={`text-left px-3 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-2 ${u.role === r.key ? r.color : 'bg-card border-border text-muted-foreground hover:bg-muted hover:text-foreground'} ${salvando === u.id ? 'opacity-50 cursor-wait' : ''}`}>
                        {u.role === r.key && <Check size={10} />}
                        {r.label}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setEditandoId(null)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AbaUsuarios() {
  const [aba, setAba] = useState('usuarios');
  const [usuarios, setUsuarios] = useState([]);
  const [permissoes, setPermissoes] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [users, perms] = await Promise.all([
      base44.entities.User.list(),
      base44.entities.PermissaoRole.list(),
    ]);
    setUsuarios(users);
    setPermissoes(perms);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleRoleChange = async (userId, novoRole) => {
    await base44.entities.User.update(userId, { role: novoRole });
    setUsuarios(prev => prev.map(u => u.id === userId ? { ...u, role: novoRole } : u));
  };

  const handleSavePermissao = async (role, modulos_niveis, existingId) => {
    if (existingId) {
      await base44.entities.PermissaoRole.update(existingId, { role, modulos_niveis });
      setPermissoes(prev => prev.map(p => p.id === existingId ? { ...p, modulos_niveis } : p));
    } else {
      const created = await base44.entities.PermissaoRole.create({ role, modulos_niveis });
      setPermissoes(prev => [...prev, created]);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <Users size={18} className="text-primary" />
        </div>
        <div>
          <p className="font-semibold text-foreground">Usuários & Permissões</p>
          <p className="text-xs text-muted-foreground">{usuarios.length} usuário(s) · {permissoes.length} perfil(s) configurado(s)</p>
        </div>
      </div>

      <div className="flex gap-1 bg-muted p-1 rounded-xl w-fit">
        {[
          { key: 'usuarios',   label: 'Usuários',              icon: Users  },
          { key: 'permissoes', label: 'Permissões por Perfil', icon: Shield },
        ].map(a => {
          const Icon = a.icon;
          return (
            <button key={a.key} onClick={() => setAba(a.key)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${aba === a.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              <Icon size={12} /> {a.label}
            </button>
          );
        })}
      </div>

      {aba === 'usuarios'   && <AbaUsuariosList usuarios={usuarios} onRoleChange={handleRoleChange} />}
      {aba === 'permissoes' && <AbaPermissoes permissoes={permissoes} onSave={handleSavePermissao} />}
    </div>
  );
}