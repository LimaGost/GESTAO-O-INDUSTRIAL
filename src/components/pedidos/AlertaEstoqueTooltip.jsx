import { useState, useRef, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * Ícone de alerta com explicação em popup.
 * Desktop: abre ao passar o mouse. Touch (celular/tablet): abre ao toque e fecha ao tocar fora ou rolar.
 * Renderizado em posição fixa para não ser cortado por containers com scroll.
 */
const TEXTOS = {
  sem_estoque: {
    titulo: 'Estoque insuficiente',
    texto: 'A quantidade pedida é maior que o estoque disponível. O sistema vai reservar o que existe e gerar uma Ordem de Produção para o restante.',
    cor: 'text-red-500',
  },
  abaixo_minimo: {
    titulo: 'Ficará abaixo do mínimo',
    texto: 'Há estoque para atender o pedido, mas depois da baixa o saldo fica abaixo do estoque mínimo cadastrado para este produto.',
    cor: 'text-amber-500',
  },
};

export default function AlertaEstoqueTooltip({ tipo }) {
  const info = TEXTOS[tipo];
  const ref = useRef(null);
  const [pos, setPos] = useState(null);

  const fechar = () => setPos(null);

  const mostrar = () => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const largura = Math.min(260, window.innerWidth - 24);
    const left = Math.min(
      Math.max(12, r.left + r.width / 2 - largura / 2),
      window.innerWidth - largura - 12
    );
    const abaixo = r.top < 150;
    setPos({ left, top: abaixo ? r.bottom + 8 : r.top - 8, abaixo, largura });
  };

  useEffect(() => {
    if (!pos) return;
    window.addEventListener('scroll', fechar, true);
    window.addEventListener('resize', fechar);
    return () => {
      window.removeEventListener('scroll', fechar, true);
      window.removeEventListener('resize', fechar);
    };
  }, [pos]);

  if (!info) return null;

  return (
    <>
      <span
        ref={ref}
        className="inline-flex items-center justify-center p-1 -m-1 touch-manipulation"
        onClick={e => { e.stopPropagation(); pos ? fechar() : mostrar(); }}
        onMouseEnter={mostrar}
        onMouseLeave={fechar}
      >
        <AlertTriangle size={13} className={`${info.cor} cursor-help`} />
      </span>
      {pos && (
        <>
          {/* camada para fechar ao tocar fora (mobile) */}
          <div className="fixed inset-0 z-[99] md:hidden" onClick={e => { e.stopPropagation(); fechar(); }} />
          <div
            className="fixed z-[100] pointer-events-none bg-foreground text-background text-xs leading-snug rounded-lg px-3 py-2 shadow-xl"
            style={{
              left: pos.left,
              top: pos.top,
              width: pos.largura,
              transform: pos.abaixo ? 'none' : 'translateY(-100%)',
            }}
          >
            <span className="block font-bold mb-0.5">{info.titulo}</span>
            {info.texto}
          </div>
        </>
      )}
    </>
  );
}