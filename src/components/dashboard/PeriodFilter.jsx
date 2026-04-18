import { Calendar } from 'lucide-react';

const PRESETS = [
  { key: 'all', label: 'Tudo' },
  { key: 'today', label: 'Hoje' },
  { key: 'week', label: '7 dias' },
  { key: 'month', label: '30 dias' },
  { key: 'custom', label: 'Personalizado' },
];

function getRange(preset) {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  if (preset === 'today') return { from: today, to: today };
  if (preset === 'week') {
    const d = new Date(now); d.setDate(d.getDate() - 7);
    return { from: d.toISOString().split('T')[0], to: today };
  }
  if (preset === 'month') {
    const d = new Date(now); d.setDate(d.getDate() - 30);
    return { from: d.toISOString().split('T')[0], to: today };
  }
  return { from: '', to: '' };
}

export default function PeriodFilter({ value, onChange }) {
  const handlePreset = (key) => {
    const range = getRange(key);
    onChange({ preset: key, ...range });
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Calendar size={14} className="text-muted-foreground" />
      <div className="flex gap-1.5 flex-wrap">
        {PRESETS.map(p => (
          <button key={p.key} onClick={() => handlePreset(p.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${value.preset === p.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
            {p.label}
          </button>
        ))}
      </div>
      {value.preset === 'custom' && (
        <div className="flex items-center gap-2">
          <input type="date" value={value.from} onChange={e => onChange({ ...value, from: e.target.value })}
            className="border border-border rounded-lg px-2 py-1 text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
          <span className="text-xs text-muted-foreground">até</span>
          <input type="date" value={value.to} onChange={e => onChange({ ...value, to: e.target.value })}
            className="border border-border rounded-lg px-2 py-1 text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
      )}
    </div>
  );
}