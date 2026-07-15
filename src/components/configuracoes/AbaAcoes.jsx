import { useEffect, useState } from 'react';
import { Zap, Plus, Trash2, Save, Lock, RotateCcw } from 'lucide-react';
import { loadConfig, saveConfig } from '@/lib/appConfig';
import { KANBANS, getAcoesSistema } from '@/lib/kanbanFluxo';

// Gerenciador de ações customizadas de etapa — salvas em AppConfig 'acoes_etapa_custom'
export default function AbaAcoes() {
  const [acoes, setAcoes] = useState([]);
  const [overrides, setOverrides] = useState({});
  const [sistemaKanbans, setSistemaKanbans] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadConfig('acoes_etapa_custom').then(val => {
      setAcoes(Array.isArray(val?.acoes) ? val.acoes : []);
      setOverrides(val?.overrides && typeof val.overrides === 'object' ? val.overrides : {});
      setSistemaKanbans(val?.sistema_kanbans && typeof val.sistema_kanbans === 'object' ? val.sistema_kanbans : {});
      setLoading(false);
    });
  }, []);

  // Alterna a disponibilidade de uma ação do sistema em um kanban
  const toggleSistemaKanban = (acaoKey, defaultKanbans, kanbanKey) => {
    setSistemaKanbans(prev => {
      const atual = prev[acaoKey] || defaultKanbans;
      const set = new Set(atual);
      set.has(kanbanKey) ? set.delete(kanbanKey) : set.add(kanbanKey);
      return { ...prev, [acaoKey]: [...set] };
    });
  };

  const addAcao = () => {
    setAcoes(prev => [...prev, {
      key: `acao_${Date.now().toString(36)}`,
      label: '',
      kanbans: KANBANS.map(k => k.key),
    }]);
  };

  const updateAcao = (idx, field, val) =>
    setAcoes(prev => prev.map((a, i) => i === idx ? { ...a, [field]: val } : a));

  const toggleKanban = (idx, kanbanKey) =>
    setAcoes(prev => prev.map((a, i) => {
      if (i !== idx) return a;
      const set = new Set(a.kanbans || []);
      set.has(kanbanKey) ? set.delete(kanbanKey) : set.add(kanbanKey);
      return { ...a, kanbans: [...set] };
    }));

  const removeAcao = (idx) => setAcoes(prev => prev.filter((_, i) => i !== idx));

  const salvar = async () => {
    setSaving(true);
    const validas = acoes.filter(a => (a.label || '').trim());
    // Mantém apenas renomeações que diferem do nome padrão
    const sistema = getAcoesSistema();
    const defaults = Object.fromEntries(sistema.map(a => [a.key, a.label]));
    const ovLimpo = {};
    for (const [k, v] of Object.entries(overrides)) {
      const t = (v || '').trim();
      if (t && t !== defaults[k]) ovLimpo[k] = t;
    }
    // Mantém apenas atribuições de kanban que diferem do padrão
    const kanbansDefault = Object.fromEntries(sistema.map(a => [a.key, [...a.kanbans].sort().join(',')]));
    const skLimpo = {};
    for (const [k, v] of Object.entries(sistemaKanbans)) {
      if (Array.isArray(v) && [...v].sort().join(',') !== kanbansDefault[k]) skLimpo[k] = v;
    }
    await saveConfig('acoes_etapa_custom', { acoes: validas, overrides: ovLimpo, sistema_kanbans: skLimpo });
    setAcoes(validas);
    setOverrides(ovLimpo);
    setSistemaKanbans(skLimpo);
    window.dispatchEvent(new Event('acoes:saved'));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) return <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">Carregando ações...</div>;

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center gap-4 px-6 py-5 border-b border-border">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
            <Zap size={20} className="text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-base text-foreground">Ações de Etapa</p>
            <p className="text-xs text-muted-foreground">
              Crie ações personalizadas para usar no campo "Ação ao entrar" das etapas na Gestão de Fluxos.
            </p>
          </div>
          <button onClick={addAcao}
            className="flex items-center gap-1.5 text-xs font-semibold text-primary border border-primary/30 bg-primary/5 px-3 py-2 rounded-lg hover:bg-primary/10 transition-colors flex-shrink-0">
            <Plus size={13} /> Nova ação
          </button>
        </div>

        <div className="px-6 py-5 space-y-3">
          {/* Ações padrão do sistema (fixas) */}
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Ações do sistema <span className="normal-case font-normal tracking-normal">— o comportamento é fixo, mas você pode renomear</span></p>
          <div className="space-y-1.5">
            {getAcoesSistema().map(acao => (
              <div key={acao.key} className="flex items-center gap-2.5 bg-muted/50 rounded-xl px-3.5 py-2.5 border border-border/50">
                <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <Lock size={12} className="text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0 flex items-center gap-1.5">
                  <input
                    value={overrides[acao.key] ?? acao.label}
                    onChange={e => setOverrides(o => ({ ...o, [acao.key]: e.target.value }))}
                    className="flex-1 min-w-0 border border-transparent hover:border-border focus:border-border rounded-lg px-2 py-1 text-sm bg-transparent focus:bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-colors" />
                  {overrides[acao.key] !== undefined && overrides[acao.key] !== acao.label && (
                    <button onClick={() => setOverrides(o => { const n = { ...o }; delete n[acao.key]; return n; })}
                      title="Restaurar nome padrão"
                      className="p-1 text-muted-foreground hover:text-foreground rounded flex-shrink-0">
                      <RotateCcw size={12} />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-wrap justify-end">
                  {KANBANS.map(k => {
                    const ativos = sistemaKanbans[acao.key] || acao.kanbans;
                    const on = ativos.includes(k.key);
                    return (
                      <button key={k.key} onClick={() => toggleSistemaKanban(acao.key, acao.kanbans, k.key)}
                        className={`text-[10px] px-2 py-0.5 rounded-full border font-medium transition-all ${on ? 'text-white border-transparent' : 'bg-background text-muted-foreground border-border hover:bg-muted'}`}
                        style={on ? { background: k.cor } : {}}>
                        {k.label.replace('Kanban de ', '')}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pt-2">Ações personalizadas</p>
          {acoes.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-muted-foreground/60 bg-muted/30 rounded-xl">
              <Zap size={24} className="mb-2 opacity-40" />
              <p className="text-xs">Nenhuma ação personalizada. Clique em "Nova ação" para criar.</p>
            </div>
          ) : (
            acoes.map((acao, idx) => (
              <div key={acao.key} className="bg-muted/30 rounded-xl p-3.5 border border-border/60 space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Zap size={13} className="text-primary" />
                  </div>
                  <input
                    value={acao.label}
                    onChange={e => updateAcao(idx, 'label', e.target.value)}
                    placeholder="Nome da ação (ex: Notificar gerente, Reservar estoque...)"
                    className="flex-1 border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50" />
                  <button onClick={() => removeAcao(idx)}
                    className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors flex-shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="pl-9 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-muted-foreground">Disponível nos kanbans:</span>
                  {KANBANS.map(k => {
                    const on = (acao.kanbans || []).includes(k.key);
                    return (
                      <button key={k.key} onClick={() => toggleKanban(idx, k.key)}
                        className={`text-[10px] px-2 py-0.5 rounded-full border font-medium transition-all ${on ? 'text-white border-transparent' : 'bg-background text-muted-foreground border-border hover:bg-muted'}`}
                        style={on ? { background: k.cor } : {}}>
                        {k.label.replace('Kanban de ', '')}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}

          <div className="border-t border-border pt-4 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">As ações ficam disponíveis no seletor "Ação ao entrar" de cada etapa.</p>
            <button onClick={salvar} disabled={saving}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${saved ? 'bg-green-500 text-white' : 'bg-primary text-primary-foreground hover:opacity-90'} disabled:opacity-50`}>
              <Save size={14} /> {saved ? 'Salvo!' : saving ? 'Salvando...' : 'Salvar Ações'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}