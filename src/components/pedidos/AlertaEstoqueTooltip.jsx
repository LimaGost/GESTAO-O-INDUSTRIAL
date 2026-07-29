import { AlertTriangle } from 'lucide-react';

/**
 * Ícone de alerta com explicação em popup ao passar o mouse.
 * tipo: 'sem_estoque' (vermelho) | 'abaixo_minimo' (âmbar)
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
  if (!info) return null;
  return (
    <span className="relative inline-flex group/alerta" onClick={e => e.stopPropagation()}>
      <AlertTriangle size={11} className={`${info.cor} cursor-help`} />
      <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover/alerta:block z-50 w-52 bg-foreground text-background text-[11px] leading-snug rounded-lg px-2.5 py-2 shadow-lg">
        <span className="block font-bold mb-0.5">{info.titulo}</span>
        {info.texto}
      </span>
    </span>
  );
}