import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Edit2, X, Check, Users, Eye, TrendingUp, Search, Tag, Trash2 } from 'lucide-react';
import PerfilCliente from '@/components/clientes/PerfilCliente';
import CampoCNPJ from '@/components/clientes/CampoCNPJ';
import CrmDashboard from '@/components/clientes/CrmDashboard';
import { usePermissoes } from '@/lib/usePermissoes.jsx';

const emptyForm = { nome: '', cnpj_cpf: '', email: '', telefone: '', endereco: '', bairro: '', cep: '', cidade: '', estado: '', ativo: true, white_label: false };

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
  const [filtroWL, setFiltroWL] = useState(false);
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

  const excluir = async (c) => {
    const temPedidos = pedidos.some(p => p.cliente_id === c.id);
    const msg = temPedidos
      ? `"${c.nome}" possui pedidos no sistema. Os pedidos não serão apagados, mas ficarão sem vínculo com o cliente.\n\nDeseja excluir mesmo assim?`
      : `Excluir o cliente "${c.nome}"? Esta ação não pode ser desfeita.`;
    if (!window.confirm(msg)) return;
    await base44.entities.Cliente.delete(c.id);
    await load();
  };

  const startEdit = (c) => {
    setForm({ nome: c.nome, cnpj_cpf: c.cnpj_cpf || '', email: c.email || '', telefone: c.telefone || '', endereco: c.endereco || '', bairro: c.bairro || '', cep: c.cep || '', cidade: c.cidade || '', estado: c.estado || '', ativo: c.ativo !== false, white_label: c.white_label || false });
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
    (!filtroEstado || c.estado === filtroEstado) &&
    (!filtroWL || c.white_label === true)
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rainbow-orange/10 flex items-center justify-center">
            <Users size={19} className="text-rainbow-orange" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Clientes</h2>
            <p className="text-xs text-muted-foreground">{clientes.length} cliente(s) cadastrado(s)</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-muted rounded-xl p-1">
            <button onClick={() => setAba('lista')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${aba === 'lista' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              <Users size={12} /> Lista
            </button>
            <button onClick={() => setAba('crm')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${aba === 'crm' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              <TrendingUp size={12} /> CRM
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
      </div>

      {aba === 'crm' && (
        <CrmDashboard clientes={clientes} pedidos={pedidos} onVerCliente={(c) => setPerfilCliente(c)} />
      )}

      {aba === 'lista' && (
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2 flex-1 min-w-48">
            <Search size={14} className="text-muted-foreground" />
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar cliente..."
              className="bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground w-full" />
            {busca && <button onClick={() => setBusca('')} className="text-muted-foreground hover:text-foreground"><X size={13} /></button>}
          </div>
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
          <button onClick={() => setFiltroWL(v => !v)}
            className={`flex items-center gap-1.5 border rounded-xl px-3 py-2 text-xs font-semibold transition-all ${filtroWL ? 'border-purple-400 bg-purple-50 text-purple-700' : 'border-border text-muted-foreground hover:bg-muted'}`}>
            <Tag size={12} /> White Label
          </button>
          {(filtroCidade || filtroEstado || filtroWL) && (
            <button onClick={() => { setFiltroCidade(''); setFiltroEstado(''); setFiltroWL(false); }}
              className="text-xs text-muted-foreground hover:text-destructive border border-border rounded-xl px-3 py-2 bg-card flex items-center gap-1">
              <X size={12} /> Limpar
            </button>
          )}
        </div>
      )}

      {aba === 'lista' && showForm && !readonly && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h3 className="font-semibold text-foreground">{editing ? 'Editar Cliente' : 'Novo Cliente'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CampoCNPJ
              value={form.cnpj_cpf}
              onChange={val => setForm(f => ({ ...f, cnpj_cpf: val }))}
              onPreenchido={dados => setForm(f => ({ ...f, ...dados }))}
            />
            {fieldsRestantes.map(({ label, field }) => (
              <div key={field}>
                <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
                <input value={form[field]} onChange={e => setForm({ ...form, [field]: e.target.value })}
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            ))}
            <div className="col-span-full">
              <label className="flex items-center gap-3 cursor-pointer select-none p-3 rounded-xl border border-border hover:bg-muted/30 transition-colors">
                <div onClick={() => setForm(f => ({ ...f, white_label: !f.white_label }))}
                  className={`w-10 h-6 rounded-full transition-colors flex items-center px-0.5 ${form.white_label ? 'bg-purple-500' : 'bg-border'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${form.white_label ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Cliente White Label</p>
                  <p className="text-xs text-muted-foreground">Indica que fabricamos produtos para esta marca</p>
                </div>
                {form.white_label && <span className="ml-auto text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">WL</span>}
              </label>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={save} disabled={loading} className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
              <Check size={15} /> {loading ? 'Salvando...' : 'Salvar'}
            </button>
            <button onClick={() => setShowForm(false)} className="flex items-center gap-2 border border-border px-5 py-2 rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors">
              <X size={15} /> Cancelar
            </button>
          </div>
        </div>
      )}

      {aba === 'lista' && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead style={{ background: 'hsl(35,25%,93%)' }}>
              <tr>
                {['Nome', 'CNPJ/CPF', 'Telefone', 'Cidade', 'Ações'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setPerfilCliente(c)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                        {(c.nome || 'C').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-semibold text-foreground">{c.nome}</span>
                        {c.white_label && (
                          <span className="ml-2 text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-bold align-middle">WL</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{c.cnpj_cpf || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.telefone || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.cidade || '—'}</td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex gap-1">
                      <button onClick={() => setPerfilCliente(c)} className="p-1.5 hover:bg-sky-blue/10 rounded-lg transition-colors" title="Ver perfil">
                        <Eye size={14} className="text-sky-blue" />
                      </button>
                      {!readonly && (
                        <>
                          <button onClick={() => startEdit(c)} className="p-1.5 hover:bg-muted rounded-lg transition-colors" title="Editar">
                            <Edit2 size={14} className="text-muted-foreground" />
                          </button>
                          <button onClick={() => excluir(c)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
                            <Trash2 size={14} className="text-red-500" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground text-sm">Nenhum cliente encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {perfilCliente && (
        <PerfilCliente
          cliente={perfilCliente}
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