import { Clock, Package, CheckCircle, Truck, Ban, FileText, AlertTriangle, Zap, Eye, ArrowRight, Tag, Globe, Bolt } from 'lucide-react';
import { DestinoBadge } from './DestinoPedido';

const STATUS_CONFIG = {
  rascunho:           { label: 'Rascunho',       color: '#64748B', bg: '#F8FAFC', icon: FileText },
  aguardando_estoque: { label: 'Ag. Estoque',    color: '#F59E0B', bg: '#FFFBEB', icon: Clock },
  separacao:          { label: 'Em Separação',   color: '#3B82F6', bg: '#EFF6FF', icon: Package },
  separado:           { label: 'Separado',       color: '#22C55E', bg: '#F0FDF4', icon: CheckCircle },
  expedido:           { label: 'Expedido',       color: '#F97316', bg: '#FFF7ED', icon: Truck },
  entregue:           { label: 'Entregue',       color: '#10B981', bg: '#F0FDF4', icon: CheckCircle },
  cancelado:          { label: 'Cancelado',      color: '#EF4444', bg: '#FFF5F5', icon: Ban },
};

function fmtVal(v) {
  return `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

export default function PedidoKanbanCard({
  pedido, statusEfetivo, ocultarValores,
  readonly, onVerDetalhes, onExpedir, onCancelar, onProcessarBling, onAvancarSeparado, onProcessarPortal,
}) {
  const st = STATUS_CONFIG[statusEfetivo] || STATUS_CONFIG.rascunho;
  const Icon = st.icon;
  const itensTruncados = (pedido.itens || []).slice(0, 2);
  const maisItens = (pedido.itens || []).length - 2;
  const isPortal = pedido.origem === 'portal';
  const isBling = (pedido.observacoes || '').includes('[bling_id:') || pedido.origem === 'bling';

  return (
    <div
      className="bg-white rounded-2xl border border-border shadow-sm hover:shadow-md transition-all cursor-pointer group"
      style={{ borderLeft: `4px solid ${st.color}` }}
      onClick={() => onVerDetalhes(pedido)}
    >
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-muted-foreground">{pedido.numero || 'Rascunho'}</span>
              {isPortal && (
                <span className="inline-flex items-center gap-1 text-[10px] bg-sky-100 text-sky-700 border border-sky-200 px-1.5 py-0.5 rounded-full font-bold">
                  <Globe size={8} /> PORTAL
                </span>
              )}
              {isBling && (
                <span className="inline-flex items-center gap-1 text-[10px] bg-orange-100 text-orange-700 border border-orange-200 px-1.5 py-0.5 rounded-full font-bold">
                  <Zap size={8} /> BLING
                </span>
              )}
              {pedido.white_label && (
                <span className="inline-flex items-center gap-1 text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-bold">
                  <Tag size={8} /> WL
                </span>
              )}
            </div>
            <p className="text-sm font-bold text-foreground mt-0.5 truncate">{pedido.cliente_nome}</p>
            {pedido.white_label && pedido.white_label_marca && (
              <p className="text-[10px] text-purple-600 font-medium truncate">→ {pedido.white_label_marca}</p>
            )}
          </div>
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: st.bg }}>
              <Icon size={14} style={{ color: st.color }} />
            </div>
          </div>
        </div>

        {/* Itens */}
        {itensTruncados.length > 0 && (
          <div className="space-y-1">
            {itensTruncados.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground truncate flex-1 mr-2">{item.produto_nome}</span>
                <span className="font-medium text-foreground flex-shrink-0">{item.quantidade}×</span>
              </div>
            ))}
            {maisItens > 0 && (
              <p className="text-[10px] text-muted-foreground">+{maisItens} mais item(s)</p>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50">
          <span className="text-sm font-bold text-foreground">
            {ocultarValores ? '••••••' : fmtVal(pedido.valor_total)}
          </span>
          <div className="flex items-center gap-2">
            {statusEfetivo === 'rascunho' && pedido.data_pedido && (
              <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded flex items-center gap-1 font-mono">
                <Clock size={9} /> {new Date(pedido.data_pedido + 'T12:00:00').toLocaleDateString('pt-BR')}
              </span>
            )}
            {pedido.data_entrega_prevista && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Clock size={9} /> {new Date(pedido.data_entrega_prevista + 'T12:00:00').toLocaleDateString('pt-BR')}
              </span>
            )}
          </div>
        </div>

        {/* Destino */}
        {pedido.destino_tipo && (
          <DestinoBadge pedido={pedido} />
        )}

        {/* Observações */}
        {pedido.observacoes && !pedido.observacoes.includes('[bling_id:') && (
          <div className="text-[11px] bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-lg px-2 py-1.5 flex items-start gap-1">
            <span className="flex-shrink-0 mt-0.5">📝</span>
            <span className="line-clamp-2 leading-snug">{pedido.observacoes}</span>
          </div>
        )}

        {/* Alertas */}
        {statusEfetivo === 'aguardando_estoque' && (
          <div className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 rounded-lg px-2 py-1.5 flex items-center gap-1">
            <AlertTriangle size={9} /> Aguardando produção
          </div>
        )}

        {/* Ações rápidas */}
        {!readonly && (
          <div className="flex gap-1.5 flex-wrap" onClick={e => e.stopPropagation()}>
            {statusEfetivo === 'rascunho' && isPortal && onProcessarPortal && (
              <button onClick={() => onProcessarPortal(pedido)}
                className="flex items-center gap-1 text-[10px] bg-sky-600 text-white border border-sky-600 px-2 py-1 rounded-lg font-semibold hover:bg-sky-700 transition-colors">
                <Globe size={9} /> Processar
              </button>
            )}
            {statusEfetivo === 'rascunho' && !isPortal && (
              <button onClick={() => onProcessarBling(pedido)}
                className="flex items-center gap-1 text-[10px] bg-primary text-primary-foreground border border-primary px-2 py-1 rounded-lg font-semibold hover:opacity-90 transition-opacity">
                <Zap size={9} /> Processar
              </button>
            )}
            {statusEfetivo === 'separacao' && onAvancarSeparado && (
              <button onClick={() => onAvancarSeparado(pedido)}
                className="flex items-center gap-1 text-[10px] bg-green-100 text-green-700 border border-green-200 px-2 py-1 rounded-lg font-semibold hover:bg-green-200 transition-colors">
                <ArrowRight size={9} /> Separado
              </button>
            )}
            {statusEfetivo === 'separado' && (
              <button onClick={() => onExpedir(pedido)}
                className="flex items-center gap-1 text-[10px] bg-orange-100 text-orange-700 border border-orange-200 px-2 py-1 rounded-lg font-semibold hover:bg-orange-200 transition-colors">
                <Truck size={9} /> Expedir
              </button>
            )}
            {!['expedido', 'cancelado', 'separado', 'entregue', 'separacao', 'aguardando_estoque'].includes(statusEfetivo) && (
              <button onClick={() => onCancelar(pedido.id, pedido.numero)}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-red-600 border border-border px-2 py-1 rounded-lg hover:border-red-200 hover:bg-red-50 transition-colors">
                <Ban size={9} /> Cancelar
              </button>
            )}
            <button onClick={() => onVerDetalhes(pedido)}
              className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground border border-border px-2 py-1 rounded-lg hover:bg-muted transition-colors">
              <Eye size={9} /> Ver
            </button>
          </div>
        )}
      </div>
    </div>
  );
}