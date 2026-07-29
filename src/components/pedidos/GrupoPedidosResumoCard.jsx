import { useState } from 'react';
import { ExternalLink, X, Package, Hash, Layers } from 'lucide-react';

const fmtData = (iso) => iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : null;
const qtdPedido = (p) => (p.itens || []).reduce((s, i) => s + (i.quantidade || 0), 0);

/**
 * Card único (consolidado) para pedidos agrupados no Kanban de Pedidos.
 * Fora: cliente, pedidos com data, totais somados e valor consolidado.
 * "Ver Detalhes" abre pop-up com itens somados e acesso a cada pedido individual.
 */
export default function GrupoPedidosResumoCard({ grupo, pedidos, accent = '#7C3AED', ocultarValores, onVerPedido }) {
  const [aberto, setAberto] = useState(false);

  const totalUn = pedidos.reduce((s, p) => s + qtdPedido(p), 0);
  const totalItens = pedidos.reduce((s, p) => s + (p.itens?.length || 0), 0);
  const totalValor = pedidos.reduce((s, p) => s + (p.valor_total || 0), 0);

  const itensSomados = Object.values(pedidos.reduce((acc, p) => {
    for (const it of (p.itens || [])) {
      const k = it.produto_nome || '—';
      if (!acc[k]) acc[k] = { nome: k, quantidade: 0 };
      acc[k].quantidade += it.quantidade || 0;
    }
    return acc;
  }, {}));

  return (
    <div className="border border-violet-300 rounded-2xl overflow-hidden bg-white">
      <div className="px-3 py-2 bg-violet-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Layers size={12} className="text-violet-700 flex-shrink-0" />
          <span className="text-sm font-bold text-violet-900 truncate">{grupo.cliente_nome}</span>
        </div>
        <span className="text-[10px] bg-violet-200 text-violet-700 px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0">
          {pedidos.length} pedido{pedidos.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="px-3 pt-2.5 pb-3 space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {pedidos.map((p) => (
            <div key={p.id} className="rounded-lg border border-blue-200 bg-blue-50 px-2 py-1">
              <p className="text-[11px] font-semibold text-blue-700 leading-tight">{p.numero}</p>
              {fmtData(p.created_date) && <p className="text-[9px] text-blue-500 leading-tight">{fmtData(p.created_date)}</p>}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><Hash size={10} />{totalItens} itens</span>
          <span className="flex items-center gap-1 font-semibold text-foreground"><Package size={10} />{totalUn} un</span>
        </div>

        <p className="text-base font-bold text-foreground">
          {ocultarValores ? '••••••' : `R$ ${totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
        </p>

        <button onClick={() => setAberto(true)}
          className="w-full py-1.5 rounded-xl text-xs font-semibold border border-violet-200 text-violet-700 hover:bg-violet-50 transition-colors flex items-center justify-center gap-1.5">
          <ExternalLink size={12} /> Ver Detalhes ({pedidos.length})
        </button>
      </div>

      {aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setAberto(false)}>
          <div onClick={(e) => e.stopPropagation()}
            className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl max-h-[88vh] flex flex-col">

            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border flex-shrink-0">
              <div className="min-w-0">
                <p className="font-bold text-foreground truncate">{grupo.cliente_nome}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {pedidos.length} pedidos juntos · {totalItens} itens · {totalUn} un
                </p>
              </div>
              <button onClick={() => setAberto(false)} className="p-1.5 hover:bg-muted rounded-lg flex-shrink-0">
                <X size={16} className="text-muted-foreground" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4">
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="px-3 py-2 bg-muted/50 flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Itens somados do grupo</span>
                  <span className="text-xs font-semibold text-muted-foreground">{totalUn} un</span>
                </div>
                <div className="divide-y divide-border/50">
                  {itensSomados.map((it) => (
                    <div key={it.nome} className="flex items-center justify-between gap-2 px-3 py-2">
                      <span className="text-xs text-foreground truncate">{it.nome}</span>
                      <span className="text-xs font-bold text-foreground flex-shrink-0">{it.quantidade} un</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-bold text-foreground">Pedidos do grupo</p>
                {pedidos.map((p) => (
                  <button key={p.id}
                    onClick={() => { setAberto(false); onVerPedido?.(p); }}
                    className="w-full flex items-center justify-between gap-2 border border-border rounded-xl px-3 py-2 hover:bg-muted/50 transition-colors text-left">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-blue-700">{p.numero}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {qtdPedido(p)} un {!ocultarValores && `· R$ ${(p.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                      </p>
                    </div>
                    <ExternalLink size={12} className="text-muted-foreground flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>

            {!ocultarValores && (
              <div className="px-5 py-3 border-t border-border flex-shrink-0 flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Total do grupo</span>
                <span className="text-base font-bold" style={{ color: accent }}>
                  R$ {totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}