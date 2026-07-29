import { SORT_OPTIONS } from '@/lib/ordenacaoCards';

export default function OrdenarPor({ valor, onChange, label = 'Ordenar por' }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1.5">{label}</p>
      <div className="flex gap-1.5 flex-wrap">
        {SORT_OPTIONS.map(opt => (
          <button key={opt.key} onClick={() => onChange(opt.key)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${valor === opt.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}