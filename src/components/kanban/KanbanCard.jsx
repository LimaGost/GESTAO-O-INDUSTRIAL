import { ChevronRight, Clock, Package } from 'lucide-react';

export default function KanbanCard({ ordem, clienteNome, onAvancar, loading, onOpenModal }) {
  const qtdTotal = ordem.itens?.length > 0
    ? ordem.itens.reduce((s, i) => s + (i.quantidade || 0), 0)
    : (ordem.quantidade || 0);

  return (
    <div className="bg-white border border-border rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-foreground truncate">{ordem.numero || 'OP'}</p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{ordem.produto_nome}</p>
        </div>
        {onOpenModal && (
          <button onClick={onOpenModal} className="text-muted-foreground hover:text-foreground flex-shrink-0">
            <ChevronRight size={14} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
        <span className="flex items-center gap-1"><Package size={10} /> {qtdTotal} un</span>
        {clienteNome && <span className="truncate">{clienteNome}</span>}
      </div>

      {onAvancar && (
        <button
          onClick={() => onAvancar(ordem)}
          disabled={loading}
          className="w-full py-1.5 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
        >
          {loading ? 'Avançando...' : <><ChevronRight size={12} /> Avançar</>}
        </button>
      )}
    </div>
  );
}