const fmtR = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
const fmtD = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—';

export default function FranqueadoCard({ pedido, accent, onClick }) {
  return (
    <button onClick={onClick}
      className="w-full text-left bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden"
      style={{ border: `1.5px solid ${accent}55`, borderLeft: `4px solid ${accent}` }}>
      <div className="px-3.5 py-3 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">#{pedido.numero}</p>
            <p className="text-sm font-bold text-foreground leading-tight truncate">{pedido.franqueado}</p>
          </div>
          {pedido.alterado && (
            <span className="text-[9px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-bold flex-shrink-0">Alterado</span>
          )}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          <span>📅 {fmtD(pedido.data)}</span>
          <span>📦 {pedido.quantidade_itens} item(ns)</span>
          {pedido.nf && <span>🧾 NF {pedido.nf}</span>}
        </div>
        <p className="text-sm font-bold" style={{ color: accent }}>{fmtR(pedido.valor_total)}</p>
      </div>
    </button>
  );
}