import { useState, useRef, useEffect } from 'react';
import { ICONES, getIcon } from '@/lib/kanbanFluxo';

// Seletor visual de ícones (popover com grade) para as etapas do Kanban.
export default function IconPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const CurrentIcon = getIcon(value);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 border border-border rounded-lg px-2 py-1.5 text-xs bg-background text-foreground hover:bg-muted transition-colors w-28 justify-start"
        title="Trocar ícone"
      >
        <CurrentIcon size={14} className="text-foreground" />
        <span className="truncate flex-1 text-left">{value}</span>
      </button>

      {open && (
        <div className="absolute z-30 mt-1 bg-card border border-border rounded-xl shadow-lg p-2 w-56">
          <div className="grid grid-cols-6 gap-1 max-h-48 overflow-y-auto">
            {ICONES.map(name => {
              const Icon = getIcon(name);
              const ativo = name === value;
              return (
                <button
                  key={name}
                  type="button"
                  title={name}
                  onClick={() => { onChange(name); setOpen(false); }}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all ${ativo ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                >
                  <Icon size={15} />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}