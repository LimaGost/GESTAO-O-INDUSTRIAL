import { X } from 'lucide-react';

const fmtR = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
const fmtD = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—';

const STATUS_LABEL = {
  pendente: '⏳ Pendente',
  aprovado: '✅ Aprovado',
  em_expedicao: '📦 Em Expedição',
  faturado: '🟣 Faturado',
  cancelado: '❌ Cancelado',
};

export default function ModalPedidoFranqueado({ pedido, nomesProdutos, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl shadow-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <h3 className="font-bold text-foreground">Pedido #{pedido.numero} — {pedido.franqueado}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              📅 {fmtD(pedido.data)} · {STATUS_LABEL[pedido.status] || pedido.status}
              {pedido.nf && <> · 🧾 NF <strong className="text-foreground">{pedido.nf}</strong></>}
              {pedido.alterado && <span className="ml-2 text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-bold">Alterado</span>}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground uppercase tracking-wide border-b border-border">
                <th className="pb-2 pr-2">Produto</th>
                <th className="pb-2 px-2 text-right">Qtd</th>
                <th className="pb-2 px-2 text-right">Vlr Unit.</th>
                <th className="pb-2 pl-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {pedido.itens.map((item, i) => (
                <tr key={i} className="border-b border-border/40">
                  <td className="py-2 pr-2 text-foreground">
                    {nomesProdutos[item.cod_produto] || `Produto ${item.cod_produto}`}
                  </td>
                  <td className="py-2 px-2 text-right text-foreground">{item.quantidade}</td>
                  <td className="py-2 px-2 text-right text-muted-foreground">{fmtR(item.valor_unitario)}</td>
                  <td className="py-2 pl-2 text-right font-semibold text-foreground">{fmtR(item.valor_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-border flex items-center justify-between flex-shrink-0">
          <p className="text-xs text-muted-foreground">{pedido.quantidade_itens} item(ns)</p>
          <p className="text-base font-bold text-foreground">Total: {fmtR(pedido.valor_total)}</p>
        </div>
      </div>
    </div>
  );
}