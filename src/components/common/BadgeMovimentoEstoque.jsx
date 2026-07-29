import { useState, useRef, useEffect } from 'react';
import { PackagePlus, PackageMinus } from 'lucide-react';

/**
 * Selo de movimentação de estoque da etapa (entrada ou saída).
 * variante="card"   → badge compacto no card
 * variante="coluna" → legenda no cabeçalho da coluna
 * Ambos abrem uma dica contextual (hover no desktop, toque no mobile).
 */
export default function BadgeMovimentoEstoque({ movimento, variante = 'card' }) {
  const [pos, setPos] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    if (!pos) return;
    const fechar = () => setPos(null);
    window.addEventListener('scroll', fechar, true);
    window.addEventListener('resize', fechar);
    return () => {
      window.removeEventListener('scroll', fechar, true);
      window.removeEventListener('resize', fechar);
    };
  }, [pos]);

  if (!movimento) return null;
  const Icon = movimento.tipo === 'entrada' ? PackagePlus : PackageMinus;

  const abrir = () => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    setPos({ top: r.bottom + 6, left: Math.min(Math.max(12, r.left), window.innerWidth - 260) });
  };

  const handlers = {
    onMouseEnter: abrir,
    onMouseLeave: () => setPos(null),
    onClick: (e) => { e.stopPropagation(); pos ? setPos(null) : abrir(); },
  };

  return (
    <>
      <span
        ref={ref}
        {...handlers}
        className={`inline-flex items-center gap-1 rounded font-bold flex-shrink-0 cursor-help ${variante === 'coluna' ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-1.5 py-0.5'}`}
        style={{ background: movimento.bg, color: movimento.cor, border: `1px solid ${movimento.border}` }}>
        <Icon size={variante === 'coluna' ? 9 : 10} />
        {variante === 'coluna' ? movimento.label.toUpperCase() : movimento.curto}
      </span>

      {pos && (
        <div className="fixed z-[60] w-60 rounded-xl px-3 py-2 shadow-xl border pointer-events-none"
          style={{ top: pos.top, left: pos.left, background: '#fff', borderColor: movimento.border }}>
          <p className="text-[11px] font-bold mb-0.5" style={{ color: movimento.cor }}>{movimento.label}</p>
          <p className="text-[10px] text-muted-foreground leading-snug">{movimento.descricao}</p>
        </div>
      )}
    </>
  );
}