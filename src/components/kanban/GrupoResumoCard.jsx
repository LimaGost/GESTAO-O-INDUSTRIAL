import { useState } from 'react';
import { ExternalLink, X, Package, Hash, Layers } from 'lucide-react';

const qtdDaOrdem = (o) => (o.itens?.length > 0 ? o.itens.reduce((s, i) => s + (i.quantidade || 0), 0) : (o.quantidade || 0));
const fmtData = (iso) => iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : null;

/**
 * Card único (consolidado) para pedidos agrupados.
 * Fora: apenas cliente, os pedidos com a data abaixo de cada um e os totais somados.
 * "Ver Detalhes" expande e mostra os cards individuais de cada pedido.
 */
export default function GrupoResumoCard({ grupo, ordens, accent = '#7C3AED', children }) {
  const [aberto, setAberto] = useState(false);

  const totalUn = ordens.reduce((s, o) => s + qtdDaOrdem(o), 0);
  const totalItens = ordens.reduce((s, o) => s + (o.itens?.length || 1), 0);

  // Um bloco por pedido do grupo, com a data logo abaixo do número
  const pedidos = (grupo.pedidos_numeros || []).map((num) => {
    const op = ordens.find((o) => o.pedido_numero === num);
    return { numero: num, data: fmtData(op?.created_date) };
  });

  return (
    <div className="border border-violet-300 rounded-2xl overflow-hidden mb-1.5 bg-white">
      <div className="px-3 py-2 bg-violet-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Layers size={12} className="text-violet-700 flex-shrink-0" />
          <span className="text-sm font-bold text-violet-900 truncate">{grupo.cliente_nome}</span>
        </div>
        <span className="text-[10px] bg-violet-200 text-violet-700 px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0">
          {ordens.length} pedido{ordens.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="px-3 pt-2.5 pb-3 space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {pedidos.map((p) => (
            <div key={p.numero} className="rounded-lg border border-blue-200 bg-blue-50 px-2 py-1">
              <p className="text-[11px] font-semibold text-blue-700 leading-tight">PED-{p.numero.replace(/^PED-/, '')}</p>
              {p.data && <p className="text-[9px] text-blue-500 leading-tight">{p.data}</p>}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><Hash size={10} />{totalItens} itens</span>
          <span className="flex items-center gap-1 font-semibold text-foreground"><Package size={10} />{totalUn} un</span>
        </div>

        <button onClick={() => setAberto(true)}
          className="w-full py-1.5 rounded-xl text-xs font-semibold border border-violet-200 text-violet-700 hover:bg-violet-50 transition-colors flex items-center justify-center gap-1.5">
          <ExternalLink size={12} /> Ver Detalhes ({ordens.length})
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
                  {ordens.length} pedido{ordens.length !== 1 ? 's' : ''} agrupado{ordens.length !== 1 ? 's' : ''} · {totalItens} itens · {totalUn} un
                </p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {pedidos.map((p) => (
                    <span key={p.numero} className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded font-medium">
                      PED-{p.numero.replace(/^PED-/, '')}{p.data ? ` · ${p.data}` : ''}
                    </span>
                  ))}
                </div>
              </div>
              <button onClick={() => setAberto(false)} className="p-1.5 hover:bg-muted rounded-lg flex-shrink-0">
                <X size={16} className="text-muted-foreground" />
              </button>
            </div>
            <div className="p-3 overflow-y-auto space-y-2.5 bg-violet-50/30">{children}</div>
          </div>
        </div>
      )}
    </div>
  );
}