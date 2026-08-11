import { useEffect, useState, useRef, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, TrendingUp, Archive, Plus, X, Check, Search, Eye, Package, RefreshCw, SlidersHorizontal, ClipboardList } from 'lucide-react';
import { registrarLog } from '@/lib/audit';
import { gerarNumero } from '@/lib/numeracao';
import { usePermissoes } from '@/lib/usePermissoes.jsx';
import { useAuth } from '@/lib/AuthContext';
import { alocarPedido } from '@/lib/alocacaoPedido';
import PullToRefresh from '@/components/PullToRefresh';
import { listarFracionado, adicionarFracionado, retirarFracionado } from '@/lib/estoqueFracionado';
import { calcularCaixas, formatarCaixas } from '@/lib/calculoCaixas';

function StatusBadge({ zerado, alertaMax, alerta }) {
  if (zerado)    return <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-semibold">Zerado</span>;
  if (alertaMax) return <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-600 font-semibold">Excesso</span>;
  if (alerta)    return <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">Abaixo mín.</span>;
  return          <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-600 font-semibold">OK</span>;
}

function BarraEstoque({ pct, zerado, alerta }) {
  const cor = zerado ? 'bg-red-400' : alerta ? 'bg-amber-400' : 'bg-green-500';
  return (
    <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${cor}`} style={{ width: `${Math.max(pct, 2)}%` }} />
    </div>
  );
}

export default function Estoque() {
  const { somenteLeitura } = usePermissoes();
  const { user } = useAuth();
  const readonly = somenteLeitura('Estoque');
  const podeReservar = ['estoquista', 'estoquista_industria', 'admin', 'diretor'].includes(user?.role);
  const [pedidosPendentes, setPedidosPendentes] = useState([]);
  const [confirmandoPedidoId, setConfirmandoPedidoId] = useState(null);
  const [produtos, setProdutos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [showAjuste, setShowAjuste] = useState(false);
  const [ajuste, setAjuste] = useState({ produto_id: '', tipo: 'entrada', quantidade: 1, motivo: '', estoque: 'principal' });
  const [buscaProdutoAjuste, setBuscaProdutoAjuste] = useState('');
  const [mostrarListaAjuste, setMostrarListaAjuste] = useState(false);
  const inputBipagemRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');
  const [fracionados, setFracionados] = useState({});
  const [fracRegistros, setFracRegistros] = useState([]);
  const [visao, setVisao] = useState('principal');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [isMobileTela] = useState(window.innerWidth < 768);
  const buscaRef = useRef(null);

  useEffect(() => {
    setTimeout(() => buscaRef.current?.focus(), 100);
    const handler = (e) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        buscaRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const load = async () => {
    setCarregando(true);
    const [data, fracAll] = await Promise.all([
      base44.entities.Produto.list('-updated_date'),
      listarFracionado().catch(() => []),
    ]);
    setProdutos(data);
    setFracRegistros(fracAll);
    const map = {};
    for (const r of fracAll) map[r.produto_id] = (map[r.produto_id] || 0) + (r.quantidade || 0);
    setFracionados(map);
    setCarregando(false);
  };

  useEffect(() => { load(); }, []);

  const ajustarEstoque = async () => {
    if (!ajuste.produto_id || ajuste.quantidade <= 0) return alert('Selecione produto e quantidade válida.');
    const prod = produtos.find(p => p.id === ajuste.produto_id);
    if (!prod) return;

    // ── Estoque Desmontado (fracionado) ──
    if (ajuste.estoque === 'desmontado') {
      setLoading(true);
      try {
        if (ajuste.tipo === 'entrada') {
          await adicionarFracionado({
            produto_id: prod.id, produto_nome: prod.nome, produto_codigo: prod.codigo,
            quantidade: ajuste.quantidade, origem: `Ajuste manual — ${ajuste.motivo || 'sem motivo'}`,
          });
        } else {
          await retirarFracionado({
            produto_id: prod.id, produto_nome: prod.nome,
            quantidade: ajuste.quantidade, motivo: `Ajuste manual — ${ajuste.motivo || 'sem motivo'}`,
          });
        }
      } catch (e) {
        setLoading(false);
        return alert(`❌ ${e.message}`);
      }
      setShowAjuste(false);
      setAjuste({ produto_id: '', tipo: 'entrada', quantidade: 1, motivo: '', estoque: 'principal' });
      setBuscaProdutoAjuste('');
      await load();
      setLoading(false);
      return;
    }

    let novoEstoque = ajuste.tipo === 'entrada'
      ? (prod.estoque_atual || 0) + ajuste.quantidade
      : (prod.estoque_atual || 0) - ajuste.quantidade;

    if (novoEstoque < 0) { alert('❌ Estoque não pode ficar negativo.'); return; }

    setLoading(true);
    await base44.entities.Produto.update(ajuste.produto_id, { estoque_atual: novoEstoque });
    await registrarLog('Produto', ajuste.produto_id, `AJUSTE_${ajuste.tipo.toUpperCase()}`, `Ajuste manual: ${ajuste.tipo} de ${ajuste.quantidade} — Motivo: ${ajuste.motivo || 'Ajuste manual'}`);

    if (novoEstoque <= (prod.estoque_minimo || 0) && ajuste.tipo === 'saida') {
      const op = await base44.entities.OrdemProducao.create({
        numero: gerarNumero('OP'),
        produto_id: prod.id,
        produto_nome: prod.nome,
        quantidade: (prod.estoque_minimo || 10) * 2,
        status: 'a_produzir',
        origem: 'estoque_minimo',
      });
      await registrarLog('OrdemProducao', op.id, 'ALERTA_ESTOQUE_MINIMO', `OP automática criada por estoque mínimo — ${prod.nome}`);
      alert(`⚠️ Estoque abaixo do mínimo! OP criada automaticamente no Kanban.`);
    }

    setShowAjuste(false);
    setAjuste({ produto_id: '', tipo: 'entrada', quantidade: 1, motivo: '', estoque: 'principal' });
    setBuscaProdutoAjuste('');
    await load();
    setLoading(false);
  };

  const totalProdutos = produtos.length;
  const alertas = produtos.filter(p => (p.estoque_atual || 0) <= (p.estoque_minimo || 0)).length;
  const zerados = produtos.filter(p => (p.estoque_atual || 0) === 0).length;
  const totalUnidades = produtos.reduce((s, p) => s + (p.estoque_atual || 0), 0);
  const totalAvulsas = Object.values(fracionados).reduce((s, q) => s + q, 0);
  const categorias = useMemo(() => [...new Set(produtos.map(p => p.categoria).filter(Boolean))].sort(), [produtos]);

  const produtosFiltrados = useMemo(() => produtos.filter(p => {
    const b = busca.toLowerCase();
    const matchBusca = !busca || (p.nome || '').toLowerCase().includes(b) || (p.codigo || '').toLowerCase().includes(b) || (p.categoria || '').toLowerCase().includes(b);
    const est = p.estoque_atual || 0;
    const alerta = est <= (p.estoque_minimo || 0);
    const zerado = est === 0;
    const matchCategoria = filtroCategoria === 'todas' || p.categoria === filtroCategoria;
    if (filtroStatus === 'zerado') return matchBusca && matchCategoria && zerado;
    if (filtroStatus === 'alerta') return matchBusca && matchCategoria && alerta && !zerado;
    if (filtroStatus === 'ok') return matchBusca && matchCategoria && !alerta;
    return matchBusca && matchCategoria;
  }), [produtos, busca, filtroStatus, filtroCategoria]);

  // Produto selecionado no ajuste
  const produtoAjuste = produtos.find(p => p.id === ajuste.produto_id);

  // Mapa de código -> produto, para bipagem/entrada direta por código (case-insensitive)
  const codigoMapAjuste = useMemo(() => {
    const map = {};
    for (const p of produtos) {
      if (p.codigo) map[String(p.codigo).trim().toLowerCase()] = p.id;
    }
    return map;
  }, [produtos]);

  const produtosFiltradosAjuste = useMemo(() => {
    const termo = buscaProdutoAjuste.trim().toLowerCase();
    if (!termo) return [];
    return produtos
      .filter(p => (p.nome || '').toLowerCase().includes(termo) || (p.codigo || '').toString().toLowerCase().includes(termo))
      .slice(0, 8);
  }, [produtos, buscaProdutoAjuste]);

  const selecionarProdutoAjuste = (produto) => {
    setAjuste(a => ({ ...a, produto_id: produto.id }));
    setBuscaProdutoAjuste('');
    setMostrarListaAjuste(false);
  };

  const fecharModalAjuste = () => {
    setShowAjuste(false);
    setAjuste({ produto_id: '', tipo: 'entrada', quantidade: 1, motivo: '', estoque: 'principal' });
    setBuscaProdutoAjuste('');
  };

  // Bipagem ou Enter: se o texto bater exatamente com um código, seleciona na hora.
  // Senão, se sobrou só 1 produto no filtro, seleciona ele também.
  const handleEnterBusca = () => {
    const termo = buscaProdutoAjuste.trim().toLowerCase();
    if (!termo) return;
    const idPorCodigo = codigoMapAjuste[termo];
    if (idPorCodigo) {
      const p = produtos.find(pp => pp.id === idPorCodigo);
      if (p) { selecionarProdutoAjuste(p); return; }
    }
    if (produtosFiltradosAjuste.length === 1) {
      selecionarProdutoAjuste(produtosFiltradosAjuste[0]);
    }
  };

  return (
    <PullToRefresh onRefresh={load}>
    <div className="space-y-5">

      {/* Header */}
      <div className="bg-card border border-border rounded-2xl px-5 py-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-green-500/10 flex items-center justify-center">
            <Archive size={19} className="text-green-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Estoque</h2>
            <p className="text-xs text-muted-foreground">{totalProdutos} SKUs · {totalUnidades.toLocaleString('pt-BR')} unidades</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-muted rounded-xl p-1">
            <button onClick={() => setVisao('principal')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${visao === 'principal' ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              📦 Principal
            </button>
            <button onClick={() => setVisao('desmontado')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${visao === 'desmontado' ? 'bg-card shadow text-amber-600' : 'text-muted-foreground hover:text-foreground'}`}>
              🔓 Desmontado{totalAvulsas > 0 ? ` (${totalAvulsas})` : ''}
            </button>
          </div>
          <button onClick={() => load()} disabled={carregando}
            className="p-2.5 border border-border rounded-xl hover:bg-muted transition-colors text-muted-foreground disabled:opacity-40">
            <RefreshCw size={14} className={carregando ? 'animate-spin' : ''} />
          </button>
          {!readonly ? (
            <button onClick={() => setShowAjuste(true)}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm">
              <Plus size={16} /> Ajuste Manual
            </button>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-3 py-2 rounded-xl">
              <Eye size={13} /> Somente visualização
            </span>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div onClick={() => setFiltroStatus('todos')} className="bg-card border border-border rounded-2xl p-4 cursor-pointer hover:border-sky-400 transition-colors group">
          <div className="flex items-center gap-2 mb-2">
            <Archive size={15} className="text-sky-500" />
            <span className="text-xs text-muted-foreground">Total de SKUs</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{totalProdutos}</p>
        </div>
        <div onClick={() => setFiltroStatus('todos')} className="bg-card border border-border rounded-2xl p-4 cursor-pointer hover:border-green-400 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={15} className="text-green-500" />
            <span className="text-xs text-muted-foreground">Total em Estoque</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{totalUnidades.toLocaleString('pt-BR')}</p>
          <p className="text-[10px] text-muted-foreground">un. lacradas{totalAvulsas > 0 ? ` · +${totalAvulsas.toLocaleString('pt-BR')} avulsas` : ''}</p>
        </div>
        <div onClick={() => setFiltroStatus('alerta')} className={`rounded-2xl p-4 cursor-pointer transition-colors border ${alertas > 0 ? 'bg-amber-50 border-amber-200 hover:border-amber-400' : 'bg-card border-border'}`}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={15} className={alertas > 0 ? 'text-amber-500' : 'text-muted-foreground'} />
            <span className="text-xs text-muted-foreground">Alertas Mínimo</span>
          </div>
          <p className={`text-2xl font-bold ${alertas > 0 ? 'text-amber-600' : 'text-foreground'}`}>{alertas}</p>
          {alertas > 0 && <p className="text-[10px] text-amber-500">clique para filtrar</p>}
        </div>
        <div onClick={() => setFiltroStatus('zerado')} className={`rounded-2xl p-4 cursor-pointer transition-colors border ${zerados > 0 ? 'bg-red-50 border-red-200 hover:border-red-400' : 'bg-card border-border'}`}>
          <div className="flex items-center gap-2 mb-2">
            <Package size={15} className={zerados > 0 ? 'text-red-500' : 'text-muted-foreground'} />
            <span className="text-xs text-muted-foreground">Zerados</span>
          </div>
          <p className={`text-2xl font-bold ${zerados > 0 ? 'text-red-600' : 'text-foreground'}`}>{zerados}</p>
          {zerados > 0 && <p className="text-[10px] text-red-400">clique para filtrar</p>}
        </div>
      </div>

      {/* Busca + Filtros */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        {/* Campo busca */}
        <div className="flex items-center gap-2.5 border border-border rounded-xl px-3.5 py-2.5 focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/20 transition-all bg-background">
          <Search size={15} className="text-muted-foreground flex-shrink-0" />
          <input ref={buscaRef} value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome, código ou categoria..."
            className="bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground w-full" />
          {busca
            ? <button onClick={() => { setBusca(''); buscaRef.current?.focus(); }} className="text-muted-foreground hover:text-foreground flex-shrink-0"><X size={14} /></button>
            : <kbd className="hidden sm:block text-[10px] text-muted-foreground/60 bg-muted px-1.5 py-0.5 rounded font-mono">/</kbd>
          }
        </div>

        {/* Filtros status */}
        <div className="flex items-center gap-2 flex-wrap">
          <SlidersHorizontal size={13} className="text-muted-foreground flex-shrink-0" />
          {[
            { k: 'todos', l: 'Todos', count: produtos.length },
            { k: 'ok', l: 'OK', count: produtos.filter(p => (p.estoque_atual||0) > (p.estoque_minimo||0)).length },
            { k: 'alerta', l: 'Alerta', count: alertas - zerados },
            { k: 'zerado', l: 'Zerado', count: zerados },
          ].map(f => (
            <button key={f.k} onClick={() => setFiltroStatus(f.k)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filtroStatus === f.k ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}>
              {f.l}
              <span className={`text-[10px] rounded-full px-1.5 py-0.5 font-bold ${filtroStatus === f.k ? 'bg-white/20' : 'bg-border'}`}>{f.count}</span>
            </button>
          ))}
        </div>

        {/* Filtros categoria */}
        {categorias.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setFiltroCategoria('todas')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${filtroCategoria === 'todas' ? 'bg-purple-600 text-white' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
              Todas
            </button>
            {categorias.map(cat => (
              <button key={cat} onClick={() => setFiltroCategoria(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${filtroCategoria === cat ? 'bg-purple-600 text-white' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tabela Estoque Principal */}
      {visao === 'principal' && (
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {/* Contador de resultados */}
        <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {busca || filtroStatus !== 'todos' || filtroCategoria !== 'todas'
              ? <><strong className="text-foreground">{produtosFiltrados.length}</strong> de {totalProdutos} produtos</>
              : <><strong className="text-foreground">{totalProdutos}</strong> produtos</>
            }
          </p>
          {(busca || filtroStatus !== 'todos' || filtroCategoria !== 'todas') && (
            <button onClick={() => { setBusca(''); setFiltroStatus('todos'); setFiltroCategoria('todas'); }}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors">Limpar filtros</button>
          )}
        </div>

        {carregando ? (
          <div className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
            <RefreshCw size={22} className="animate-spin opacity-40" />
            <p className="text-sm">Carregando estoque...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr>
                  {['Produto', 'Código', 'Unidade', 'Lacrado', 'Avulso', 'Total', 'Mín', 'Máx', 'Status'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {produtosFiltrados.map(p => {
                  const est = p.estoque_atual || 0;
                  const alerta = est <= (p.estoque_minimo || 0);
                  const zerado = est === 0;
                  const alertaMax = (p.estoque_maximo || 0) > 0 && est >= p.estoque_maximo;
                  const pct = p.estoque_minimo > 0 ? Math.min(100, Math.round((est / (p.estoque_minimo * 2)) * 100)) : 100;
                  return (
                    <tr key={p.id}
                      onClick={() => { if (!readonly) { setAjuste({ produto_id: p.id, tipo: 'entrada', quantidade: 1, motivo: '', estoque: 'principal' }); setShowAjuste(true); } }}
                      className={`transition-colors ${readonly ? '' : 'cursor-pointer hover:bg-primary/5'} ${zerado ? 'bg-red-50/40' : alerta ? 'bg-amber-50/30' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1 min-w-[140px]">
                          <span className="font-medium text-foreground leading-tight">{p.nome}</span>
                          {p.categoria && <span className="text-[10px] text-muted-foreground">{p.categoria}</span>}
                          <BarraEstoque pct={pct} zerado={zerado} alerta={alerta} />
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">{p.codigo || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{p.unidade || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className={`text-base font-bold ${zerado ? 'text-red-500' : alerta ? 'text-amber-600' : 'text-foreground'}`}>
                            {est.toLocaleString('pt-BR')}
                          </span>
                          {(p.itens_por_caixa || 1) > 1 && est > 0 && (
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">{formatarCaixas(calcularCaixas(p, est))}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {(fracionados[p.id] || 0) > 0 ? (
                          <span className="text-sm font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg whitespace-nowrap">
                            {(fracionados[p.id] || 0).toLocaleString('pt-BR')} un
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-semibold text-foreground">
                          {(est + (fracionados[p.id] || 0)).toLocaleString('pt-BR')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-sm">{p.estoque_minimo || 0}</td>
                      <td className="px-4 py-3 text-muted-foreground text-sm">{p.estoque_maximo || '—'}</td>
                      <td className="px-4 py-3">
                        <StatusBadge zerado={zerado} alertaMax={alertaMax} alerta={alerta} />
                      </td>
                    </tr>
                  );
                })}
                {produtosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center py-14 text-muted-foreground">
                      <Package size={28} className="mx-auto mb-2 opacity-20" />
                      <p className="text-sm">{busca ? `Nenhum produto encontrado para "${busca}"` : 'Nenhum produto encontrado.'}</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      )}

      {/* Tabela Estoque Desmontado */}
      {visao === 'desmontado' && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-amber-200 bg-amber-50 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-amber-800">🔓 Estoque Desmontado (Fracionado)</p>
              <p className="text-[11px] text-amber-600">Unidades avulsas de caixas abertas e sobras de produção — usar antes de abrir caixa nova</p>
            </div>
            <span className="text-sm font-bold text-amber-700 bg-amber-100 px-3 py-1 rounded-full whitespace-nowrap">
              {totalAvulsas.toLocaleString('pt-BR')} un
            </span>
          </div>
          {(() => {
            const b = busca.toLowerCase();
            const registros = fracRegistros
              .filter(r => (r.quantidade || 0) > 0)
              .filter(r => !busca || (r.produto_nome || '').toLowerCase().includes(b) || (r.produto_codigo || '').toLowerCase().includes(b))
              .sort((a, c) => (c.quantidade || 0) - (a.quantidade || 0));
            if (registros.length === 0) {
              return (
                <div className="text-center py-14 text-muted-foreground">
                  <Package size={28} className="mx-auto mb-2 opacity-20" />
                  <p className="text-sm">{busca ? `Nenhum item avulso encontrado para "${busca}"` : 'Nenhuma unidade avulsa no momento.'}</p>
                  <p className="text-xs mt-1">As sobras da produção e caixas abertas na separação aparecem aqui.</p>
                </div>
              );
            }
            return (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30">
                    <tr>
                      {['Produto', 'Código', 'Un. Avulsas', 'Estoque Lacrado', 'Total'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {registros.map(r => {
                      const prod = produtos.find(p => p.id === r.produto_id);
                      const lacrado = prod?.estoque_atual || 0;
                      return (
                        <tr key={r.id} className="hover:bg-amber-50/40 transition-colors">
                          <td className="px-4 py-3 font-medium text-foreground">{r.produto_nome}</td>
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.produto_codigo || prod?.codigo || '—'}</td>
                          <td className="px-4 py-3">
                            <span className="text-base font-bold text-amber-600">{(r.quantidade || 0).toLocaleString('pt-BR')}</span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{lacrado.toLocaleString('pt-BR')}</td>
                          <td className="px-4 py-3 font-semibold text-foreground">{(lacrado + (r.quantidade || 0)).toLocaleString('pt-BR')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      )}

      {/* Modal Ajuste */}
      {showAjuste && !readonly && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={fecharModalAjuste}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-bold text-foreground">Ajuste de Estoque</h3>
              <button onClick={fecharModalAjuste} className="p-1.5 hover:bg-muted rounded-lg">
                <X size={15} className="text-muted-foreground" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Qual estoque */}
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block font-semibold">Estoque *</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { v: 'principal', l: '📦 Principal', sub: 'lacrado', cor: 'border-green-400 bg-green-50 text-green-700' },
                    { v: 'desmontado', l: '🔓 Desmontado', sub: 'avulso', cor: 'border-amber-400 bg-amber-50 text-amber-700' },
                  ].map(s => (
                    <button key={s.v} onClick={() => setAjuste(a => ({ ...a, estoque: s.v }))}
                      className={`py-2 rounded-xl text-xs font-bold border-2 transition-all ${ajuste.estoque === s.v ? s.cor : 'border-border text-muted-foreground'}`}>
                      {s.l}
                      <span className="block text-[10px] font-normal opacity-70">{s.sub}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tipo entrada/saida */}
              <div className="grid grid-cols-2 gap-2">
                {[{ v: 'entrada', l: '+ Entrada', cor: 'border-green-400 bg-green-50 text-green-700' }, { v: 'saida', l: '− Saída', cor: 'border-red-400 bg-red-50 text-red-600' }].map(t => (
                  <button key={t.v} onClick={() => setAjuste(a => ({ ...a, tipo: t.v }))}
                    className={`py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${ajuste.tipo === t.v ? t.cor : 'border-border text-muted-foreground hover:border-border'}`}>
                    {t.l}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block font-semibold">Produto *</label>
                {produtoAjuste ? (
                  <div className="flex items-center gap-2 bg-muted/40 border border-border rounded-xl px-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{produtoAjuste.nome}</p>
                      <p className="text-xs text-muted-foreground font-mono">{produtoAjuste.codigo || '—'}</p>
                    </div>
                    <button
                      onClick={() => { setAjuste(a => ({ ...a, produto_id: '' })); setBuscaProdutoAjuste(''); setTimeout(() => inputBipagemRef.current?.focus(), 0); }}
                      className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground flex-shrink-0"
                    >
                      <X size={15} />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="relative">
                      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        ref={inputBipagemRef}
                        value={buscaProdutoAjuste}
                        onChange={e => { setBuscaProdutoAjuste(e.target.value); setMostrarListaAjuste(true); }}
                        onFocus={() => setMostrarListaAjuste(true)}
                        onBlur={() => setTimeout(() => setMostrarListaAjuste(false), 150)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleEnterBusca(); } }}
                        placeholder="Digite o nome, bipe ou digite o código..."
                        className="w-full border border-border rounded-xl pl-9 pr-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    {mostrarListaAjuste && produtosFiltradosAjuste.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-card border border-border rounded-xl shadow-lg max-h-56 overflow-y-auto">
                        {produtosFiltradosAjuste.map(p => (
                          <button
                            key={p.id}
                            onClick={() => selecionarProdutoAjuste(p)}
                            className="w-full text-left px-3 py-2 hover:bg-muted transition-colors flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <p className="text-sm text-foreground truncate">{p.nome}</p>
                              <p className="text-xs text-muted-foreground font-mono">{p.codigo || '—'}</p>
                            </div>
                            <span className="text-xs text-muted-foreground flex-shrink-0">Lacrado: {p.estoque_atual || 0} · Avulso: {fracionados[p.id] || 0}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {mostrarListaAjuste && buscaProdutoAjuste.trim() && produtosFiltradosAjuste.length === 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-card border border-border rounded-xl shadow-lg px-3 py-3 text-xs text-muted-foreground">
                        Nenhum produto encontrado para "{buscaProdutoAjuste}"
                      </div>
                    )}
                  </div>
                )}
                {produtoAjuste && (() => {
                  const saldo = ajuste.estoque === 'desmontado'
                    ? (fracionados[produtoAjuste.id] || 0)
                    : (produtoAjuste.estoque_atual || 0);
                  return (
                    <div className="mt-2 flex items-center gap-3 bg-muted/40 rounded-xl px-3 py-2">
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">
                          Saldo {ajuste.estoque === 'desmontado' ? 'avulso' : 'lacrado'}
                        </p>
                        <p className="text-lg font-bold text-foreground">{saldo} <span className="text-xs font-normal text-muted-foreground">{produtoAjuste.unidade || 'un'}</span></p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Após ajuste</p>
                        <p className={`text-lg font-bold ${ajuste.tipo === 'entrada' ? 'text-green-600' : 'text-red-500'}`}>
                          {ajuste.tipo === 'entrada' ? saldo + (ajuste.quantidade || 0) : Math.max(0, saldo - (ajuste.quantidade || 0))}
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block font-semibold">Quantidade *</label>
                <input type="number" min="1" value={ajuste.quantidade}
                  onChange={e => setAjuste(a => ({ ...a, quantidade: Number(e.target.value) }))}
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block font-semibold">Motivo</label>
                <input value={ajuste.motivo} onChange={e => setAjuste(a => ({ ...a, motivo: e.target.value }))}
                  placeholder="Ex: inventário, devolução, quebra..."
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={ajustarEstoque} disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity">
                  <Check size={15} /> {loading ? 'Salvando...' : 'Confirmar Ajuste'}
                </button>
                <button onClick={fecharModalAjuste}
                  className="px-5 border border-border rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </PullToRefresh>
  );
}