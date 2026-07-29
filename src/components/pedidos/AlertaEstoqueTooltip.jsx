import { useState, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * Ícone de alerta com explicação em popup ao passar o mouse.
 * O popup é renderizado em posição fixa para não ser cortado por containers com scroll.
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

const LARGURA = 240;

export default function AlertaEstoqueTooltip({ tipo }) {
  const info = TEXTOS[tipo];
  const ref = useRef(null);
  const [pos, setPos] = useState(null);

  if (!info) return null;

  const mostrar = () => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const left = Math.min(
      Math.max(8, r.left + r.width / 2 - LARGURA / 2),
      window.innerWidth - LARGURA - 8
    );
    const abaixo = r.top < 140;
    setPos({ left, top: abaixo ? r.bottom + 8 : r.top - 8, abaixo });
  };

  return (
    <>
      <span ref={ref} className="inline-flex" onClick={e => e.stopPropagation()}
        onMouseEnter={mostrar} onMouseLeave={() => setPos(null)}>
        <AlertTriangle size={11} className={`${info.cor} cursor-help`} />
      </span>
      {pos && (
        <div
          className="fixed z-[100] pointer-events-none bg-foreground text-background text-[11px] leading-snug rounded-lg px-2.5 py-2 shadow-xl"
          style={{
            left: pos.left,
            top: pos.top,
            width: LARGURA,
            transform: pos.abaixo ? 'none' : 'translateY(-100%)',
          }}
        >
          <span className="block font-bold mb-0.5">{info.titulo}</span>
          {info.texto}
        </div>
      )}
    </>
  );
}