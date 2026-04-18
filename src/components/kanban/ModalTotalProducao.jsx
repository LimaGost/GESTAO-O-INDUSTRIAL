import { X, BarChart2 } from 'lucide-react';

export default function ModalTotalProducao({ ordens, onClose }) {
  const STATUS_LABELS = {
    a_produzir: 'A Produzir', em_producao: 'Em Produção',
    produzido: 'Produzido', em_embalagem: 'Em Embalagem', finalizado: 'Finalizado',
  };

  const porStatus = Object.entries(STATUS_LABELS).map(([key, label]) => ({
    label,
    count: ordens.filter(o => o.status === key).length,
    qtd: ordens.filter(o => o.status === key).reduce((s, o) => {
      const q = o.itens?.length > 0 ? o.itens.reduce((a, i) => a + (i.quantidade || 0), 0) : (o.quantidade || 0);
      return s + q;
    }, 0),
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <BarChart2 size={16} className="text-primary" />
            <h3 className="font-bold text-foreground">Total de Produção</h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>
        <div className="p-6 space-y-3">
          {porStatus.map(({ label, count, qtd }) => (
            <div key={label} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
              <span className="text-sm font-medium text-foreground">{label}</span>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-muted-foreground">{count} OP(s)</span>
                <span className="font-bold text-foreground">{qtd} un</span>
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between p-3 bg-primary/10 rounded-xl border border-primary/20 mt-2">
            <span className="text-sm font-bold text-foreground">Total Geral</span>
            <span className="font-bold text-primary">{porStatus.reduce((s, p) => s + p.qtd, 0)} un</span>
          </div>
        </div>
      </div>
    </div>
  );
}