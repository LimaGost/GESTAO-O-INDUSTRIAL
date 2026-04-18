import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

export default function SeletorProdutos({ produtos, itens, onChange }) {
  const addItem = () => {
    onChange([...itens, { produto_id: '', produto_nome: '', quantidade: 1, preco_unitario: 0, total: 0 }]);
  };

  const removeItem = (idx) => {
    onChange(itens.filter((_, i) => i !== idx));
  };

  const updateItem = (idx, field, value) => {
    const novos = itens.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: value };
      if (field === 'produto_id') {
        const p = produtos.find(p => p.id === value);
        updated.produto_nome = p ? p.nome : '';
        updated.preco_unitario = p ? (p.preco || 0) : 0;
        updated.total = updated.preco_unitario * (updated.quantidade || 0);
      }
      if (field === 'quantidade') {
        updated.total = (updated.preco_unitario || 0) * Number(value);
      }
      return updated;
    });
    onChange(novos);
  };

  const totalGeral = itens.reduce((s, i) => s + (i.total || 0), 0);

  return (
    <div className="space-y-3">
      {itens.map((item, idx) => (
        <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-muted/30 rounded-xl p-3">
          <div className="col-span-5">
            <select value={item.produto_id} onChange={e => updateItem(idx, 'produto_id', e.target.value)}
              className="w-full border border-border rounded-lg px-2 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="">Selecione...</option>
              {produtos.map(p => <option key={p.id} value={p.id}>{p.nome} (est: {p.estoque_atual || 0})</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <input type="number" min="1" value={item.quantidade}
              onChange={e => updateItem(idx, 'quantidade', Number(e.target.value))}
              className="w-full border border-border rounded-lg px-2 py-2 text-sm bg-background text-foreground text-center focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div className="col-span-2">
            <input type="number" step="0.01" value={item.preco_unitario}
              onChange={e => updateItem(idx, 'preco_unitario', Number(e.target.value))}
              className="w-full border border-border rounded-lg px-2 py-2 text-sm bg-background text-foreground text-center focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div className="col-span-2 text-sm font-medium text-foreground text-right">
            R$ {(item.total || 0).toFixed(2)}
          </div>
          <div className="col-span-1 flex justify-center">
            <button onClick={() => removeItem(idx)} className="text-muted-foreground hover:text-destructive transition-colors">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}

      <div className="flex items-center justify-between">
        <button onClick={addItem}
          className="flex items-center gap-2 text-sm text-primary hover:underline font-medium">
          <Plus size={14} /> Adicionar item
        </button>
        {itens.length > 0 && (
          <p className="text-sm font-bold text-foreground">
            Total: R$ {totalGeral.toFixed(2)}
          </p>
        )}
      </div>
    </div>
  );
}