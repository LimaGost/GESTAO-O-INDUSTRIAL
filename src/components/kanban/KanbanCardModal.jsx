import { X, ChevronRight, Package } from 'lucide-react';

export default function KanbanCardModal({ ordem, onAvancar, loading, onClose }) {
  const qtdTotal = ordem.itens?.length > 0
    ? ordem.itens.reduce((s, i) => s + (i.quantidade || 0), 0)
    : (ordem.quantidade || 0);

  const PROXIMOS = {
    a_produzir: 'Em Produção', em_producao: 'Produzido',
    produzido: 'Em Embalagem', em_embalagem: 'Finalizado',
  };
  const proximo = PROXIMOS[ordem.status];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="font-bold text-foreground">{ordem.numero}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-muted/30 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Produto</span>
              <span className="font-medium text-foreground">{ordem.produto_nome}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Quantidade</span>
              <span className="font-medium text-foreground">{qtdTotal} un</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <span className="font-medium text-foreground capitalize">{ordem.status?.replace('_', ' ')}</span>
            </div>
            {ordem.lote && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lote</span>
                <span className="font-medium text-foreground">{ordem.lote}</span>
              </div>
            )}
            {ordem.observacoes && (
              <div>
                <span className="text-muted-foreground">Obs:</span>
                <p className="text-foreground mt-1">{ordem.observacoes}</p>
              </div>
            )}
          </div>

          {ordem.itens?.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Itens</p>
              {ordem.itens.map((item, i) => (
                <div key={i} className="flex justify-between text-sm bg-muted/20 rounded-lg px-3 py-2">
                  <span className="text-foreground">{item.produto_nome}</span>
                  <span className="font-medium text-foreground">{item.quantidade} un</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            {proximo && onAvancar && (
              <button onClick={() => onAvancar(ordem, null)} disabled={loading}
                className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
                <ChevronRight size={15} /> {loading ? 'Avançando...' : `Avançar → ${proximo}`}
              </button>
            )}
            <button onClick={onClose} className="px-4 border border-border rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors">
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}