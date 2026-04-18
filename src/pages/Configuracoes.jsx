import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { SlidersHorizontal, Save, Users, Plus, X, CheckSquare } from 'lucide-react';

export default function Configuracoes() {
  const [empresaConfig, setEmpresaConfig] = useState({ nome: 'Raio do Sol', logo_url: '' });
  const [visualConfig, setVisualConfig] = useState({ titulo_sidebar: '', subtitulo_sidebar: '' });
  const [usuarios, setUsuarios] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [aba, setAba] = useState('empresa');

  // Checklist configs
  const ETAPAS = [
    { key: 'a_produzir', label: 'A Produzir' },
    { key: 'em_producao', label: 'Em Produção' },
    { key: 'produzido', label: 'Produzido' },
    { key: 'em_embalagem', label: 'Em Embalagem' },
  ];
  const [checklists, setChecklists] = useState({ a_produzir: [], em_producao: [], produzido: [], em_embalagem: [] });
  const [novosItens, setNovosItens] = useState({ a_produzir: '', em_producao: '', produzido: '', em_embalagem: '' });
  const [salvandoChecklist, setSalvandoChecklist] = useState(false);

  useEffect(() => {
    try { setEmpresaConfig(JSON.parse(localStorage.getItem('empresa_config') || '{}')); } catch {}
    try { setVisualConfig(JSON.parse(localStorage.getItem('visual_config') || '{}')); } catch {}
    base44.entities.User.list().then(setUsuarios).catch(() => {});
    // Carregar checklists por etapa
    base44.entities.ChecklistConfig.list().then(configs => {
      const map = { a_produzir: [], em_producao: [], produzido: [], em_embalagem: [] };
      for (const c of configs) { if (map[c.etapa] !== undefined) map[c.etapa] = c.itens || []; }
      setChecklists(map);
    }).catch(() => {});
  }, []);

  const salvarConfig = () => {
    setSalvando(true);
    localStorage.setItem('empresa_config', JSON.stringify(empresaConfig));
    localStorage.setItem('visual_config', JSON.stringify(visualConfig));
    window.dispatchEvent(new Event('settings:saved'));
    setTimeout(() => setSalvando(false), 800);
  };

  const salvarChecklist = async () => {
    setSalvandoChecklist(true);
    const configs = await base44.entities.ChecklistConfig.list().catch(() => []);
    for (const etapa of ['a_produzir', 'em_producao', 'produzido', 'em_embalagem']) {
      const existing = configs.find(c => c.etapa === etapa);
      if (existing) {
        await base44.entities.ChecklistConfig.update(existing.id, { itens: checklists[etapa] });
      } else {
        await base44.entities.ChecklistConfig.create({ etapa, itens: checklists[etapa] });
      }
    }
    setSalvandoChecklist(false);
    alert('Checklists salvos com sucesso!');
  };

  const adicionarItem = (etapa) => {
    const val = novosItens[etapa].trim();
    if (!val) return;
    setChecklists(prev => ({ ...prev, [etapa]: [...prev[etapa], val] }));
    setNovosItens(prev => ({ ...prev, [etapa]: '' }));
  };

  const removerItem = (etapa, idx) => {
    setChecklists(prev => ({ ...prev, [etapa]: prev[etapa].filter((_, i) => i !== idx) }));
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
        {[['empresa', '🏢 Empresa'], ['checklist', '✅ Checklist Produção'], ['usuarios', '👥 Usuários']].map(([key, label]) => (
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

      {aba === 'checklist' && (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">Configure os itens de checklist obrigatórios para cada etapa do Kanban de Produção. O operador precisará marcar todos antes de avançar a ordem.</p>
          {ETAPAS.map(({ key, label }) => (
            <div key={key} className="bg-card border border-border rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <CheckSquare size={15} className="text-primary" />
                <h3 className="font-semibold text-foreground">{label}</h3>
                <span className="text-xs text-muted-foreground">({checklists[key].length} item{checklists[key].length !== 1 ? 's' : ''})</span>
              </div>
              <div className="space-y-2">
                {checklists[key].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-muted/30 rounded-xl px-3 py-2">
                    <CheckSquare size={13} className="text-muted-foreground flex-shrink-0" />
                    <span className="text-sm text-foreground flex-1">{item}</span>
                    <button onClick={() => removerItem(key, idx)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                ))}
                {checklists[key].length === 0 && (
                  <p className="text-xs text-muted-foreground italic py-1">Nenhum item configurado — o checklist não será exibido nesta etapa.</p>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  value={novosItens[key]}
                  onChange={e => setNovosItens(prev => ({ ...prev, [key]: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && adicionarItem(key)}
                  placeholder={`Ex: Verificar temperatura, Lavar equipamentos...`}
                  className="flex-1 border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button onClick={() => adicionarItem(key)}
                  className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
                  <Plus size={14} /> Adicionar
                </button>
              </div>
            </div>
          ))}
          <button onClick={salvarChecklist} disabled={salvandoChecklist}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
            <Save size={15} /> {salvandoChecklist ? 'Salvando...' : 'Salvar Checklists'}
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