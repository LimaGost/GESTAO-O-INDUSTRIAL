/**
 * Filtro de categorias em chips — reutilizável em qualquer página que liste produtos.
 * categorias: string[] | valor: string ('todas' = sem filtro) | onChange: (cat) => void
 */
export default function FiltroCategorias({ categorias = [], valor = 'todas', onChange, label = 'Categoria' }) {
  if (categorias.length === 0) return null;
  const chip = (ativo) =>
    `px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
      ativo ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
    }`;

  return (
    <div>
      {label && <p className="text-xs text-muted-foreground mb-1.5">{label}</p>}
      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => onChange('todas')} className={chip(valor === 'todas')}>Todas</button>
        {categorias.map((cat) => (
          <button key={cat} onClick={() => onChange(cat)} className={chip(valor === cat)}>{cat}</button>
        ))}
      </div>
    </div>
  );
}