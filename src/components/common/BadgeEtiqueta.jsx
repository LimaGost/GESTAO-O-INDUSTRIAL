import { useState, useRef, useEffect } from 'react';
import { Tags } from 'lucide-react';

/**
 * Selo de etiqueta da etapa (geração ou impressão), com dica contextual.
 * variante="card" → badge compacto no card · variante="coluna" → legenda no cabeçalho.
 */
export default function BadgeEtiqueta({ etiqueta, variante = 'card' }) {
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

  if (!etiqueta) return null;

  const abrir = () => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    setPos({ top: r.bottom + 6, left: Math.min(Math.max(12, r.left), window.innerWidth - 260) });
  };

  return (
    <>
      <span
        ref={ref}
        onMouseEnter={abrir}
        onMouseLeave={() => setPos(null)}
        onClick={(e) => { e.stopPropagation(); pos ? setPos(null) : abrir(); }}
        className={`inline-flex items-center gap-1 rounded font-bold flex-shrink-0 cursor-help ${variante === 'coluna' ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-1.5 py-0.5'}`}
        style={{ background: etiqueta.bg, color: etiqueta.cor, border: `1px solid ${etiqueta.border}` }}>
        <Tags size={variante === 'coluna' ? 9 : 10} />
        {variante === 'coluna' ? etiqueta.label.toUpperCase() : etiqueta.curto}
      </span>

      {pos && (
        <div className="fixed z-[60] w-60 rounded-xl px-3 py-2 shadow-xl border pointer-events-none"
          style={{ top: pos.top, left: pos.left, background: '#fff', borderColor: etiqueta.border }}>
          <p className="text-[11px] font-bold mb-0.5" style={{ color: etiqueta.cor }}>{etiqueta.label}</p>
          <p className="text-[10px] text-muted-foreground leading-snug">{etiqueta.descricao}</p>
        </div>
      )}
    </>
  );
}