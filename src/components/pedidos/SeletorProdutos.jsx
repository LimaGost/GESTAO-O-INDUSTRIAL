import { useState, useMemo } from 'react';
import { Search, Plus, Minus, X, AlertTriangle, Package } from 'lucide-react';

export default function SeletorProdutos({ produtos, itens, onChange }) {
  const [busca, setBusca] = useState('');

  const produtosFiltrados = useMemo(() => {
    const b = busca.toLowerCase().trim();
    if (!b) return produtos;
    return produtos.filter(p =>
      (p.codigo || '').toLowerCase().includes(b) ||
      (p.nome || '').toLowerCase().includes(b) ||
      (p.categoria || '').toLowerCase().includes(b)
    );
  }, [produtos, busca]);

  const mapaItens = useMemo(() => {
    const m = {};
    itens.forEach(it => { if (it.produto_id) m[it.produto_id] = it; });
    return m;
  }, [itens]);

  const addOuIncrement = (produto) => {
    const existing = mapaItens[produto.id];
    if (existing) {
      onChange(itens.map(it =>
        it.produto_id === produto.id
          ? { ...it, quantidade: it.quantidade + 1, total: (it.quantidade + 1) * it.preco_unitario }
          : it
      ));
    } else {
      onChange([...itens, {
        produto_id: produto.id, produto_nome: produto.nome, quantidade: 1,
        unidade: produto.unidade || 'unidade', preco_unitario: produto.preco_unitario || produto.preco || 0,
        total: produto.preco_unitario || produto.preco || 0,
      }]);
    }
  };

  const setQuantidade = (produto_id, qty) => {
    if (qty <= 0) onChange(itens.filter(it => it.produto_id !== produto_id));
    else onChange(itens.map(it => it.produto_id === produto_id ? { ...it, quantidade: qty, total: qty * it.preco_unitario } : it));
  };

  const setPreco = (produto_id, preco) => {
    onChange(itens.map(it => it.produto_id === produto_id ? { ...it, preco_unitario: preco, total: it.quantidade * preco } : it));
  };

  const removeItem = (produto_id) => onChange(itens.filter(it => it.produto_id !== produto_id));

  const categorias = useMemo(() => {
    const cats = [...new Set(produtosFiltrados.map(p => p.categoria || 'Outros'))];
    return cats.sort();
  }, [produtosFiltrados]);

  return (
    <div className="space-y-4">
      {/* Busca */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={busca} onChange={e => setBusca(e.target.value)} autoFocus
          placeholder="Buscar por código, nome ou categoria..."
          className="w-full border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
        {busca && (
          <button onClick={() => setBusca('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X size={13} />
          </button>
        )}
      </div>

      {/* Catálogo */}
      <div className="max-h-80 overflow-y-auto space-y-4 border border-border rounded-xl p-3">
        {produtosFiltrados.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhum produto encontrado</p>
        ) : (
          categorias.map(cat => {
            const prods = produtosFiltrados.filter(p => (p.categoria || 'Outros') === cat);
            return (
              <div key={cat}>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 px-1">{cat}</p>
                <div className="space-y-1.5">
                  {prods.map(p => {
                    const item = mapaItens[p.id];
                    const estoque = p.estoque_atual || 0;
                    const semEstoque = item && estoque < item.quantidade;
                    const ficaAbaixoMin = item && estoque >= item.quantidade && (estoque - item.quantidade) < (p.estoque_minimo || 0);

                    return (
                      <div key={p.id}
                        className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${item ? 'border-primary/30 bg-primary/5' : 'border-border hover:bg-muted/30'} ${semEstoque ? 'border-red-200 bg-red-50/50' : ''}`}
                        onClick={() => !item && addOuIncrement(p)}
                      >
                        {/* Foto placeholder */}
                        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          {p.foto_url
                            ? <img src={p.foto_url} alt={p.nome} className="w-full h-full object-cover rounded-lg" />
                            : <Package size={14} className="text-muted-foreground" />
                          }
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-medium text-muted-foreground">{p.codigo}</p>
                            {semEstoque && <AlertTriangle size={11} className="text-red-500" />}
                            {ficaAbaixoMin && <AlertTriangle size={11} className="text-amber-500" />}
                          </div>
                          <p className="text-sm font-medium text-foreground truncate">{p.nome}</p>
                          <p className="text-xs text-muted-foreground">Est: {estoque}{(p.preco_unitario || p.preco) > 0 && ` · R$ ${(p.preco_unitario || p.preco).toFixed(2)}`}</p>
                        </div>

                        {/* Controles */}
                        {item ? (
                          <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                            <button onClick={() => setQuantidade(p.id, item.quantidade - 1)}
                              className="w-7 h-7 rounded-lg bg-muted hover:bg-muted/70 flex items-center justify-center font-bold">
                              <Minus size={12} />
                            </button>
                            <input type="number" value={item.quantidade} onChange={e => setQuantidade(p.id, Number(e.target.value))}
                              className="w-10 text-center border border-border rounded-lg text-sm font-bold py-1 bg-background text-foreground focus:outline-none" />
                            <button onClick={() => setQuantidade(p.id, item.quantidade + 1)}
                              className="w-7 h-7 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 flex items-center justify-center font-bold">
                              <Plus size={12} />
                            </button>
                            <button onClick={() => removeItem(p.id)} className="w-7 h-7 rounded-lg hover:bg-red-100 flex items-center justify-center ml-0.5 transition-colors">
                              <X size={12} className="text-muted-foreground hover:text-red-500" />
                            </button>
                          </div>
                        ) : (
                          <button onClick={e => { e.stopPropagation(); addOuIncrement(p); }}
                            className="w-8 h-8 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground flex items-center justify-center transition-all flex-shrink-0">
                            <Plus size={15} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Resumo */}
      {itens.length > 0 && (
        <div className="bg-muted/30 rounded-xl p-4 space-y-2">
          <p className="text-sm font-semibold text-foreground">Itens selecionados ({itens.length})</p>
          {itens.map((item) => {
            const p = produtos.find(pr => pr.id === item.produto_id);
            const estoque = p?.estoque_atual || 0;
            const semEstoque = estoque < item.quantidade;
            return (
              <div key={item.produto_id} className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{item.produto_nome}</p>
                  {semEstoque && <p className="text-[10px] text-amber-600">⚠️ Estoque insuficiente — gerará OP</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{item.quantidade} ×</span>
                  <input type="number" step="0.01" value={item.preco_unitario} onChange={e => setPreco(item.produto_id, Number(e.target.value))}
                    className="w-20 border border-border rounded-lg px-2 py-1 text-xs bg-background text-foreground text-right focus:outline-none focus:ring-1 focus:ring-primary" />
                  <span className="text-xs font-bold text-foreground">= R$ {(item.total || 0).toFixed(2)}</span>
                  <button onClick={() => removeItem(item.produto_id)} className="p-1 hover:bg-red-100 rounded-lg transition-colors">
                    <X size={12} className="text-muted-foreground hover:text-red-500" />
                  </button>
                </div>
              </div>
            );
          })}
          <div className="flex justify-end border-t border-border pt-2">
            <p className="text-sm font-bold text-foreground">Total: R$ {itens.reduce((s, it) => s + (it.total || 0), 0).toFixed(2)}</p>
          </div>
        </div>
      )}
    </div>
  );
}