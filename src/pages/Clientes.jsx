import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Edit2, X, Check, Users, Eye, TrendingUp, Search } from 'lucide-react';
import PerfilCliente from '@/components/clientes/PerfilCliente';
import CampoCNPJ from '@/components/clientes/CampoCNPJ';
import CrmDashboard from '@/components/clientes/CrmDashboard';
import { usePermissoes } from '@/lib/usePermissoes.jsx';

const emptyForm = { nome: '', cnpj_cpf: '', email: '', telefone: '', endereco: '', bairro: '', cep: '', cidade: '', estado: '', ativo: true };

export default function Clientes() {
  const { somenteLeitura } = usePermissoes();
  const readonly = somenteLeitura('Clientes');
  const [clientes, setClientes] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');
  const [filtroCidade, setFiltroCidade] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [perfilCliente, setPerfilCliente] = useState(null);
  const [aba, setAba] = useState('lista');

  const load = async () => {
    const [data, peds] = await Promise.all([
      base44.entities.Cliente.list(),
      base44.entities.Pedido.list(),
    ]);
    setClientes(data);
    setPedidos(peds);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.nome) return alert('Nome é obrigatório.');
    if (!form.endereco || !form.cidade || !form.estado) return alert('Endereço, cidade e estado são obrigatórios para emissão de NF e etiqueta.');
    setLoading(true);
    if (editing) {
      await base44.entities.Cliente.update(editing, form);
    } else {
      await base44.entities.Cliente.create(form);
    }
    setShowForm(false);
    setEditing(null);
    setForm(emptyForm);
    await load();
    setLoading(false);
  };

  const startEdit = (c) => {
    setForm({ nome: c.nome, cnpj_cpf: c.cnpj_cpf || '', email: c.email || '', telefone: c.telefone || '', endereco: c.endereco || '', bairro: c.bairro || '', cep: c.cep || '', cidade: c.cidade || '', estado: c.estado || '', ativo: c.ativo !== false });
    setEditing(c.id);
    setShowForm(true);
  };

  const fieldsRestantes = [
    { label: 'Nome *', field: 'nome' },
    { label: 'E-mail', field: 'email' }, { label: 'Telefone', field: 'telefone' },
    { label: 'Endereço (Rua, nº, complemento) *', field: 'endereco' }, { label: 'Bairro', field: 'bairro' },
    { label: 'CEP', field: 'cep' }, { label: 'Cidade *', field: 'cidade' }, { label: 'Estado *', field: 'estado' },
  ];

  const cidades = [...new Set(clientes.map(c => c.cidade).filter(Boolean))].sort();
  const estados = [...new Set(clientes.map(c => c.estado).filter(Boolean))].sort();

  const filtered = clientes.filter(c =>
    c.nome.toLowerCase().includes(busca.toLowerCase()) &&
    (!filtroCidade || c.cidade === filtroCidade) &&
    (!filtroEstado || c.estado === filtroEstado)
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-sky-blue/10 flex items-center justify-center">
            <Users size={19} className="text-sky-blue" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Clientes</h2>
            <p className="text-xs text-muted-foreground">{clientes.length} cliente(s) cadastrado(s)</p>
          </div>
        </div>

        {/* Abas */}
        <div className="flex items-center gap-2 bg-muted rounded-xl p-1">
          <button onClick={() => setAba('lista')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${aba === 'lista' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            <Users size={13} /> Lista
          </button>
          <button onClick={() => setAba('crm')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${aba === 'crm' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            <TrendingUp size={13} /> CRM
          </button>
        </div>

        {!readonly && (
          <button onClick={() => { setShowForm(true); setEditing(null); setForm(emptyForm); }}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm">
            <Plus size={16} /> Novo Cliente
          </button>
        )}
        {readonly && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-3 py-2 rounded-xl">
            <Eye size={13} /> Somente visualização
          </span>
        )}
      </div>

      {aba === 'crm' && (
        <CrmDashboard clientes={clientes} pedidos={pedidos} onOpenCliente={(c) => setPerfilCliente(c)} />
      )}

      {aba === 'lista' && (
        <div className="flex flex-wrap gap-2 items-center bg-card border border-border rounded-xl px-3.5 py-2.5">
          <Search size={14} className="text-muted-foreground flex-shrink-0" />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar cliente..."
            className="bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground flex-1 min-w-32" />
          {busca && <button onClick={() => setBusca('')} className="text-muted-foreground hover:text-foreground"><X size={13} /></button>}

          <select value={filtroCidade} onChange={e => setFiltroCidade(e.target.value)}
            className="border border-border rounded-xl px-3 py-2 text-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="">Todas as cidades</option>
            {cidades.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
            className="border border-border rounded-xl px-3 py-2 text-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="">Todos os estados</option>
            {estados.map(e => <option key={e} value={e}>{e}</option>)}
          </select>

          {(filtroCidade || filtroEstado) && (
            <button onClick={() => { setFiltroCidade(''); setFiltroEstado(''); }}
              className="text-xs text-muted-foreground hover:text-destructive border border-border rounded-xl px-3 py-2 bg-card flex items-center gap-1">
              <X size={11} /> Limpar
            </button>
          )}
        </div>
      )}

      {aba === 'lista' && showForm && !readonly && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <h3 className="font-semibold text-foreground">{editing ? 'Editar Cliente' : 'Novo Cliente'}</h3>
          <CampoCNPJ
            value={form.cnpj_cpf}
            onChange={val => setForm(f => ({ ...f, cnpj_cpf: val }))}
            onPreenchido={dados => setForm(f => ({ ...f, ...dados }))}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fieldsRestantes.map(({ label, field }) => (
              <div key={field}>
                <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
                <input value={form[field] || ''} onChange={e => setForm({ ...form, [field]: e.target.value })}
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={save} disabled={loading}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50">
              <Check size={15} /> {loading ? 'Salvando...' : 'Salvar'}
            </button>
            <button onClick={() => setShowForm(false)} className="flex items-center gap-2 border border-border px-5 py-2 rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors">
              <X size={14} /> Cancelar
            </button>
          </div>
        </div>
      )}

      {aba === 'lista' && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                {['Nome', 'CNPJ/CPF', 'Telefone', 'Cidade', 'Ações'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-t border-border hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => setPerfilCliente(c)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                        {(c.nome || 'C').charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-foreground">{c.nome}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{c.cnpj_cpf || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.telefone || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.cidade || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <button onClick={() => setPerfilCliente(c)} className="p-1.5 hover:bg-sky-blue/10 rounded-lg transition-colors" title="Ver perfil">
                        <Eye size={14} className="text-sky-blue" />
                      </button>
                      {!readonly && (
                        <button onClick={() => startEdit(c)} className="p-1.5 hover:bg-muted rounded-lg transition-colors" title="Editar">
                          <Edit2 size={14} className="text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">Nenhum cliente encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {perfilCliente && (
        <PerfilCliente
          cliente={perfilCliente}
          pedidos={pedidos}
          readonly={readonly}
          onClose={() => setPerfilCliente(null)}
          onSave={(atualizado) => {
            setPerfilCliente(atualizado);
            setClientes(prev => prev.map(c => c.id === atualizado.id ? atualizado : c));
          }}
        />
      )}
    </div>
  );
}