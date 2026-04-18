import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Users, Shield, Save, Check, Eye, X } from 'lucide-react';

const ROLES = [
  { key: 'admin', label: 'Administrador', color: 'bg-red-100 text-red-700 border-red-300' },
  { key: 'gerente_producao', label: 'Gerente de Produção', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  { key: 'vendedor', label: 'Vendedor', color: 'bg-sky-100 text-sky-700 border-sky-300' },
  { key: 'maquinista', label: 'Maquinista', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { key: 'embalador', label: 'Embalador', color: 'bg-amber-100 text-amber-700 border-amber-300' },
  { key: 'estoquista', label: 'Estoquista', color: 'bg-green-100 text-green-700 border-green-300' },
  { key: 'motorista', label: 'Motorista', color: 'bg-muted text-muted-foreground border-border' },
];

const MODULOS = [
  { key: 'Dashboard', label: 'Dashboard', icon: '📊', grupo: 'geral' },
  { key: 'Pedidos', label: 'Pedidos', icon: '🛒', grupo: 'geral' },
  { key: 'Kanban', label: 'Kanban / Produção', icon: '🏭', grupo: 'geral' },
  { key: 'Estoque', label: 'Estoque', icon: '📦', grupo: 'geral' },
  { key: 'Embalagem', label: 'Embalagem', icon: '🎁', grupo: 'geral' },
  { key: 'Etiquetas', label: 'Etiquetas', icon: '🏷️', grupo: 'geral' },
  { key: 'Expedicao', label: 'Expedição', icon: '🚚', grupo: 'geral' },
  { key: 'Clientes', label: 'Clientes / CRM', icon: '👥', grupo: 'geral' },
  { key: 'Produtos', label: 'Produtos', icon: '🕯️', grupo: 'geral' },
  { key: 'Relatorios', label: 'Relatórios', icon: '📈', grupo: 'financeiro' },
  { key: 'Perdas', label: 'Perdas / Descartes', icon: '♻️', grupo: 'geral' },
  { key: 'Auditoria', label: 'Auditoria', icon: '🔍', grupo: 'geral' },
  { key: 'Configuracoes', label: 'Configurações', icon: '⚙️', grupo: 'geral' },
];

const MODULOS_FINANCEIROS = ['Relatorios'];

const NIVEIS = [
  { key: 'none', label: 'Sem acesso', icon: X, style: 'bg-muted/40 border-border/60 text-muted-foreground' },
  { key: 'view', label: 'Visualizar', icon: Eye, style: 'bg-sky-100 border-sky-300 text-sky-700' },
  { key: 'full', label: 'Completo', icon: Check, style: 'bg-green-100 border-green-300 text-green-700' },
];

const DEFAULTS = {
  admin: Object.fromEntries(MODULOS.map(m => [m.key, 'full'])),
  gerente_producao: { Dashboard: 'full', Pedidos: 'full', Kanban: 'full', Estoque: 'full', Embalagem: 'full', Etiquetas: 'full', Expedicao: 'full', Clientes: 'view', Produtos: 'full', Relatorios: 'full', Perdas: 'full', Auditoria: 'view', Configuracoes: 'none' },
  vendedor: { Dashboard: 'view', Pedidos: 'full', Kanban: 'view', Estoque: 'view', Embalagem: 'none', Etiquetas: 'none', Expedicao: 'view', Clientes: 'full', Produtos: 'view', Relatorios: 'none', Perdas: 'none', Auditoria: 'none', Configuracoes: 'none' },
  maquinista: { Dashboard: 'view', Pedidos: 'none', Kanban: 'full', Estoque: 'view', Embalagem: 'none', Etiquetas: 'none', Expedicao: 'none', Clientes: 'none', Produtos: 'none', Relatorios: 'none', Perdas: 'view', Auditoria: 'none', Configuracoes: 'none' },
  embalador: { Dashboard: 'view', Pedidos: 'none', Kanban: 'view', Estoque: 'view', Embalagem: 'full', Etiquetas: 'full', Expedicao: 'none', Clientes: 'none', Produtos: 'none', Relatorios: 'none', Perdas: 'view', Auditoria: 'none', Configuracoes: 'none' },
  estoquista: { Dashboard: 'view', Pedidos: 'view', Kanban: 'view', Estoque: 'full', Embalagem: 'none', Etiquetas: 'full', Expedicao: 'none', Clientes: 'none', Produtos: 'view', Relatorios: 'none', Perdas: 'view', Auditoria: 'none', Configuracoes: 'none' },
  motorista: { Dashboard: 'view', Pedidos: 'none', Kanban: 'none', Estoque: 'none', Embalagem: 'none', Etiquetas: 'none', Expedicao: 'full', Clientes: 'none', Produtos: 'none', Relatorios: 'none', Perdas: 'none', Auditoria: 'none', Configuracoes: 'none' },
};

const ROLE_LABEL = Object.fromEntries(ROLES.map(r => [r.key, r.label]));

function NivelButton({ nivel, active, onClick, disabled }) {
  const cfg = NIVEIS.find(n => n.key === nivel);
  const Icon = cfg.icon;
  return (
    <button onClick={onClick} disabled={disabled}
      className={`flex items-center justify-center w-8 h-8 rounded-lg border transition-all ${active ? cfg.style : 'bg-muted/20 border-border/40 text-muted-foreground/40'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'}`}
      title={cfg.label}>
      <Icon size={12} />
    </button>
  );
}

function RoleCard({ role, permissao, onSave }) {
  const cfg = ROLES.find(r => r.key === role);
  const [open, setOpen] = useState(false);
  const [modulos, setModulos] = useState(permissao?.modulos_niveis ?? DEFAULTS[role] ?? {});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const setNivel = (key, nivel) => {
    if (role === 'admin') return;
    setModulos(prev => ({ ...prev, [key]: nivel }));
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(role, modulos, permissao?.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const countFull = Object.values(modulos).filter(v => v === 'full').length;
  const countView = Object.values(modulos).filter(v => v === 'view').length;

  return (
    <div className="border border-border rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center justify-between px-5 py-4 text-left transition-colors ${open ? 'bg-muted/50' : 'bg-card hover:bg-muted/20'}`}>
        <div className="flex items-center gap-3">
          <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${cfg?.color || 'bg-muted text-muted-foreground border-border'}`}>
            {cfg?.label}
          </span>
          <span className="text-xs text-muted-foreground">
            {role === 'admin' ? 'Acesso completo a tudo' : `${countFull} completo · ${countView} visualização`}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">
          {role === 'admin' && (
            <p className="text-xs text-muted-foreground bg-muted/30 rounded-xl px-3 py-2">
              O Administrador tem acesso completo a todos os módulos e não pode ser restrito.
            </p>
          )}

          {/* Legenda */}
          <div className="flex gap-3 text-xs">
            {NIVEIS.map(n => {
              const Icon = n.icon;
              return (
                <span key={n.key} className="flex items-center gap-1 text-muted-foreground">
                  <Icon size={10} /> {n.label}
                </span>
              );
            })}
          </div>

          {/* Ação rápida */}
          {role !== 'admin' && (
            <div className="flex items-center justify-between bg-muted/30 rounded-xl px-3 py-2">
              <div>
                <p className="text-xs font-semibold text-foreground">Bloquear tudo financeiro</p>
                <p className="text-xs text-muted-foreground">Relatórios → Sem acesso</p>
              </div>
              <button onClick={() => {
                const updates = {};
                MODULOS_FINANCEIROS.forEach(k => { updates[k] = 'none'; });
                setModulos(prev => ({ ...prev, ...updates }));
              }} className="text-xs px-3 py-1.5 bg-orange-100 border border-orange-300 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors font-semibold">
                Bloquear
              </button>
            </div>
          )}

          {/* Tabela de módulos gerais */}
          <div className="space-y-1">
            {MODULOS.filter(m => m.grupo !== 'financeiro').map(m => {
              const nivelAtual = role === 'admin' ? 'full' : (modulos[m.key] ?? 'none');
              return (
                <div key={m.key} className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-foreground">{m.icon} {m.label}</span>
                  <div className="flex gap-1">
                    {NIVEIS.map(n => (
                      <NivelButton key={n.key} nivel={n.key} active={nivelAtual === n.key}
                        onClick={() => setNivel(m.key, n.key)} disabled={role === 'admin'} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Separador financeiro */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground font-medium px-2">Financeiro & Relatórios</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Módulos financeiros */}
          <div className="space-y-1">
            {MODULOS.filter(m => m.grupo === 'financeiro').map(m => {
              const nivelAtual = role === 'admin' ? 'full' : (modulos[m.key] ?? 'none');
              return (
                <div key={m.key} className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-foreground">{m.icon} {m.label}</span>
                  <div className="flex gap-1">
                    {NIVEIS.map(n => (
                      <NivelButton key={n.key} nivel={n.key} active={nivelAtual === n.key}
                        onClick={() => setNivel(m.key, n.key)} disabled={role === 'admin'} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {role !== 'admin' && (
            <button onClick={handleSave} disabled={saving}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${saved ? 'bg-green-500 text-white' : 'bg-primary text-primary-foreground hover:opacity-90'} disabled:opacity-50`}>
              {saved ? <><Check size={14} /> Salvo!</> : saving ? 'Salvando...' : <><Save size={14} /> Salvar permissões</>}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function AbaPermissoes({ permissoes, onSave }) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Defina o nível de acesso de cada perfil por módulo: <strong>Sem acesso</strong>, <strong>Visualização</strong> ou <strong>Completo</strong>.
      </p>
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

  const ROLES_SISTEMA = ['admin', 'gerente_producao', 'vendedor', 'maquinista', 'embalador', 'estoquista', 'motorista'];

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
        Usuários sem um perfil atribuído <strong>não conseguem acessar o sistema</strong>. Clique no badge de perfil para atribuir ou alterar.
      </p>
      <input value={busca} onChange={e => setBusca(e.target.value)}
        placeholder="Buscar usuário por nome ou e-mail..."
        className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />

      <div className="space-y-2">
        {filtrados.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum usuário encontrado.</p>
        ) : filtrados.map(u => {
          const cfg = ROLES.find(r => r.key === u.role);
          const semRole = !ROLES_SISTEMA.includes(u.role);
          const isEditando = editandoId === u.id;
          return (
            <div key={u.id} className="border border-border rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center font-bold text-sm text-primary">
                  {(u.full_name || u.email || '?').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{u.full_name || '—'}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                </div>
                <button onClick={() => setEditandoId(isEditando ? null : u.id)}
                  className={`text-xs px-2.5 py-1 rounded-full border font-semibold flex-shrink-0 transition-all hover:opacity-80 ${semRole ? 'bg-amber-100 text-amber-700 border-amber-300' : cfg?.color || 'bg-muted text-muted-foreground border-border'}`}>
                  {semRole ? '⚠ Sem perfil' : (ROLE_LABEL[u.role] || u.role)}
                </button>
              </div>

              {isEditando && (
                <div className="bg-muted/30 rounded-xl p-3 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">Selecionar perfil para {u.full_name || u.email}:</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {ROLES.map(r => (
                      <button key={r.key} onClick={() => handleRoleChange(u, r.key)}
                        disabled={salvando === u.id}
                        className={`text-left px-3 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-2 ${u.role === r.key ? r.color : 'bg-muted/50 border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground'} ${salvando === u.id ? 'opacity-50 cursor-wait' : ''}`}>
                        {u.role === r.key && <Check size={10} />}
                        {r.label}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setEditandoId(null)} className="text-xs text-muted-foreground hover:text-foreground">
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

  if (loading) return <div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Users size={18} className="text-primary" />
        <div>
          <p className="font-semibold text-foreground">Usuários & Permissões</p>
          <p className="text-xs text-muted-foreground">{usuarios.length} usuário(s) no sistema</p>
        </div>
      </div>

      <div className="flex gap-1 bg-muted p-1 rounded-xl w-fit">
        {[{ key: 'usuarios', label: 'Usuários', icon: Users }, { key: 'permissoes', label: 'Permissões por Perfil', icon: Shield }].map(a => {
          const Icon = a.icon;
          return (
            <button key={a.key} onClick={() => setAba(a.key)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${aba === a.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              <Icon size={12} />{a.label}
            </button>
          );
        })}
      </div>

      {aba === 'usuarios' && <AbaUsuariosList usuarios={usuarios} onRoleChange={handleRoleChange} />}
      {aba === 'permissoes' && <AbaPermissoes permissoes={permissoes} onSave={handleSavePermissao} />}
    </div>
  );
}