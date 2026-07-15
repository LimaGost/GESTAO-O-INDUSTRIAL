import { KANBANS } from '@/lib/kanbanFluxo';

// Campo inline de parâmetro dentro da frase da regra (estilo Trello)
export default function ParamInput({ def, value, onChange, etapas }) {
  const cls = 'border border-border rounded-md px-2 py-1 text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary';

  if (def.tipo === 'kanban') {
    return (
      <select value={value || ''} onChange={e => onChange(e.target.value)} className={cls}>
        <option value="">Kanban atual</option>
        {KANBANS.map(k => <option key={k.key} value={k.key}>{k.label.replace('Kanban de ', '')}</option>)}
      </select>
    );
  }
  if (def.tipo === 'etapa') {
    return (
      <select value={value || ''} onChange={e => onChange(e.target.value)} className={cls}>
        <option value="">{def.placeholder || 'Etapa...'}</option>
        {(etapas || []).map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
      </select>
    );
  }
  if (def.tipo === 'opcoes') {
    return (
      <select value={value ?? def.default ?? ''} onChange={e => onChange(e.target.value)} className={cls}>
        {(def.opcoes || []).map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    );
  }
  if (def.tipo === 'numero') {
    return (
      <input type="number" min="0" value={value ?? def.default ?? ''}
        onChange={e => onChange(Number(e.target.value))}
        className={`${cls} w-16 text-center`} />
    );
  }
  return (
    <input value={value || ''} onChange={e => onChange(e.target.value)}
      placeholder={def.placeholder || '...'}
      className={`${cls} w-40`} />
  );
}