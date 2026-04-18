import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Users, Plus, Search, Phone, Mail } from 'lucide-react';
import { usePermissoes } from '@/lib/usePermissoes.jsx';

export default function Clientes() {
  const { somenteLeitura } = usePermissoes();
  const readonly = somenteLeitura('Clientes');
  const [clientes, setClientes] = useState([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nome: '', email: '', telefone: '', endereco: '' });

  useEffect(() => {
    base44.entities.Cliente.list().then(c => { setClientes(c); setLoading(false); });
  }, []);

  const salvar = async () => {
    if (!form.nome) return alert('Nome é obrigatório.');
    await base44.entities.Cliente.create(form);
    const c = await base44.entities.Cliente.list();
    setClientes(c);
    setForm({ nome: '', email: '', telefone: '', endereco: '' });
    setShowForm(false);
  };

  const filtrados = clientes.filter(c =>
    !busca || (c.nome || '').toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-green-100 flex items-center justify-center">
            <Users size={19} className="text-green-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Clientes</h2>
            <p className="text-xs text-muted-foreground">{clientes.length} cliente(s)</p>
          </div>
        </div>
        {!readonly && (
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
            <Plus size={16} /> Novo Cliente
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <h3 className="font-semibold text-foreground">Novo Cliente</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[['nome','Nome *'],['email','Email'],['telefone','Telefone'],['endereco','Endereço']].map(([key, label]) => (
              <div key={key}>
                <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
                <input value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
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
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar cliente..."
          className="w-full border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
      </div>

      <div className="grid gap-3">
        {loading ? <div className="text-center py-12 text-muted-foreground">Carregando...</div>
          : filtrados.map(c => (
          <div key={c.id} className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center font-bold text-sm text-primary">
                {(c.nome || 'C').charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">{c.nome}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {c.email && <span className="flex items-center gap-1"><Mail size={10} />{c.email}</span>}
                  {c.telefone && <span className="flex items-center gap-1"><Phone size={10} />{c.telefone}</span>}
                </div>
              </div>
            </div>
          </div>
        ))}
        {!loading && filtrados.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-4xl mb-3">👥</p>
            <p className="text-sm">Nenhum cliente encontrado.</p>
          </div>
        )}
      </div>
    </div>
  );
}