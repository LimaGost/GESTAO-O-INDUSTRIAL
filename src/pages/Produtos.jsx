import { useEffect, useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Plus, Edit2, X, Check, Search,
  Package, AlertTriangle, LayoutGrid, List, SlidersHorizontal,
  TrendingDown, CheckCircle, ChevronDown, ChevronRight, Trash2, Eye as EyeIcon
} from 'lucide-react';
import FotoProduto from '@/components/produtos/FotoProduto';
import ModalEditarSku from '@/components/produtos/ModalEditarSku';
import { usePermissoes } from '@/lib/usePermissoes.jsx';

const emptyFamilia = {
  nomeBase: '', codigoBase: '', categoria: '', novaCategoria: '',
  descricao: '', unidade: 'unidade', itens_por_caixa: 1,
  estoque_inicial: 0, estoque_minimo: 10, estoque_maximo: 0, preco_unitario: 0, variacoes: [],
};


export default function Produtos() {
  const { somenteLeitura } = usePermissoes();
  const readonly = somenteLeitura('Produtos');
  const [produtos, setProdutos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [showFamilia, setShowFamilia] = useState(false);
  const [familia, setFamilia] = useState(emptyFamilia);
  const [novaVariacao, setNovaVariacao] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingSku, setEditingSku] = useState(null);

  // Filtros
  const [busca, setBusca] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [filtroEstoque, setFiltroEstoque] = useState('todos');
  const [viewMode, setViewMode] = useState('grid');
  const [expandidas, setExpandidas] = useState({});
  const [showFiltros, setShowFiltros] = useState(false);

  const load = async () => {
    const data = await base44.entities.Produto.list();
    setProdutos(data);
    const catsUnique = [...new Set(data.map(p => p.categoria).filter(Boolean))].sort();
    setCategorias(catsUnique);
    return data;
  };

  const gerarCodigoSku = (produtosAtuais) => {
    const codigos = produtosAtuais.map(p => parseInt(p.codigo)).filter(c => !isNaN(c));
    return String(codigos.length > 0 ? Math.max(...codigos) + 1 : 1);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const cats = [...new Set(produtos.map(p => p.categoria || 'Sem Categoria'))];
    setExpandidas(prev => {
      const next = { ...prev };
      cats.forEach(c => { if (next[c] === undefined) next[c] = true; });
      return next;
    });
  }, [produtos]);

  const kpis = useMemo(() => {
    const total = produtos.length;
    const alertaMin = produtos.filter(p => (p.estoque_atual || 0) <= (p.estoque_minimo || 0)).length;
    const zerados = produtos.filter(p => (p.estoque_atual || 0) === 0).length;
    const ok = produtos.filter(p => (p.estoque_atual || 0) > (p.estoque_minimo || 0)).length;
    const totalEstoque = produtos.reduce((s, p) => s + (p.estoque_atual || 0), 0);
    return { total, alertaMin, zerados, ok, totalEstoque };
  }, [produtos]);

  const produtosFiltrados = useMemo(() => {
    return produtos.filter(p => {
      const matchBusca = !busca ||
        p.nome?.toLowerCase().includes(busca.toLowerCase()) ||
        p.codigo?.toLowerCase().includes(busca.toLowerCase()) ||
        p.categoria?.toLowerCase().includes(busca.toLowerCase());
      const matchCat = filtroCategoria === 'todas' || (p.categoria || 'Sem Categoria') === filtroCategoria;
      const est = p.estoque_atual || 0;
      const matchEst =
        filtroEstoque === 'todos' ? true :
        filtroEstoque === 'zerado' ? est === 0 :
        filtroEstoque === 'alerta' ? est > 0 && est <= (p.estoque_minimo || 0) :
        filtroEstoque === 'ok' ? est > (p.estoque_minimo || 0) : true;
      return matchBusca && matchCat && matchEst;
    });
  }, [produtos, busca, filtroCategoria, filtroEstoque]);

  const porCategoria = useMemo(() => {
    const map = {};
    for (const p of produtosFiltrados) {
      const cat = p.categoria || 'Sem Categoria';
      if (!map[cat]) map[cat] = [];
      map[cat].push(p);
    }
    return map;
  }, [produtosFiltrados]);

  const criarFamilia = async () => {
    if (!familia.nomeBase.trim() || !familia.codigoBase.trim()) return alert('Nome base e código base são obrigatórios.');
    if (!familia.categoria || (familia.categoria === '__new__' && !familia.novaCategoria.trim())) return alert('Selecione ou crie uma categoria.');
    setLoading(true);
    const categoriaFinal = familia.categoria === '__new__' ? familia.novaCategoria.trim() : familia.categoria;
    if (familia.variacoes.length === 0) {
      await base44.entities.Produto.create({
        nome: familia.nomeBase.trim(), codigo: familia.codigoBase.trim(), categoria: categoriaFinal,
        descricao: familia.descricao, unidade: familia.unidade, itens_por_caixa: familia.itens_por_caixa,
        estoque_atual: familia.estoque_inicial, estoque_minimo: familia.estoque_minimo,
        estoque_maximo: familia.estoque_maximo, preco_unitario: familia.preco_unitario, alerta_ativo: false,
      });
    } else {
      let contador = parseInt(familia.codigoBase);
      await Promise.all(familia.variacoes.map(v =>
        base44.entities.Produto.create({
          nome: `${familia.nomeBase.trim()} ${v}`, codigo: String(contador++), categoria: categoriaFinal,
          descricao: familia.descricao, unidade: familia.unidade, itens_por_caixa: familia.itens_por_caixa,
          estoque_atual: familia.estoque_inicial, estoque_minimo: familia.estoque_minimo,
          estoque_maximo: familia.estoque_maximo, preco_unitario: familia.preco_unitario, alerta_ativo: false, variacoes: [],
        })
      ));
    }
    setShowFamilia(false); setFamilia(emptyFamilia); setNovaVariacao('');
    await load(); setLoading(false);
  };

  const deleteSku = async (id, nome) => {
    if (!confirm(`Excluir "${nome}"? Esta ação não pode ser desfeita.`)) return;
    await base44.entities.Produto.delete(id); await load();
  };

  const addVariacao = () => {
    if (!novaVariacao.trim()) return;
    setFamilia(f => ({ ...f, variacoes: [...f.variacoes, novaVariacao.trim()] }));
    setNovaVariacao('');
  };

  const preview = familia.variacoes.length > 0
    ? familia.variacoes.map(v => `${familia.nomeBase || '...'} ${v}`)
    : familia.nomeBase ? [familia.nomeBase] : [];

  const filtrosAtivos = busca || filtroCategoria !== 'todas' || filtroEstoque !== 'todos';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-sun-yellow/10 flex items-center justify-center">
            <Package size={19} className="text-sun-yellow" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Catálogo de Produtos</h2>
            <p className="text-xs text-muted-foreground">{kpis.total} SKUs cadastrados</p>
          </div>
        </div>
        {!readonly ? (
          <button onClick={() => { setShowFamilia(true); setFamilia({ ...emptyFamilia, codigoBase: gerarCodigoSku(produtos) }); setNovaVariacao(''); }}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-amber-500 transition-colors shadow-sm">
            <Plus size={16} /> Novo Produto
          </button>
        ) : (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-3 py-2 rounded-xl">
            <EyeIcon size={13} /> Somente visualização
          </span>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total de SKUs', value: kpis.total, icon: Package, iconBg: 'bg-sky-blue/10', color: 'text-sky-blue', sub: 'produtos cadastrados', bar: null },
          { label: 'Estoque OK', value: kpis.ok, icon: CheckCircle, iconBg: 'bg-rainbow-green/10', color: 'text-rainbow-green', sub: 'acima do mínimo', bar: { pct: kpis.total ? Math.round((kpis.ok / kpis.total) * 100) : 0, color: 'bg-rainbow-green' } },
          { label: 'Em Alerta', value: kpis.alertaMin, icon: AlertTriangle, iconBg: 'bg-sun-yellow/10', color: 'text-sun-yellow', sub: 'abaixo do mínimo', bar: { pct: kpis.total ? Math.round((kpis.alertaMin / kpis.total) * 100) : 0, color: 'bg-sun-yellow' } },
          { label: 'Zerados', value: kpis.zerados, icon: TrendingDown, iconBg: 'bg-rainbow-red/10', color: 'text-rainbow-red', sub: 'sem estoque', bar: { pct: kpis.total ? Math.round((kpis.zerados / kpis.total) * 100) : 0, color: 'bg-rainbow-red' } },
        ].map(({ label, value, icon: Icon, iconBg, color, sub, bar }) => (
          <div key={label} className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-2">
            <div className={`w-8 h-8 rounded-xl ${iconBg} flex items-center justify-center`}>
              <Icon size={16} className={color} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="text-xs font-semibold text-foreground">{label}</p>
              <p className="text-[10px] text-muted-foreground">{sub}</p>
            </div>
            {bar && (
              <div className="h-1 rounded-full bg-muted overflow-hidden">
                <div className={`h-full rounded-full ${bar.color} transition-all`} style={{ width: `${bar.pct}%` }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Barra de busca + filtros */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {/* Busca */}
          <div className="flex items-center gap-2.5 flex-1 min-w-48 bg-card border border-border rounded-xl px-3.5 py-2.5">
            <Search size={14} className="text-muted-foreground flex-shrink-0" />
            <input value={busca} onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por nome, código ou categoria..."
              className="bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground w-full"
            />
            {busca && <button onClick={() => setBusca('')}><X size={13} className="text-muted-foreground" /></button>}
          </div>

          {/* Toggle filtros */}
          <button onClick={() => setShowFiltros(v => !v)}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-medium border transition-colors ${showFiltros || filtrosAtivos ? 'bg-primary/10 border-primary/30 text-primary' : 'border-border text-muted-foreground hover:bg-muted'}`}>
            <SlidersHorizontal size={14} />
            Filtros
            {filtrosAtivos && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
          </button>

          {/* View toggle */}
          <div className="flex bg-muted rounded-xl p-1">
            <button onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              <LayoutGrid size={15} />
            </button>
            <button onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'table' ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              <List size={15} />
            </button>
          </div>
        </div>

        {/* Filtros rápidos de estoque — sempre visíveis */}
        <div className="flex flex-wrap gap-1.5">
          {[
            { key: 'todos', label: 'Todos', count: kpis.total },
            { key: 'ok', label: '✓ OK', count: kpis.ok },
            { key: 'alerta', label: '⚠️ Alerta', count: kpis.alertaMin },
            { key: 'zerado', label: '🔴 Zerado', count: kpis.zerados },
          ].map(f => (
            <button key={f.key} onClick={() => setFiltroEstoque(f.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filtroEstoque === f.key ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground hover:text-foreground'}`}>
              {f.label}
              <span className={`text-[10px] font-bold px-1 rounded-full ${filtroEstoque === f.key ? 'bg-white/20' : 'bg-muted'}`}>{f.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Painel de filtros expandido — apenas categorias */}
      {showFiltros && (
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Filtrar por Categoria</p>
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => setFiltroCategoria('todas')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${filtroCategoria === 'todas' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
                Todas
              </button>
              {categorias.map(cat => (
                <button key={cat} onClick={() => setFiltroCategoria(cat)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${filtroCategoria === cat ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
                  {cat}
                </button>
              ))}
            </div>
          </div>
          {filtrosAtivos && (
            <button onClick={() => { setBusca(''); setFiltroCategoria('todas'); setFiltroEstoque('todos'); }}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors">
              Limpar todos os filtros
            </button>
          )}
        </div>
      )}

      {/* Formulário de novo produto */}
      {showFamilia && !readonly && (
        <div className="bg-white border border-border rounded-xl p-5 space-y-4 shadow-sm">
          <h3 className="font-semibold text-foreground">Novo Produto / Família</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              ['nomeBase', 'Nome base *', 'text'], ['codigoBase', 'Código base (SKU) *', 'text'],
              ['descricao', 'Descrição', 'text'], ['unidade', 'Unidade', 'text'],
            ].map(([key, label, type]) => (
              <div key={key}>
                <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
                <input type={type} value={familia[key]} onChange={e => setFamilia(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            ))}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Categoria *</label>
              <select value={familia.categoria} onChange={e => setFamilia(f => ({ ...f, categoria: e.target.value }))}
                className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="">Selecione...</option>
                {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                <option value="__new__">+ Nova categoria</option>
              </select>
            </div>
            {familia.categoria === '__new__' && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Nome da nova categoria *</label>
                <input value={familia.novaCategoria} onChange={e => setFamilia(f => ({ ...f, novaCategoria: e.target.value }))}
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            )}
            {[['estoque_inicial','Estoque Inicial','number'],['estoque_minimo','Estoque Mínimo','number'],['estoque_maximo','Estoque Máximo','number'],['preco_unitario','Preço Unitário','number'],['itens_por_caixa','Itens por Caixa','number']].map(([key, label, type]) => (
              <div key={key}>
                <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
                <input type={type} value={familia[key]} onChange={e => setFamilia(f => ({ ...f, [key]: Number(e.target.value) }))}
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            ))}
          </div>

          {/* Variações */}
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Variações (opcional — ex: Lavanda, Rosa, Baunilha)</label>
            <div className="flex gap-2">
              <input value={novaVariacao} onChange={e => setNovaVariacao(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addVariacao()}
                placeholder="Ex: Lavanda"
                className="flex-1 border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
              <button onClick={addVariacao} className="px-4 bg-muted rounded-xl text-sm font-medium hover:bg-muted/70 transition-colors">
                <Plus size={14} />
              </button>
            </div>
            {familia.variacoes.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {familia.variacoes.map((v, i) => (
                  <span key={i} className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                    {v}
                    <button onClick={() => setFamilia(f => ({ ...f, variacoes: f.variacoes.filter((_, j) => j !== i) }))}>
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {preview.length > 0 && (
              <div className="mt-2 p-3 bg-muted/30 rounded-xl">
                <p className="text-[10px] text-muted-foreground mb-1">Preview ({preview.length} SKU{preview.length > 1 ? 's' : ''}):</p>
                <div className="flex flex-wrap gap-1">
                  {preview.slice(0, 8).map((n, i) => <span key={i} className="text-xs text-foreground">{n}{i < preview.length - 1 && i < 7 ? ' ·' : ''}</span>)}
                  {preview.length > 8 && <span className="text-xs text-muted-foreground">+{preview.length - 8} mais</span>}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={criarFamilia} disabled={loading}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50">
              <Check size={15} /> {loading ? 'Criando...' : `Criar ${preview.length > 1 ? `${preview.length} SKUs` : 'Produto'}`}
            </button>
            <button onClick={() => { setShowFamilia(false); setFamilia(emptyFamilia); setNovaVariacao(''); }}
              className="border border-border px-5 py-2 rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Resultados */}
      <p className="text-xs text-muted-foreground">
        {produtosFiltrados.length === produtos.length ? `${produtos.length} produto(s)` : `${produtosFiltrados.length} de ${produtos.length} produto(s)`}
      </p>

      {/* Grid view */}
      {viewMode === 'grid' && (
        <div className="space-y-5">
          {Object.entries(porCategoria).map(([cat, prods]) => (
            <div key={cat}>
              <button onClick={() => setExpandidas(p => ({ ...p, [cat]: !p[cat] }))}
                className="flex items-center gap-2 mb-3 text-left w-full group">
                {expandidas[cat] ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
                <span className="text-sm font-bold text-foreground">{cat}</span>
                <span className="text-xs text-muted-foreground">({prods.length})</span>
              </button>

              {expandidas[cat] && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {prods.map(p => {
                    const alerta = (p.estoque_atual || 0) <= (p.estoque_minimo || 0);
                    const zerado = (p.estoque_atual || 0) === 0;
                    return (
                      <div key={p.id} className={`bg-card border rounded-2xl overflow-hidden transition-all ${zerado ? 'border-rainbow-red/30' : alerta ? 'border-sun-yellow/30' : 'border-border'}`}>
                        <>
                            {/* Foto em destaque no topo */}
                            <div className="relative">
                              {p.foto_url ? (
                                <img src={p.foto_url} alt={p.nome}
                                  className="w-full h-28 object-cover rounded-t-2xl" />
                              ) : (
                                <div className="w-full h-28 bg-muted/50 rounded-t-2xl flex items-center justify-center">
                                  <Package size={28} className="text-muted-foreground/40" />
                                </div>
                              )}
                              {/* Badge de status sobreposto */}
                              <span className={`absolute top-2 right-2 text-[10px] px-2 py-1 rounded-full font-bold shadow-sm ${zerado ? 'bg-rainbow-red text-white' : alerta ? 'bg-sun-yellow text-white' : 'bg-rainbow-green text-white'}`}>
                                {zerado ? '● Zerado' : alerta ? '▲ Alerta' : '✓ OK'}
                              </span>
                              {!readonly && (
                                <div className="absolute top-2 left-2 flex gap-1">
                                  <button onClick={() => setEditingSku(p)}
                                    className="p-1.5 bg-white/90 hover:bg-white rounded-lg shadow-sm transition-colors">
                                    <Edit2 size={11} className="text-foreground" />
                                  </button>
                                  <button onClick={() => deleteSku(p.id, p.nome)}
                                    className="p-1.5 bg-white/90 hover:bg-red-50 rounded-lg shadow-sm transition-colors">
                                    <Trash2 size={11} className="text-destructive" />
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Info do produto */}
                            <div className="p-3">
                              <p className="text-xs font-bold text-foreground leading-tight truncate">{p.nome}</p>
                              <div className="flex items-center justify-between mt-0.5">
                                <p className="text-[10px] text-muted-foreground font-mono">{p.codigo || '—'}</p>
                                <p className="text-[10px] text-muted-foreground">{p.unidade || 'un'} · R$ {(p.preco_unitario || 0).toFixed(2)}</p>
                              </div>

                              {/* Estoque + barra */}
                              <div className="mt-2.5">
                                <div className="flex items-end justify-between mb-1">
                                  <div>
                                    <p className={`text-xl font-bold ${zerado ? 'text-rainbow-red' : alerta ? 'text-sun-yellow' : 'text-foreground'}`}>
                                      {p.estoque_atual || 0}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">min: {p.estoque_minimo || 0}</p>
                                  </div>
                                  {p.estoque_maximo > 0 && (
                                    <p className="text-[10px] text-muted-foreground">máx: {p.estoque_maximo}</p>
                                  )}
                                </div>
                                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                  <div className={`h-full rounded-full transition-all ${zerado ? 'bg-rainbow-red' : alerta ? 'bg-sun-yellow' : 'bg-rainbow-green'}`}
                                    style={{ width: `${p.estoque_minimo > 0 ? Math.min(100, Math.round(((p.estoque_atual || 0) / (p.estoque_minimo * 2)) * 100)) : 100}%` }} />
                                </div>
                              </div>
                            </div>
                          </>
                          </div>
                          );
                          })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Table view */}
      {viewMode === 'table' && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                {['Foto','Código','Produto','Categoria','Unidade','Estoque','Mín','Preço','Status',''].map(h => (
                  <th key={h} className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {produtosFiltrados.map(p => {
                const alerta = (p.estoque_atual || 0) <= (p.estoque_minimo || 0);
                const zerado = (p.estoque_atual || 0) === 0;
                return (
                  <tr key={p.id} className="border-t border-border hover:bg-muted/20 transition-colors">
                    <td className="px-3 py-2"><FotoProduto fotoUrl={p.foto_url} size="sm" readOnly /></td>
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{p.codigo || '—'}</td>
                    <td className="px-3 py-2 font-medium text-foreground">{p.nome}</td>
                    <td className="px-3 py-2 text-muted-foreground text-xs">{p.categoria || '—'}</td>
                    <td className="px-3 py-2 text-muted-foreground text-xs">{p.unidade || '—'}</td>
                    <td className="px-3 py-2 font-bold text-foreground">{p.estoque_atual || 0}</td>
                    <td className="px-3 py-2 text-muted-foreground">{p.estoque_minimo || 0}</td>
                    <td className="px-3 py-2 text-muted-foreground">R$ {(p.preco_unitario || 0).toFixed(2)}</td>
                    <td className="px-3 py-2">
                      <span className={`text-[10px] px-2 py-1 rounded-full font-semibold ${zerado ? 'bg-rainbow-red/10 text-rainbow-red' : alerta ? 'bg-sun-yellow/10 text-sun-yellow' : 'bg-rainbow-green/10 text-rainbow-green'}`}>
                        {zerado ? 'Zerado' : alerta ? 'Alerta' : 'OK'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {!readonly && (
                        <div className="flex gap-1">
                          <button onClick={() => setEditingSku(p)} className="p-1.5 hover:bg-muted rounded-lg">
                            <Edit2 size={12} className="text-muted-foreground" />
                          </button>
                          <button onClick={() => deleteSku(p.id, p.nome)} className="p-1.5 hover:bg-destructive/10 rounded-lg">
                            <Trash2 size={12} className="text-muted-foreground hover:text-destructive" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {produtosFiltrados.length === 0 && (
                <tr><td colSpan={10} className="text-center py-12 text-muted-foreground">Nenhum produto encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {editingSku && (
        <ModalEditarSku
          produto={editingSku}
          onClose={() => setEditingSku(null)}
          onSaved={(produtoAtualizado) => {
          setEditingSku(null);
          setProdutos(prev => prev.map(p => p.id === produtoAtualizado.id ? { ...p, ...produtoAtualizado } : p));
          load();
        }}
        />
      )}
    </div>
  );
}