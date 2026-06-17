import { useState, useEffect } from 'react';
import { X, Globe, AlertTriangle, CheckCircle, Package, Search } from 'lucide-react';

export default function ModalProcessarPortal({ pedido, produtos, onConfirmar, onClose, loading }) {
  const [itensVinculados, setItensVinculados] = useState([]);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    const itens = (pedido.itens || []).map(item => {
      const nomePortal = (item.produto_nome || item.nome || '').toLowerCase().trim();
      // 1. Match por ID exato
      const matchById = produtos.find(p => p.id === item.produto_id);
      // 2. Match por nome exato
      const matchByNome = produtos.find(p => p.nome?.toLowerCase().trim() === nomePortal);
      // 3. Match parcial: nome do catálogo contém o nome do portal ou vice-versa
      const matchParcial = !matchById && !matchByNome
        ? produtos.find(p => {
            const nomeCat = (p.nome || '').toLowerCase().trim();
            return nomeCat.includes(nomePortal) || nomePortal.includes(nomeCat);
          })
        : null;
      const match = matchById || matchByNome || matchParcial;
      const nomeOriginal = item.produto_nome || item.nome || '';
      return {
        ...item,
        produto_id_vinculado: match?.id || '',
        produto_nome_portal: nomeOriginal,
        produto_nome: match?.nome || nomeOriginal,
      };
    });
    setItensVinculados(itens);
  }, [pedido, produtos]);

  const setVinculo = (idx, produtoId) => {
    const prod = produtos.find(p => p.id === produtoId);
    setItensVinculados(prev => prev.map((it, i) =>
      i === idx ? { ...it, produto_id_vinculado: produtoId, produto_nome: prod?.nome || it.produto_nome_portal } : it
    ));
  };

  const todosVinculados = itensVinculados.every(i => i.produto_id_vinculado);

  const handleConfirmar = () => {
    const itens = itensVinculados.map(i => ({
      produto_id: i.produto_id_vinculado,
      produto_nome: i.produto_nome,
      quantidade: i.quantidade,
      preco_unitario: i.preco_unitario || 0,
      total: (i.preco_unitario || 0) * (i.quantidade || 1),
    }));
    onConfirmar(itens);
  };

  const produtosFiltrados = busca.trim()
    ? produtos.filter(p => p.ativo !== false && (p.nome || '').toLowerCase().includes(busca.toLowerCase()))
    : produtos.filter(p => p.ativo !== false);

  const totalItens = itensVinculados.reduce((s, i) => s + (i.quantidade || 0), 0);
  const valorTotal = itensVinculados.reduce((s, i) => s + ((i.preco_unitario || 0) * (i.quantidade || 1)), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-100 flex items-center justify-center">
              <Globe size={17} className="text-sky-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-bold text-foreground">Processar Pedido do Portal</p>
                <span className="text-[10px] bg-sky-100 text-sky-700 border border-sky-200 px-1.5 py-0.5 rounded-full font-bold">PORTAL</span>
              </div>
              <p className="text-xs text-muted-foreground">{pedido.numero} · {pedido.cliente_nome}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        {/* Resumo do pedido */}
        <div className="px-5 pt-4 flex gap-3">
          <div className="flex-1 bg-sky-50 border border-sky-200 rounded-xl px-4 py-2 text-center">
            <p className="text-[10px] text-sky-600 font-semibold">ITENS</p>
            <p className="text-lg font-bold text-sky-800">{totalItens}</p>
          </div>
          <div className="flex-1 bg-sky-50 border border-sky-200 rounded-xl px-4 py-2 text-center">
            <p className="text-[10px] text-sky-600 font-semibold">VALOR</p>
            <p className="text-base font-bold text-sky-800">R$ {valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
          {pedido.data_entrega_prevista && (
            <div className="flex-1 bg-sky-50 border border-sky-200 rounded-xl px-4 py-2 text-center">
              <p className="text-[10px] text-sky-600 font-semibold">ENTREGA</p>
              <p className="text-sm font-bold text-sky-800">{new Date(pedido.data_entrega_prevista + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
            </div>
          )}
        </div>

        {/* Itens para confirmar */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground">Confirme os produtos recebidos do portal e vincule ao catálogo:</p>

          {itensVinculados.map((item, idx) => {
            const prodVinculado = produtos.find(p => p.id === item.produto_id_vinculado);
            const estoqueOk = prodVinculado && (prodVinculado.estoque_atual || 0) >= item.quantidade;
            const autoMatched = !!prodVinculado;

            return (
              <div key={idx} className={`border rounded-xl p-4 space-y-3 ${autoMatched ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                {/* Info do item do portal */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Globe size={10} className="text-sky-500" />
                      <p className="text-[10px] text-sky-600 font-semibold uppercase tracking-wide">Do Portal</p>
                    </div>
                    <p className="text-sm font-bold text-foreground">{item.produto_nome_portal}</p>
                    <p className="text-xs text-muted-foreground">Qtd solicitada: <strong>{item.quantidade}</strong></p>
                    {item.preco_unitario > 0 && (
                      <p className="text-xs text-muted-foreground">Unit.: R$ {(item.preco_unitario || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    {autoMatched ? (
                      <span className="text-[10px] text-green-700 bg-green-100 border border-green-200 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                        <CheckCircle size={9} /> Vinculado
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-700 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                        <AlertTriangle size={9} /> Vincular
                      </span>
                    )}
                    {prodVinculado && (
                      <p className={`text-[10px] mt-1 font-semibold ${estoqueOk ? 'text-green-700' : 'text-red-600'}`}>
                        {estoqueOk ? `✓ Estoque: ${prodVinculado.estoque_atual}` : `⚠ Estoque: ${prodVinculado.estoque_atual || 0}`}
                      </p>
                    )}
                  </div>
                </div>

                {/* Seletor de produto */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Produto no catálogo:</label>
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

          {pedido.observacoes && (
            <div className="bg-muted/40 border border-border rounded-xl px-4 py-3">
              <p className="text-[10px] text-muted-foreground font-semibold mb-1">OBSERVAÇÕES DO CLIENTE</p>
              <p className="text-sm text-foreground">{pedido.observacoes}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-border flex gap-3">
          <button
            onClick={handleConfirmar}
            disabled={!todosVinculados || loading}
            className="flex-1 flex items-center justify-center gap-2 bg-sky-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-sky-700 disabled:opacity-50 transition-colors"
          >
            <Package size={14} />
            {loading ? 'Processando...' : 'Confirmar e Processar'}
          </button>
          <button onClick={onClose} className="px-5 border border-border rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}