import { Check } from 'lucide-react';

/**
 * Seleção de quais itens do pedido serão entregues sem rótulo.
 * itens: array de itens do pedido | onChange: (novosItens) => void
 */
export default function SelecaoItensSemRotulo({ itens = [], onChange }) {
  const todos = itens.length > 0 && itens.every(i => i.sem_rotulo);

  const toggleTodos = () => onChange(itens.map(i => ({ ...i, sem_rotulo: !todos })));
  const toggleItem = (idx) =>
    onChange(itens.map((i, j) => (j === idx ? { ...i, sem_rotulo: !i.sem_rotulo } : i)));

  if (itens.length === 0) {
    return <p className="text-xs text-muted-foreground px-1">Nenhum item no pedido.</p>;
  }

  const Box = ({ marcado }) => (
    <span className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-colors ${
      marcado ? 'bg-teal-500 border-teal-500' : 'bg-background border-border'
    }`}>
      {marcado && <Check size={13} className="text-white" />}
    </span>
  );

  return (
    <div className="border border-teal-200 rounded-xl p-3 space-y-2 bg-teal-50/40">
      <button onClick={toggleTodos} className="flex items-center gap-2.5 w-full text-left">
        <Box marcado={todos} />
        <span className="text-xs font-semibold text-teal-800">Selecionar todos os itens</span>
      </button>
      <div className="border-t border-teal-200/70 pt-2 space-y-1.5 max-h-48 overflow-y-auto">
        {itens.map((item, idx) => (
          <button key={item.produto_id || idx} onClick={() => toggleItem(idx)}
            className="flex items-center gap-2.5 w-full text-left p-1.5 rounded-lg hover:bg-white/60 transition-colors">
            <Box marcado={!!item.sem_rotulo} />
            <span className="text-xs text-foreground flex-1 truncate">{item.produto_nome}</span>
            <span className="text-[10px] text-muted-foreground flex-shrink-0">x{item.quantidade}</span>
          </button>
        ))}
      </div>
    </div>
  );
}