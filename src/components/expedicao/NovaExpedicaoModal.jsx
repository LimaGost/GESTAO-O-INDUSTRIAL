import { useState } from 'react';
import { X, Truck, AlertCircle } from 'lucide-react';

export default function NovaExpedicaoModal({ pedidos, loading, onCriar, onClose }) {
  const [pedidoId, setPedidoId] = useState('');
  const [transportadora, setTransportadora] = useState('');
  const [observacoes, setObservacoes] = useState('');

  const pedidoSel = pedidos.find(p => p.id === pedidoId);

  const handleSubmit = () => {
    if (!pedidoId) return alert('Selecione um pedido.');
    onCriar({ pedidoId, transportadora, observacoes });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Truck size={18} className="text-primary" />
            <h3 className="font-bold text-foreground">Nova Expedição</h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2 text-xs text-blue-700">
            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
            <span>Somente pedidos com status <strong>SEPARADO</strong> podem ser expedidos.</span>
          </div>

          {pedidos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Truck size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">Nenhum pedido disponível</p>
              <p className="text-xs mt-1">Pedidos precisam estar separados antes de expedir.</p>
            </div>
          ) : (
            <>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Pedido *</label>
                <select value={pedidoId} onChange={e => setPedidoId(e.target.value)}
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="">Selecione o pedido...</option>
                  {pedidos.map(p => (
                    <option key={p.id} value={p.id}>{p.numero} — {p.cliente_nome} — R$ {(p.valor_total || 0).toFixed(2)}</option>
                  ))}
                </select>
              </div>

              {pedidoSel && (
                <div className="bg-muted/30 rounded-xl p-3 text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="font-semibold text-foreground">{pedidoSel.cliente_nome}</span>
                    <span className="font-bold text-foreground">R$ {(pedidoSel.valor_total || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span>{(pedidoSel.itens || []).length} produto(s)</span>
                    {pedidoSel.data_entrega_prevista && (
                      <span>📅 Entrega: {new Date(pedidoSel.data_entrega_prevista + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                    )}
                  </div>
                  <div className="space-y-1">
                    {(pedidoSel.itens || []).slice(0, 4).map((item, i) => (
                      <div key={i} className="flex justify-between text-xs text-muted-foreground">
                        <span>{item.produto_nome}</span>
                        <span>{item.quantidade} un</span>
                      </div>
                    ))}
                    {(pedidoSel.itens || []).length > 4 && (
                      <p className="text-xs text-muted-foreground/60">+{pedidoSel.itens.length - 4} mais...</p>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Transportadora</label>
                <input value={transportadora} onChange={e => setTransportadora(e.target.value)}
                  placeholder="Nome da transportadora ou entrega própria..."
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Observações</label>
                <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} rows={2}
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={handleSubmit} disabled={loading}
                  className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity">
                  {loading ? 'Criando...' : 'Criar Expedição'}
                </button>
                <button onClick={onClose} className="px-4 border border-border rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors">
                  Cancelar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}