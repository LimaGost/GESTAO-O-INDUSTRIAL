import { useState, useEffect } from 'react';
import { CheckSquare, Square, ChevronDown, ChevronUp } from 'lucide-react';

export default function CardChecklist({ ordemId, itens, onAllChecked, externalDone, readonly }) {
  const storageKey = `checklist_${ordemId}`;
  const [marcados, setMarcados] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey)) || {}; } catch { return {}; }
  });
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (externalDone !== undefined) {
      try { const saved = localStorage.getItem(storageKey); if (saved) setMarcados(JSON.parse(saved)); } catch {}
    }
  }, [externalDone]);

  const total = itens.length;
  const checked = itens.filter((_, i) => marcados[i]).length;
  const allDone = total > 0 && checked === total;

  useEffect(() => { onAllChecked(allDone); }, [allDone, marcados]);

  const toggle = (idx) => {
    const next = { ...marcados, [idx]: !marcados[idx] };
    setMarcados(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  };

  if (total === 0) return null;

  return (
    <div className="rounded-xl overflow-hidden border border-border">
      <button onClick={() => setCollapsed(!collapsed)}
        className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold transition-colors ${allDone ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
        <span className="flex items-center gap-1.5">
          {allDone ? <CheckSquare size={12} /> : <Square size={12} />}
          Checklist — {checked}/{total}
        </span>
        <div className="flex items-center gap-1">
          {!allDone && <span className="text-[9px] bg-amber-200 text-amber-700 px-1.5 rounded-full font-bold">Obrigatório</span>}
          {collapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
        </div>
      </button>
      {!collapsed && (
        <div className="divide-y divide-border/50">
          {itens.map((item, idx) => (
            <button key={idx} onClick={() => !readonly && toggle(idx)} disabled={readonly}
              className={`w-full flex items-center gap-2.5 px-3 py-2 transition-colors text-left ${readonly ? 'cursor-default' : 'hover:bg-muted/50'}`}>
              {marcados[idx]
                ? <CheckSquare size={13} className="text-green-500 flex-shrink-0" />
                : <Square size={13} className="text-muted-foreground flex-shrink-0" />
              }
              <span className={`text-xs ${marcados[idx] ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{item}</span>
            </button>
          ))}
        </div>
      )}
      {!collapsed && !allDone && (
        <div className="px-3 py-1.5 bg-amber-50 text-amber-700 text-[10px] font-medium">Complete todos para avançar</div>
      )}
    </div>
  );
}