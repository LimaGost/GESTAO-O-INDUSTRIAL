import { X, Package } from 'lucide-react';

export default function ModalItensPedido({ pedido, onClose }) {
  const itens = pedido?.itens || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[80vh]"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Package size={16} className="text-primary" />
            </div>
            <div>
              <p className="font-bold text-foreground">{pedido?.numero || 'Pedido'}</p>
              <p className="text-xs text-muted-foreground">{pedido?.cliente_nome}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-xl transition-colors">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        {/* Itens */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            {itens.length} item(s) a entregar
          </p>
          {itens.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum item registrado.</p>
          ) : itens.map((item, i) => (
            <div key={i} className="flex items-center justify-between bg-muted/40 border border-border rounded-xl px-4 py-3">
              <p className="text-sm font-medium text-foreground">{item.produto_nome}</p>
              <span className="text-sm font-bold text-primary ml-4 flex-shrink-0">{item.quantidade} un</span>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 border-t border-border flex-shrink-0">
          <button onClick={onClose}
            className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}