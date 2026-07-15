import { RefreshCw, PackagePlus, Check } from 'lucide-react';

const fmtR = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
const fmtD = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—';

export default function FranqueadoCard({ pedido, accent, onClick, onEnviarSeparacao, enviado, enviando }) {
  return (
    <div onClick={onClick} role="button"
      className="w-full text-left bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden cursor-pointer"
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

      {onEnviarSeparacao && (
        <div className="border-t border-border px-3.5 py-2">
          {enviado ? (
            <span className="flex items-center justify-center gap-1.5 text-xs font-semibold text-teal-600 py-1">
              <Check size={12} /> Enviado p/ Separação
            </span>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onEnviarSeparacao(pedido); }}
              disabled={enviando}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg text-white transition-all disabled:opacity-50"
              style={{ background: '#14B8A6' }}>
              {enviando ? <RefreshCw size={11} className="animate-spin" /> : <PackagePlus size={12} />}
              Enviar p/ Separação
            </button>
          )}
        </div>
      )}
    </div>
  );
}