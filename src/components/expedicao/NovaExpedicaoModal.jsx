import { useState, useMemo } from 'react';
import { X, Truck, AlertCircle, FileText, Plus } from 'lucide-react';

export default function NovaExpedicaoModal({ pedidos, expedicoes = [], loading, onCriar, onClose }) {
  const [pedidoId, setPedidoId] = useState('');
  const [transportadora, setTransportadora] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [quantidades, setQuantidades] = useState({});
  const [destinoNF, setDestinoNF] = useState('nova'); // 'nova' | id de expedição existente

  const pedidoSel = pedidos.find(p => p.id === pedidoId);

  // Quantidade já expedida por produto para o pedido selecionado
  const jaExpedido = useMemo(() => {
    const m = {};
    if (!pedidoId) return m;
    for (const e of expedicoes.filter(e => e.pedido_id === pedidoId)) {
      for (const i of (e.itens || [])) {
        const k = i.produto_id || i.produto_nome;
        m[k] = (m[k] || 0) + (i.quantidade || 0);
      }
    }
    return m;
  }, [pedidoId, expedicoes]);

  const itensPedido = (pedidoSel?.itens || []).map(i => {
    const k = i.produto_id || i.produto_nome;
    const restante = Math.max(0, (i.quantidade || 0) - (jaExpedido[k] || 0));
    return { ...i, _key: k, restante };
  });

  const getQtd = (item) => quantidades[item._key] !== undefined ? quantidades[item._key] : item.restante;

  const itensSelecionados = itensPedido
    .map(i => ({
      produto_id: i.produto_id || null,
      produto_nome: i.produto_nome,
      quantidade: Math.min(Math.max(0, Number(getQtd(i)) || 0), i.restante),
    }))
    .filter(i => i.quantidade > 0);

  const totalSelecionado = itensSelecionados.reduce((s, i) => s + i.quantidade, 0);
  const totalRestante = itensPedido.reduce((s, i) => s + i.restante, 0);
  const parcial = totalSelecionado < totalRestante;

  const nfsExistentes = expedicoes.filter(e => e.status === 'emitida');

  const handleSubmit = () => {
    if (!pedidoId) return alert('Selecione um pedido.');
    if (itensSelecionados.length === 0) return alert('Informe a quantidade de ao menos um item.');
    onCriar({
      pedidoId, transportadora, observacoes,
      itens: itensSelecionados,
      expedicaoExistenteId: destinoNF === 'nova' ? null : destinoNF,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <Truck size={18} className="text-primary" />
            <h3 className="font-bold text-foreground">Nova NF / Expedição</h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2 text-xs text-blue-700">
            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
            <span>Selecione os produtos e quantidades a expedir. É possível fazer <strong>expedições parciais</strong> e vincular itens a uma NF já emitida.</span>
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
                <select value={pedidoId}
                  onChange={e => { setPedidoId(e.target.value); setQuantidades({}); setDestinoNF('nova'); }}
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="">Selecione o pedido...</option>
                  {pedidos.map(p => (
                    <option key={p.id} value={p.id}>{p.nome || p.cliente_nome} • {p.numero} — R$ {(p.valor_total || 0).toFixed(2)}</option>
                  ))}
                </select>
              </div>

              {pedidoSel && (
                <>
                  {/* Itens com seleção de quantidade */}
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Itens e quantidades a expedir</label>
                    <div className="space-y-1.5">
                      {itensPedido.map((item, i) => (
                        <div key={i} className={`flex items-center gap-2 border rounded-xl px-3 py-2 ${item.restante === 0 ? 'border-border bg-muted/40 opacity-60' : 'border-border bg-background'}`}>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">{item.produto_nome}</p>
                            <p className="text-[10px] text-muted-foreground">
                              Pedido: {item.quantidade} un{jaExpedido[item._key] ? ` · Já expedido: ${jaExpedido[item._key]}` : ''} · Restante: {item.restante}
                            </p>
                          </div>
                          {item.restante > 0 ? (
                            <input type="number" min="0" max={item.restante}
                              value={getQtd(item)}
                              onChange={e => setQuantidades(q => ({ ...q, [item._key]: e.target.value }))}
                              className="w-16 text-center text-sm font-bold border border-border rounded-lg py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary" />
                          ) : (
                            <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold flex-shrink-0">✓ Expedido</span>
                          )}
                        </div>
                      ))}
                    </div>
                    {parcial && totalSelecionado > 0 && (
                      <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mt-2 font-medium">
                        ⚠️ Expedição parcial: {totalSelecionado} de {totalRestante} un restantes. O pedido permanecerá pendente até expedir tudo.
                      </p>
                    )}
                  </div>

                  {/* Nova NF ou vincular a existente */}
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Nota Fiscal</label>
                    <div className="space-y-1.5">
                      <button onClick={() => setDestinoNF('nova')}
                        className={`w-full flex items-center gap-2 border rounded-xl px-3 py-2.5 text-sm text-left transition-colors ${destinoNF === 'nova' ? 'border-primary bg-primary/5 font-semibold text-foreground' : 'border-border text-muted-foreground hover:bg-muted/30'}`}>
                        <Plus size={14} className={destinoNF === 'nova' ? 'text-primary' : ''} /> Criar nova NF
                      </button>
                      {nfsExistentes.map(nf => (
                        <button key={nf.id} onClick={() => setDestinoNF(nf.id)}
                          className={`w-full flex items-center gap-2 border rounded-xl px-3 py-2.5 text-sm text-left transition-colors ${destinoNF === nf.id ? 'border-primary bg-primary/5 font-semibold text-foreground' : 'border-border text-muted-foreground hover:bg-muted/30'}`}>
                          <FileText size={14} className={destinoNF === nf.id ? 'text-primary' : ''} />
                          <span className="truncate">Vincular à NF {nf.numero_nf} — {nf.cliente_nome}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
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
                <button onClick={handleSubmit} disabled={loading || !pedidoId || itensSelecionados.length === 0}
                  className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity">
                  {loading ? 'Processando...' : destinoNF === 'nova' ? `Emitir NF (${totalSelecionado} un)` : `Vincular à NF (${totalSelecionado} un)`}
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