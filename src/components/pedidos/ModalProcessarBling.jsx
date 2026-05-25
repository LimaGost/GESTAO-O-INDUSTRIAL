import { useState, useEffect } from 'react';
import { X, Link2, AlertTriangle, CheckCircle, Package } from 'lucide-react';

export default function ModalProcessarBling({ pedido, produtos, onConfirmar, onClose, loading }) {
  const [itensVinculados, setItensVinculados] = useState([]);

  useEffect(() => {
    const itens = (pedido.itens || []).map(item => {
      // Auto-match pelo nome exato
      const match = produtos.find(p => p.nome?.toLowerCase() === item.produto_nome?.toLowerCase());
      return {
        ...item,
        produto_id_vinculado: match?.id || '',
        produto_nome_bling: item.produto_nome,
      };
    });
    setItensVinculados(itens);
  }, [pedido, produtos]);

  const setVinculo = (idx, produtoId) => {
    const prod = produtos.find(p => p.id === produtoId);
    setItensVinculados(prev => prev.map((it, i) =>
      i === idx ? { ...it, produto_id_vinculado: produtoId, produto_nome: prod?.nome || it.produto_nome_bling } : it
    ));
  };

  const todosVinculados = itensVinculados.every(i => i.produto_id_vinculado);

  const handleConfirmar = () => {
    const itens = itensVinculados.map(i => ({
      produto_id: i.produto_id_vinculado,
      produto_nome: i.produto_nome,
      quantidade: i.quantidade,
      preco_unitario: i.preco_unitario || 0,
      total: i.total || 0,
    }));
    onConfirmar(itens);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Link2 size={17} className="text-primary" />
            </div>
            <div>
              <p className="font-bold text-foreground">Processar Pedido Bling</p>
              <p className="text-xs text-muted-foreground">{pedido.numero} · {pedido.cliente_nome}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        {/* Itens */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <p className="text-xs text-muted-foreground mb-1">Vincule cada item do Bling a um produto cadastrado no sistema:</p>
          
          {itensVinculados.map((item, idx) => {
            const prodVinculado = produtos.find(p => p.id === item.produto_id_vinculado);
            const estoqueOk = prodVinculado && (prodVinculado.estoque_atual || 0) >= item.quantidade;
            
            return (
              <div key={idx} className="bg-muted/40 border border-border rounded-xl p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Produto no Bling:</p>
                    <p className="text-sm font-medium text-foreground">{item.produto_nome_bling}</p>
                    <p className="text-xs text-muted-foreground">Qtd: <strong>{item.quantidade}</strong></p>
                  </div>
                  {item.produto_id_vinculado && (
                    <div className="text-right">
                      {estoqueOk
                        ? <span className="text-xs text-rainbow-green flex items-center gap-1"><CheckCircle size={11} /> Estoque OK ({prodVinculado.estoque_atual})</span>
                        : <span className="text-xs text-amber-600 flex items-center gap-1"><AlertTriangle size={11} /> Estoque insuf. ({prodVinculado?.estoque_atual || 0})</span>
                      }
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Produto no sistema:</label>
                  <select
                    value={item.produto_id_vinculado}
                    onChange={e => setVinculo(idx, e.target.value)}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">— Selecione um produto —</option>
                    {produtos.filter(p => p.ativo !== false).map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nome} (estoque: {p.estoque_atual || 0})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}

          {!todosVinculados && (
            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
              <AlertTriangle size={13} /> Vincule todos os itens antes de processar.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-border flex gap-3">
          <button
            onClick={handleConfirmar}
            disabled={!todosVinculados || loading}
            className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            <Package size={14} />
            {loading ? 'Processando...' : 'Processar Pedido'}
          </button>
          <button onClick={onClose} className="px-5 border border-border rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}