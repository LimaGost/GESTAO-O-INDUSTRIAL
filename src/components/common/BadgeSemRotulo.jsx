import { Tag } from 'lucide-react';

/**
 * Selo "SEM RÓTULO" — usado nos cards de Produção, Separação e Expedição.
 * size="sm" para uso dentro da linha de um item.
 */
export default function BadgeSemRotulo({ size = 'md' }) {
  if (size === 'sm') {
    return (
      <span className="inline-flex items-center gap-0.5 text-[9px] bg-teal-100 text-teal-700 border border-teal-300 px-1 py-0.5 rounded font-bold flex-shrink-0">
        <Tag size={7} /> SR
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] bg-teal-500 text-white px-2 py-0.5 rounded font-bold flex-shrink-0">
      <Tag size={9} /> SEM RÓTULO
    </span>
  );
}