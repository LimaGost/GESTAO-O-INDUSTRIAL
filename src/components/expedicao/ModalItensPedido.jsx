import { X, Package, Calendar, User, Truck, MapPin, Tag, FileText, DollarSign } from 'lucide-react';
import { DestinoBadge } from '@/components/pedidos/DestinoPedido';

const STATUS_LABEL = {
  rascunho:           { label: 'Rascunho',       bg: 'bg-slate-100',   color: 'text-slate-600' },
  aguardando_estoque: { label: 'Ag. Estoque',    bg: 'bg-amber-100',   color: 'text-amber-700' },
  separacao:          { label: 'Em Separação',   bg: 'bg-blue-100',    color: 'text-blue-700' },
  separado:           { label: 'Separado',       bg: 'bg-green-100',   color: 'text-green-700' },
  expedido:           { label: 'Expedido',       bg: 'bg-orange-100',  color: 'text-orange-700' },
  entregue:           { label: 'Entregue',       bg: 'bg-emerald-100', color: 'text-emerald-700' },
  cancelado:          { label: 'Cancelado',      bg: 'bg-red-100',     color: 'text-red-700' },
};

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d.includes('T') ? d : d + 'T12:00:00').toLocaleDateString('pt-BR');
}

function fmtR(v) {
  return `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

export default function ModalItensPedido({ pedido, onClose }) {
  const itens = pedido?.itens || [];
  const st = STATUS_LABEL[pedido?.status] || STATUS_LABEL.rascunho;
  const totalItens = itens.reduce((s, i) => s + (i.quantidade || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[88vh]"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileText size={16} className="text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-bold text-foreground">{pedido?.numero ? `Pedido #${pedido.numero}` : 'Pedido'}</p>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${st.bg} ${st.color}`}>{st.label}</span>
              </div>
              <p className="text-xs text-muted-foreground">{pedido?.cliente_nome}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-xl transition-colors">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Informações gerais */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-muted/30 rounded-xl p-3">
              <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1"><Calendar size={9} /> Data do Pedido</p>
              <p className="text-sm font-semibold text-foreground">{fmtDate(pedido?.data_pedido)}</p>
            </div>
            <div className="bg-muted/30 rounded-xl p-3">
              <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1"><Calendar size={9} /> Entrega Prevista</p>
              <p className="text-sm font-semibold text-foreground">{fmtDate(pedido?.data_entrega_prevista)}</p>
            </div>
            <div className="bg-muted/30 rounded-xl p-3">
              <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1"><Package size={9} /> Total de Itens</p>
              <p className="text-sm font-semibold text-foreground">{totalItens} unidades</p>
            </div>
            <div className="bg-muted/30 rounded-xl p-3">
              <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1"><DollarSign size={9} /> Valor Total</p>
              <p className="text-sm font-semibold text-primary">{fmtR(pedido?.valor_total)}</p>
            </div>
          </div>

          {/* Destino */}
          {pedido?.destino_tipo && (
            <div className="bg-muted/30 rounded-xl p-3 space-y-1.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1"><MapPin size={9} /> Destino</p>
              <DestinoBadge pedido={pedido} className="text-xs px-2.5 py-1" />
              {pedido.destino_tipo === 'entrega_cliente' && pedido.destino_endereco && (
                <p className="text-xs text-muted-foreground">📍 {pedido.destino_endereco}</p>
              )}
              {pedido.destino_tipo === 'retirada_unidade' && pedido.destino_unidade && (
                <p className="text-xs text-muted-foreground">🏢 {pedido.destino_unidade}</p>
              )}
              {pedido.destino_tipo === 'transportadora' && pedido.destino_transportadora && (
                <p className="text-xs text-muted-foreground">🚛 {pedido.destino_transportadora}</p>
              )}
            </div>
          )}

          {/* White Label */}
          {pedido?.white_label && (
            <div className="flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-xl px-3 py-2">
              <Tag size={12} className="text-purple-600 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-purple-700">Pedido White Label</p>
                {pedido.white_label_marca && <p className="text-xs text-purple-600">{pedido.white_label_marca}</p>}
              </div>
            </div>
          )}

          {/* Observações */}
          {pedido?.observacoes && (
            <div className="bg-muted/30 rounded-xl p-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Observações</p>
              <p className="text-sm text-foreground">{pedido.observacoes}</p>
            </div>
          )}

          {/* Itens */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
              <Package size={9} /> {itens.length} produto(s)
            </p>
            {itens.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum item registrado.</p>
            ) : (
              <div className="space-y-2">
                {itens.map((item, i) => {
                  const total = (item.preco_unitario || item.valor_unitario || 0) * item.quantidade;
                  return (
                    <div key={i} className="flex items-center justify-between bg-muted/40 border border-border rounded-xl px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{item.produto_nome}</p>
                        {(item.preco_unitario || item.valor_unitario) > 0 && (
                          <p className="text-xs text-muted-foreground">unit. {fmtR(item.preco_unitario || item.valor_unitario)}</p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <p className="text-sm font-bold text-primary">{item.quantidade} un</p>
                        {total > 0 && <p className="text-xs text-muted-foreground">{fmtR(total)}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
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