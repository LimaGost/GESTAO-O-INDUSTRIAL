import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Settings, Plus, Search } from 'lucide-react';
import { usePermissoes } from '@/lib/usePermissoes.jsx';

export default function Produtos() {
  const { somenteLeitura } = usePermissoes();
  const readonly = somenteLeitura('Produtos');
  const [produtos, setProdutos] = useState([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nome: '', categoria: '', preco: '', estoque_atual: 0, estoque_minimo: 0 });

  useEffect(() => {
    base44.entities.Produto.list().then(p => { setProdutos(p); setLoading(false); });
  }, []);

  const salvar = async () => {
    if (!form.nome) return alert('Nome é obrigatório.');
    await base44.entities.Produto.create({ ...form, preco: Number(form.preco), estoque_atual: Number(form.estoque_atual), estoque_minimo: Number(form.estoque_minimo) });
    const p = await base44.entities.Produto.list();
    setProdutos(p);
    setForm({ nome: '', categoria: '', preco: '', estoque_atual: 0, estoque_minimo: 0 });
    setShowForm(false);
  };

  const filtrados = produtos.filter(p =>
    !busca || (p.nome || '').toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-100 flex items-center justify-center">
            <Settings size={19} className="text-orange-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Produtos</h2>
            <p className="text-xs text-muted-foreground">{produtos.length} produto(s)</p>
          </div>
        </div>
        {!readonly && (
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
            <Plus size={16} /> Novo Produto
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <h3 className="font-semibold text-foreground">Novo Produto</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[['nome','Nome *','text'],['categoria','Categoria','text'],['preco','Preço','number'],['estoque_atual','Estoque Atual','number'],['estoque_minimo','Estoque Mínimo','number']].map(([key, label, type]) => (
              <div key={key}>
                <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
                <input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={salvar} className="bg-primary text-primary-foreground px-5 py-2 rounded-xl text-sm font-medium hover:opacity-90">Salvar</button>
            <button onClick={() => setShowForm(false)} className="border border-border px-5 py-2 rounded-xl text-sm text-muted-foreground hover:bg-muted">Cancelar</button>
          </div>
        </div>
      )}

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar produto..."
          className="w-full border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
      </div>

      <div className="grid gap-3">
        {loading ? <div className="text-center py-12 text-muted-foreground">Carregando...</div>
          : filtrados.map(p => (
          <div key={p.id} className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-foreground text-sm">{p.nome}</p>
              <p className="text-xs text-muted-foreground">{p.categoria || 'Sem categoria'} · R$ {(p.preco || 0).toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-foreground">{p.estoque_atual || 0}</p>
              <p className="text-xs text-muted-foreground">em estoque</p>
            </div>
          </div>
        ))}
        {!loading && filtrados.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-4xl mb-3">⚙️</p>
            <p className="text-sm">Nenhum produto encontrado.</p>
          </div>
        )}
      </div>
    </div>
  );
}