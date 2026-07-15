import { Plus, Trash2, Lock, RotateCcw } from 'lucide-react';
import { KANBANS } from '@/lib/kanbanFluxo';

// Seção reutilizável: lista itens do sistema (renomeáveis + kanbans configuráveis) e itens personalizados
export default function SecaoRegrasLista({
  titulo, subtitulo, Icone, sistema,
  custom, setCustom, overrides, setOverrides, kanbansMap, setKanbansMap,
  placeholder,
}) {
  const toggleSistemaKanban = (key, defaultKanbans, kanbanKey) => {
    setKanbansMap(prev => {
      const atual = prev[key] || defaultKanbans;
      const set = new Set(atual);
      set.has(kanbanKey) ? set.delete(kanbanKey) : set.add(kanbanKey);
      return { ...prev, [key]: [...set] };
    });
  };

  const addItem = () => setCustom(prev => [...prev, {
    key: `regra_${Date.now().toString(36)}`,
    label: '',
    kanbans: KANBANS.map(k => k.key),
  }]);

  const updateItem = (idx, val) => setCustom(prev => prev.map((a, i) => i === idx ? { ...a, label: val } : a));

  const toggleKanban = (idx, kanbanKey) => setCustom(prev => prev.map((a, i) => {
    if (i !== idx) return a;
    const set = new Set(a.kanbans || []);
    set.has(kanbanKey) ? set.delete(kanbanKey) : set.add(kanbanKey);
    return { ...a, kanbans: [...set] };
  }));

  const removeItem = (idx) => setCustom(prev => prev.filter((_, i) => i !== idx));

  const chips = (ativos, onToggle) => (
    <div className="flex items-center gap-1 flex-wrap justify-end">
      {KANBANS.map(k => {
        const on = ativos.includes(k.key);
        return (
          <button key={k.key} onClick={() => onToggle(k.key)}
            className={`text-[10px] px-2 py-0.5 rounded-full border font-medium transition-all ${on ? 'text-white border-transparent' : 'bg-background text-muted-foreground border-border hover:bg-muted'}`}
            style={on ? { background: k.cor } : {}}>
            {k.label.replace('Kanban de ', '')}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center gap-4 px-6 py-5 border-b border-border">
        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icone size={20} className="text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-bold text-base text-foreground">{titulo}</p>
          <p className="text-xs text-muted-foreground">{subtitulo}</p>
        </div>
        <button onClick={addItem}
          className="flex items-center gap-1.5 text-xs font-semibold text-primary border border-primary/30 bg-primary/5 px-3 py-2 rounded-lg hover:bg-primary/10 transition-colors flex-shrink-0">
          <Plus size={13} /> Novo
        </button>
      </div>

      <div className="px-6 py-5 space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Do sistema <span className="normal-case font-normal tracking-normal">— o comportamento é fixo, mas você pode renomear e escolher os kanbans</span></p>
        <div className="space-y-1.5">
          {sistema.map(item => (
            <div key={item.key} className="flex items-center gap-2.5 bg-muted/50 rounded-xl px-3.5 py-2.5 border border-border/50">
              <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <Lock size={12} className="text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0 flex items-center gap-1.5">
                <input
                  value={overrides[item.key] ?? item.label}
                  onChange={e => setOverrides(o => ({ ...o, [item.key]: e.target.value }))}
                  className="flex-1 min-w-0 border border-transparent hover:border-border focus:border-border rounded-lg px-2 py-1 text-sm bg-transparent focus:bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-colors" />
                {overrides[item.key] !== undefined && overrides[item.key] !== item.label && (
                  <button onClick={() => setOverrides(o => { const n = { ...o }; delete n[item.key]; return n; })}
                    title="Restaurar nome padrão"
                    className="p-1 text-muted-foreground hover:text-foreground rounded flex-shrink-0">
                    <RotateCcw size={12} />
                  </button>
                )}
              </div>
              {chips(kanbansMap[item.key] || item.kanbans, (kk) => toggleSistemaKanban(item.key, item.kanbans, kk))}
            </div>
          ))}
        </div>

        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pt-2">Personalizados</p>
        {custom.length === 0 ? (
          <div className="flex flex-col items-center py-6 text-muted-foreground/60 bg-muted/30 rounded-xl">
            <Icone size={22} className="mb-2 opacity-40" />
            <p className="text-xs">Nenhum item personalizado. Clique em "Novo" para criar.</p>
          </div>
        ) : (
          custom.map((item, idx) => (
            <div key={item.key} className="bg-muted/30 rounded-xl p-3.5 border border-border/60 space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icone size={13} className="text-primary" />
                </div>
                <input
                  value={item.label}
                  onChange={e => updateItem(idx, e.target.value)}
                  placeholder={placeholder}
                  className="flex-1 border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50" />
                <button onClick={() => removeItem(idx)}
                  className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors flex-shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="pl-9 flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-muted-foreground">Disponível nos kanbans:</span>
                {chips(item.kanbans || [], (kk) => toggleKanban(idx, kk))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}