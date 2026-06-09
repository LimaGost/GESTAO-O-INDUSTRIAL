import { useEffect, useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Plus, X, Edit2, Trash2, Search, Building2, Package,
  Check, ChevronDown, ChevronRight, ExternalLink, Loader2, Tag
} from 'lucide-react';
import FotoProduto from '@/components/produtos/FotoProduto';
import ModalClienteWL from '@/components/whitelabel/ModalClienteWL';

export default function WhiteLabel() {
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editandoCliente, setEditandoCliente] = useState(null);
  const [expandidos, setExpandidos] = useState({});

  const load = async () => {
    setLoading(true);
    const [cls, prods] = await Promise.all([
      base44.entities.ClienteWhiteLabel.list('-created_date'),
      base44.entities.Produto.filter({ tipo_produto: 'white_label' }),
    ]);
    setClientes(cls.filter(c => c.ativo !== false));
    setProdutos(prods);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const clientesFiltrados = useMemo(() => {
    if (!busca.trim()) return clientes;
    const b = busca.toLowerCase();
    return clientes.filter(c =>
      (c.razao_social || '').toLowerCase().includes(b) ||
      (c.nome_fantasia || '').toLowerCase().includes(b) ||
      (c.cnpj || '').toLowerCase().includes(b)
    );
  }, [clientes, busca]);

  const produtosPorCliente = useMemo(() => {
    const map = {};
    for (const p of produtos) {
      const cid = p.wl_cliente_id || '__sem_cliente__';
      if (!map[cid]) map[cid] = [];
      map[cid].push(p);
    }
    return map;
  }, [produtos]);

  const handleSalvar = async (dados) => {
    if (editandoCliente) {
      await base44.entities.ClienteWhiteLabel.update(editandoCliente.id, dados);
    } else {
      await base44.entities.ClienteWhiteLabel.create(dados);
    }
    setShowModal(false);
    setEditandoCliente(null);
    load();
  };

  const handleExcluir = async (id, nome) => {
    if (!confirm(`Desativar cliente White Label "${nome}"?`)) return;
    await base44.entities.ClienteWhiteLabel.update(id, { ativo: false });
    load();
  };

  const totalProdutos = produtos.length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-100 flex items-center justify-center">
            <Tag size={19} className="text-purple-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">White Label</h2>
            <p className="text-xs text-muted-foreground">{clientes.length} cliente(s) · {totalProdutos} produto(s) WL</p>
          </div>
        </div>
        <button
          onClick={() => { setEditandoCliente(null); setShowModal(true); }}
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm">
          <Plus size={16} /> Novo Cliente WL
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-2xl font-bold text-foreground">{clientes.length}</p>
          <p className="text-xs font-semibold text-foreground mt-0.5">Clientes White Label</p>
          <p className="text-[10px] text-muted-foreground">ativos</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-2xl font-bold text-purple-600">{totalProdutos}</p>
          <p className="text-xs font-semibold text-foreground mt-0.5">Produtos WL</p>
          <p className="text-[10px] text-muted-foreground">cadastrados</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-2xl font-bold text-foreground">{new Set(produtos.map(p => p.wl_cliente_id).filter(Boolean)).size}</p>
          <p className="text-xs font-semibold text-foreground mt-0.5">Marcas Ativas</p>
          <p className="text-[10px] text-muted-foreground">com produtos vinculados</p>
        </div>
      </div>

      {/* Busca */}
      <div className="flex items-center gap-2.5 bg-card border border-border rounded-xl px-3.5 py-2.5">
        <Search size={14} className="text-muted-foreground flex-shrink-0" />
        <input value={busca} onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por razão social, nome fantasia ou CNPJ..."
          className="bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground w-full" />
        {busca && <button onClick={() => setBusca('')}><X size={13} className="text-muted-foreground" /></button>}
      </div>

      {/* Lista de clientes */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      ) : clientesFiltrados.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-purple-50 border-2 border-dashed border-purple-200 flex items-center justify-center mx-auto">
            <Tag size={28} className="text-purple-300" />
          </div>
          <p className="text-sm font-semibold text-foreground">Nenhum cliente White Label</p>
          <p className="text-xs text-muted-foreground">Cadastre clientes para gerenciar produtos com marca terceira.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {clientesFiltrados.map(cliente => {
            const produtosCliente = produtosPorCliente[cliente.id] || [];
            const expanded = expandidos[cliente.id];
            return (
              <div key={cliente.id} className="bg-card border border-border rounded-2xl overflow-hidden">
                {/* Card header */}
                <div className="p-4 flex items-center gap-4">
                  {/* Logo */}
                  <div className="w-12 h-12 rounded-xl border border-border overflow-hidden flex-shrink-0 bg-muted flex items-center justify-center">
                    {cliente.logotipo_url
                      ? <img src={cliente.logotipo_url} alt={cliente.nome_fantasia} className="w-full h-full object-contain" />
                      : <Building2 size={20} className="text-muted-foreground" />
                    }
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-foreground">{cliente.nome_fantasia || cliente.razao_social}</p>
                      <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">WHITE LABEL</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{cliente.razao_social}</p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {cliente.cnpj && <span className="text-[10px] text-muted-foreground font-mono">{cliente.cnpj}</span>}
                      {cliente.responsavel && <span className="text-[10px] text-muted-foreground">👤 {cliente.responsavel}</span>}
                      {cliente.telefone && <span className="text-[10px] text-muted-foreground">📞 {cliente.telefone}</span>}
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-lg">
                      {produtosCliente.length} prod.
                    </span>
                    <button onClick={() => setExpandidos(p => ({ ...p, [cliente.id]: !p[cliente.id] }))}
                      className="p-1.5 hover:bg-muted rounded-lg transition-colors">
                      {expanded ? <ChevronDown size={15} className="text-muted-foreground" /> : <ChevronRight size={15} className="text-muted-foreground" />}
                    </button>
                    <button onClick={() => { setEditandoCliente(cliente); setShowModal(true); }}
                      className="p-1.5 hover:bg-muted rounded-lg transition-colors">
                      <Edit2 size={14} className="text-muted-foreground" />
                    </button>
                    <button onClick={() => handleExcluir(cliente.id, cliente.nome_fantasia || cliente.razao_social)}
                      className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={14} className="text-muted-foreground hover:text-red-500" />
                    </button>
                  </div>
                </div>

                {/* Produtos expandidos */}
                {expanded && (
                  <div className="border-t border-border bg-purple-50/30 p-4">
                    {produtosCliente.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhum produto vinculado a este cliente. Edite um produto e selecione este cliente como White Label.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {produtosCliente.map(p => (
                          <div key={p.id} className="bg-white rounded-xl border border-purple-100 p-3 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                              {p.foto_url
                                ? <img src={p.foto_url} alt={p.nome} className="w-full h-full object-cover" />
                                : <Package size={16} className="m-auto text-muted-foreground mt-2" />
                              }
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-foreground truncate">{p.nome}</p>
                              {p.wl_nome_comercial && <p className="text-[10px] text-purple-600 truncate">"{p.wl_nome_comercial}"</p>}
                              <p className="text-[10px] text-muted-foreground">Est: {p.estoque_atual || 0} un</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <ModalClienteWL
          cliente={editandoCliente}
          onSalvar={handleSalvar}
          onClose={() => { setShowModal(false); setEditandoCliente(null); }}
        />
      )}
    </div>
  );
}