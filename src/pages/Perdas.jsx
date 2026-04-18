import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Trash2, Plus } from 'lucide-react';
import { usePermissoes } from '@/lib/usePermissoes.jsx';

export default function Perdas() {
  const { somenteLeitura } = usePermissoes();
  const readonly = somenteLeitura('Perdas');
  const [perdas, setPerdas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ produto_nome: '', quantidade: 1, motivo: '', data: new Date().toISOString().split('T')[0] });
  const [produtos, setProdutos] = useState([]);

  useEffect(() => {
    Promise.all([
      base44.entities.Perda.list('-created_date'),
      base44.entities.Produto.list(),
    ]).then(([p, pr]) => { setPerdas(p); setProdutos(pr); setLoading(false); });
  }, []);

  const salvar = async () => {
    if (!form.produto_nome || !form.motivo) return alert('Preencha todos os campos.');
    await base44.entities.Perda.create({ ...form, quantidade: Number(form.quantidade) });
    const p = await base44.entities.Perda.list('-created_date');
    setPerdas(p);
    setForm({ produto_nome: '', quantidade: 1, motivo: '', data: new Date().toISOString().split('T')[0] });
    setShowForm(false);
  };

  const totalPerdas = perdas.reduce((s, p) => s + (p.quantidade || 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center">
            <Trash2 size={19} className="text-red-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Perdas</h2>
            <p className="text-xs text-muted-foreground">{perdas.length} registro(s) · {totalPerdas} unidades perdidas</p>
          </div>
        </div>
        {!readonly && (
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
            <Plus size={16} /> Registrar Perda
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <h3 className="font-semibold text-foreground">Registrar Perda</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Produto *</label>
              <select value={form.produto_nome} onChange={e => setForm(f => ({ ...f, produto_nome: e.target.value }))}
                className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="">Selecione...</option>
                {produtos.map(p => <option key={p.id} value={p.nome}>{p.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Quantidade *</label>
              <input type="number" min="1" value={form.quantidade} onChange={e => setForm(f => ({ ...f, quantidade: e.target.value }))}
                className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Data *</label>
              <input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
                className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Motivo *</label>
              <input value={form.motivo} onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))}
                className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={salvar} className="bg-primary text-primary-foreground px-5 py-2 rounded-xl text-sm font-medium hover:opacity-90">Salvar</button>
            <button onClick={() => setShowForm(false)} className="border border-border px-5 py-2 rounded-xl text-sm text-muted-foreground hover:bg-muted">Cancelar</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {loading ? <div className="text-center py-12 text-muted-foreground">Carregando...</div>
          : perdas.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-4xl mb-3">🗑️</p>
            <p className="text-sm">Nenhuma perda registrada.</p>
          </div>
        ) : perdas.map(p => (
          <div key={p.id} className="bg-card border border-red-100 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-foreground text-sm">{p.produto_nome}</p>
              <p className="text-xs text-muted-foreground">{p.motivo} · {p.data}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-red-600">-{p.quantidade}</p>
              <p className="text-xs text-muted-foreground">unidades</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}