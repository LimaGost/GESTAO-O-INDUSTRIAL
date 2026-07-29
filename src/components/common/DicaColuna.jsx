import { useState, useRef, useEffect } from 'react';
import { Info } from 'lucide-react';
import { dicaEtapa } from '@/lib/dicaEtapa';

/**
 * Dica contextual da coluna do Kanban: explica o que acontece ao mover um card
 * para esta etapa (ações automáticas) e qual é a próxima etapa.
 * Abre no hover (desktop) e no toque (mobile), em popup fixo para não ser cortado.
 */
export default function DicaColuna({ coluna, kanbanKey, proximoLabel, accent = '#64748B' }) {
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

  const dica = dicaEtapa(coluna, kanbanKey, proximoLabel);

  const abrir = () => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    setPos({ top: r.bottom + 6, left: Math.min(Math.max(12, r.left - 120), window.innerWidth - 272) });
  };

  return (
    <>
      <button
        ref={ref}
        type="button"
        aria-label={`Dica da etapa ${dica.titulo}`}
        onMouseEnter={abrir}
        onMouseLeave={() => setPos(null)}
        onClick={(e) => { e.stopPropagation(); pos ? setPos(null) : abrir(); }}
        className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity">
        <Info size={12} style={{ color: accent }} />
      </button>

      {pos && (
        <div className="fixed z-[60] w-64 rounded-xl px-3 py-2.5 shadow-xl border border-border bg-white pointer-events-none"
          style={{ top: pos.top, left: pos.left }}>
          <p className="text-[11px] font-bold text-foreground mb-1">{dica.titulo}</p>
          {dica.acoes.length > 0 ? (
            <ul className="space-y-1 mb-1">
              {dica.acoes.map((a, i) => (
                <li key={i} className="text-[10px] text-muted-foreground leading-snug flex gap-1">
                  <span style={{ color: accent }}>•</span>{a}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[10px] text-muted-foreground leading-snug mb-1">Nenhuma ação automática ao entrar nesta etapa.</p>
          )}
          {dica.proximo && (
            <p className="text-[10px] font-semibold pt-1 border-t border-border" style={{ color: accent }}>
              Próxima etapa: {dica.proximo}
            </p>
          )}
        </div>
      )}
    </>
  );
}