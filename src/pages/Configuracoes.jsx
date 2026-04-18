import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { SlidersHorizontal, Save, Users, Bell } from 'lucide-react';

export default function Configuracoes() {
  const [empresaConfig, setEmpresaConfig] = useState({ nome: 'Raio do Sol', logo_url: '' });
  const [visualConfig, setVisualConfig] = useState({ titulo_sidebar: '', subtitulo_sidebar: '' });
  const [usuarios, setUsuarios] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [aba, setAba] = useState('empresa');

  useEffect(() => {
    try { setEmpresaConfig(JSON.parse(localStorage.getItem('empresa_config') || '{}')); } catch {}
    try { setVisualConfig(JSON.parse(localStorage.getItem('visual_config') || '{}')); } catch {}
    base44.entities.User.list().then(setUsuarios).catch(() => {});
  }, []);

  const salvarConfig = () => {
    setSalvando(true);
    localStorage.setItem('empresa_config', JSON.stringify(empresaConfig));
    localStorage.setItem('visual_config', JSON.stringify(visualConfig));
    window.dispatchEvent(new Event('settings:saved'));
    setTimeout(() => setSalvando(false), 800);
  };

  const alterarRole = async (userId, novoRole) => {
    await base44.entities.User.update(userId, { role: novoRole });
    setUsuarios(prev => prev.map(u => u.id === userId ? { ...u, role: novoRole } : u));
  };

  const ROLES = ['admin', 'gerente_producao', 'vendedor', 'maquinista', 'embalador', 'estoquista', 'motorista'];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center">
          <SlidersHorizontal size={19} className="text-slate-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Configurações</h2>
          <p className="text-xs text-muted-foreground">Gerencie o sistema</p>
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-2 border-b border-border pb-0">
        {[['empresa', '🏢 Empresa'], ['usuarios', '👥 Usuários']].map(([key, label]) => (
          <button key={key} onClick={() => setAba(key)}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-xl transition-colors ${aba === key ? 'bg-card border border-b-0 border-border text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            {label}
          </button>
        ))}
      </div>

      {aba === 'empresa' && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <h3 className="font-semibold text-foreground">Dados da Empresa</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Nome da Empresa</label>
              <input value={empresaConfig.nome || ''} onChange={e => setEmpresaConfig(c => ({ ...c, nome: e.target.value }))}
                className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">URL do Logo</label>
              <input value={empresaConfig.logo_url || ''} onChange={e => setEmpresaConfig(c => ({ ...c, logo_url: e.target.value }))}
                className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Título Sidebar</label>
              <input value={visualConfig.titulo_sidebar || ''} onChange={e => setVisualConfig(c => ({ ...c, titulo_sidebar: e.target.value }))}
                placeholder="Raio do Sol"
                className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Subtítulo Sidebar</label>
              <input value={visualConfig.subtitulo_sidebar || ''} onChange={e => setVisualConfig(c => ({ ...c, subtitulo_sidebar: e.target.value }))}
                placeholder="Gestão Industrial"
                className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>
          <button onClick={salvarConfig} disabled={salvando}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
            <Save size={15} /> {salvando ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </div>
      )}

      {aba === 'usuarios' && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><Users size={16} /> Usuários do Sistema</h3>
          <div className="space-y-3">
            {usuarios.map(u => (
              <div key={u.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-foreground">{u.full_name || u.email}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
                <select value={u.role || ''} onChange={e => alterarRole(u.id, e.target.value)}
                  className="border border-border rounded-lg px-2 py-1.5 text-xs bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="">Sem role</option>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            ))}
            {usuarios.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum usuário encontrado.</p>}
          </div>
        </div>
      )}
    </div>
  );
}