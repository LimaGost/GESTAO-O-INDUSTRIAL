import { useEffect, useState, useMemo, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import {
  ShoppingCart, Search, X, Plus, Link2, RefreshCw,
  CheckCircle, Clock, Package, Truck, Ban, FileText, Eye, Zap
} from 'lucide-react';
import ModalGrupamento from '@/components/pedidos/ModalGrupamento';
import ModalProcessarBling from '@/components/pedidos/ModalProcessarBling';
import ModalNovoPedido from '@/components/pedidos/ModalNovoPedido';
import PedidoKanbanCard from '@/components/pedidos/PedidoKanbanCard';
import ModalDetalhesPedido from '@/components/pedidos/ModalDetalhesPedido';
import { gerarNumero, gerarLote } from '@/lib/numeracao';
import { registrarLog } from '@/lib/audit';
import { usePermissoes } from '@/lib/usePermissoes.jsx';

const VALOR_OCULTO = '••••••';

const COLUNAS_KANBAN = [
  { key: 'rascunho',           label: 'Rascunho',       color: '#64748B', bg: '#F8FAFC', border: '#CBD5E1', icon: FileText },
  { key: 'aguardando_estoque', label: 'Ag. Estoque',    color: '#F59E0B', bg: '#FFFBEB', border: '#FCD34D', icon: Clock },
  { key: 'separacao',          label: 'Em Separação',   color: '#3B82F6', bg: '#EFF6FF', border: '#93C5FD', icon: Package },
  { key: 'separado',           label: 'Separado',       color: '#22C55E', bg: '#F0FDF4', border: '#86EFAC', icon: CheckCircle },
  { key: 'expedido',           label: 'Expedido',       color: '#F97316', bg: '#FFF7ED', border: '#FDBA74', icon: Truck },
  { key: 'entregue',           label: 'Entregue',       color: '#10B981', bg: '#ECFDF5', border: '#6EE7B7', icon: CheckCircle },
  { key: 'cancelado',          label: 'Cancelado',      color: '#EF4444', bg: '#FFF5F5', border: '#FCA5A5', icon: Ban },
];

export default function Pedidos() {
  const { somenteLeitura, ocultarFinanceiro } = usePermissoes();
  const readonly = somenteLeitura('Pedidos');
  const ocultarValores = ocultarFinanceiro('Pedidos');

  const [pedidos, setPedidos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [expedicoes, setExpedicoes] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');
  const [colunasVisiveis, setColunasVisiveis] = useState(['rascunho', 'aguardando_estoque', 'separacao', 'separado', 'expedido']);
  const [pedidoDetalhes, setPedidoDetalhes] = useState(null);
  const [pedidoBlingProcessar, setPedidoBlingProcessar] = useState(null);
  const [processandoBling, setProcessandoBling] = useState(false);
  const [user, setUser] = useState(null);
  const [showGrupamento, setShowGrupamento] = useState(false);
  const [showFiltros, setShowFiltros] = useState(false);
  const [sincronizandoBling, setSincronizandoBling] = useState(false);
  const loadingRef = useRef(false);
  const staticLoadedRef = useRef(false);

  // Carrega todos os dados em paralelo, com guard contra chamadas simultâneas e retry
  const load = async (tentativa = 0) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const [p, exp, gps] = await Promise.all([
        base44.entities.Pedido.list('-created_date'),
        base44.entities.Expedicao.list(),
        base44.entities.GrupoPedidos.list().catch(() => []),
      ]);
      setPedidos(p);
      setExpedicoes(exp);
      setGrupos(gps.filter(g => g.status !== 'desfeito'));
    } catch (erro) {
      if (erro.message?.includes('Rate limit') && tentativa < 3) {
        const delay = Math.pow(2, tentativa) * 1000;
        await new Promise(r => setTimeout(r, delay));
        loadingRef.current = false;
        return load(tentativa + 1);
      }
      console.error('Erro ao carregar pedidos:', erro);
    } finally {
      loadingRef.current = false;
    }
  };

  // Carrega dados estáticos (clientes, produtos) apenas uma vez
  const loadStatic = async () => {
    if (staticLoadedRef.current) return;
    staticLoadedRef.current = true;
    const [c, pr] = await Promise.all([
      base44.entities.Cliente.list(),
      base44.entities.Produto.list(),
    ]);
    setClientes(c);
    setProdutos(pr);
  };

  useEffect(() => {
    Promise.all([load(), loadStatic(), base44.auth.me().then(setUser).catch(() => {})]);
  }, []);

  const podeEditarPrecos = user?.role === 'vendedor' || user?.role === 'admin';

  const sincronizarBling = async () => {
    setSincronizandoBling(true);
    try {
      const hoje = new Date().toISOString().split('T')[0];
      const res = await base44.functions.invoke('blingSincronizar', { dataInicio: hoje, dataFim: hoje });
      const { importados = 0, duplicados = 0 } = res?.data || {};
      if (importados > 0) alert(`✅ ${importados} pedido(s) importado(s) do Bling!`);
      else alert(`Nenhum pedido novo encontrado hoje. (${duplicados} já existiam)`);
    } catch (e) {
      alert('Erro ao sincronizar com o Bling. Verifique a conexão nas Configurações.');
    }
    await load();
    setSincronizandoBling(false);
  };

  const salvarPrecos = async (pedido, precosEditados) => {
    if (!pedido?.id || Object.keys(precosEditados).length === 0) return;
    const getPrecoOriginal = (item) =>
      item.preco_unitario || item.valor_unitario ||
      (item.total && item.quantidade ? item.total / item.quantidade : 0);
    const itensAtualizados = (pedido.itens || []).map((item, i) => {
      const novoPreco = precosEditados[i];
      if (novoPreco === undefined) return item;
      return { ...item, preco_unitario: novoPreco, valor_unitario: novoPreco, total: novoPreco * item.quantidade };
    });
    const novoTotal = itensAtualizados.reduce((s, i) => s + (i.total || 0), 0);
    await base44.entities.Pedido.update(pedido.id, { itens: itensAtualizados, valor_total: novoTotal });
    for (const [idx, novoPreco] of Object.entries(precosEditados)) {
      const item = (pedido.itens || [])[Number(idx)];
      if (!item) continue;
      const precoAnterior = getPrecoOriginal(item);
      await registrarLog('Pedido', pedido.id, 'EDICAO_PRECO',
        `Preco de "${item.produto_nome}" alterado de R$${precoAnterior.toFixed(2)} para R$${Number(novoPreco).toFixed(2)} por ${user?.full_name || user?.email || 'vendedor'}`);
    }
    setPedidos(prev => prev.map(p => p.id === pedido.id ? { ...p, itens: itensAtualizados, valor_total: novoTotal } : p));
    await load();
  };

  const confirmarPedido = async (form) => {
    if (!form.cliente_nome || form.itens.length === 0) return;
    setLoading(true);

    const mapaItens = {};
    for (const item of form.itens) {
      if (!item.produto_id || item.quantidade <= 0) continue;
      if (mapaItens[item.produto_id]) {
        mapaItens[item.produto_id].quantidade += item.quantidade;
        mapaItens[item.produto_id].total = (mapaItens[item.produto_id].total || 0) + (item.total || 0);
      } else {
        mapaItens[item.produto_id] = { ...item };
      }
    }
    const itensAgrupados = Object.values(mapaItens);

    const itensComEstoque = [];
    const itensSemEstoque = [];
    for (const item of itensAgrupados) {
      const p = produtos.find(pr => pr.id === item.produto_id);
      if (!p) continue;
      if ((p.estoque_atual || 0) >= item.quantidade) {
        itensComEstoque.push({ ...item, produto: p, reposicao: (p.estoque_atual - item.quantidade) < (p.estoque_minimo || 0) });
      } else {
        itensSemEstoque.push({ ...item, produto: p, quantidadeFalta: item.quantidade - (p.estoque_atual || 0) });
      }
    }

    const precisaProducao = itensSemEstoque.length > 0;
    const numero = gerarNumero('PED');
    const valorTotal = form.itens.reduce((s, i) => s + (i.total || 0), 0);
    const status = precisaProducao ? 'aguardando_estoque' : 'separacao';

    const pedido = await base44.entities.Pedido.create({
      ...form,
      numero,
      status,
      valor_total: valorTotal,
      ordens_producao_ids: [],
    });

    const idsOrdens = [];

    for (const item of itensComEstoque) {
      const novoEstoque = (item.produto.estoque_atual || 0) - item.quantidade;
      await base44.entities.Produto.update(item.produto_id, { estoque_atual: novoEstoque });
      await registrarLog('Produto', item.produto_id, 'BAIXA_ESTOQUE', `Baixa de ${item.quantidade} para pedido ${numero}`);
    }

    const todosItensOP = [
      ...itensComEstoque.map(i => ({ produto_id: i.produto_id, produto_nome: i.produto_nome, quantidade: i.quantidade, disponivel: true })),
      ...itensSemEstoque.map(i => ({ produto_id: i.produto_id, produto_nome: i.produto_nome, quantidade: i.quantidadeFalta, disponivel: false })),
    ];

    const statusOP = precisaProducao ? 'a_produzir' : 'em_embalagem';
    const opData = {
      numero: gerarNumero('OP'),
      produto_nome: `Pedido ${numero}`,
      quantidade: todosItensOP.reduce((s, i) => s + i.quantidade, 0),
      itens: todosItensOP,
      status: statusOP,
      pedido_id: pedido.id,
      pedido_numero: numero,
      origem: 'pedido',
    };
    if (!precisaProducao) {
      opData.data_embalagem = new Date().toISOString();
      opData.lote = gerarLote(pedido.id);
    }
    const ordem = await base44.entities.OrdemProducao.create(opData);
    idsOrdens.push(ordem.id);

    const logMsg = precisaProducao
      ? `OP única para pedido ${numero} — ${itensComEstoque.length} item(s) com estoque + ${itensSemEstoque.length} item(s) para produção`
      : `OP única para pedido ${numero} — todos os ${itensComEstoque.length} item(s) disponíveis em estoque`;
    await registrarLog('OrdemProducao', ordem.id, precisaProducao ? 'CRIACAO_AUTOMATICA' : 'CRIACAO_EMBALAGEM_DIRETA', logMsg);

    if (idsOrdens.length > 0) {
      await base44.entities.Pedido.update(pedido.id, { ordens_producao_ids: idsOrdens });
    }

    await registrarLog('Pedido', pedido.id, 'CRIACAO', `Pedido ${numero} criado. Status: ${status}`);
    setShowForm(false);
    await load();
    setLoading(false);
    // Abre detalhes do pedido recém-criado
    const pedidoAtualizado = await base44.entities.Pedido.filter({ id: pedido.id });
    if (pedidoAtualizado[0]) setPedidoDetalhes(pedidoAtualizado[0]);
  };

  const processarPedidoBling = async (itensVinculados) => {
    const pedido = pedidoBlingProcessar;
    setProcessandoBling(true);

    const mapaItens = {};
    for (const item of itensVinculados) {
      if (!item.produto_id || item.quantidade <= 0) continue;
      if (mapaItens[item.produto_id]) {
        mapaItens[item.produto_id].quantidade += item.quantidade;
        mapaItens[item.produto_id].total = (mapaItens[item.produto_id].total || 0) + (item.total || 0);
      } else {
        mapaItens[item.produto_id] = { ...item };
      }
    }
    const itensAgrupados = Object.values(mapaItens);

    const itensComEstoque = [];
    const itensSemEstoque = [];
    for (const item of itensAgrupados) {
      const p = produtos.find(pr => pr.id === item.produto_id);
      if (!p) continue;
      if ((p.estoque_atual || 0) >= item.quantidade) {
        itensComEstoque.push({ ...item, produto: p });
      } else {
        itensSemEstoque.push({ ...item, produto: p, quantidadeFalta: item.quantidade - (p.estoque_atual || 0) });
      }
    }

    const precisaProducao = itensSemEstoque.length > 0;
    const status = precisaProducao ? 'aguardando_estoque' : 'separacao';
    const numero = pedido.numero || gerarNumero('PED');

    await base44.entities.Pedido.update(pedido.id, { itens: itensVinculados, status, numero });

    for (const item of itensComEstoque) {
      const novoEstoque = (item.produto.estoque_atual || 0) - item.quantidade;
      await base44.entities.Produto.update(item.produto_id, { estoque_atual: novoEstoque });
      await registrarLog('Produto', item.produto_id, 'BAIXA_ESTOQUE', `Baixa de ${item.quantidade} para pedido Bling ${numero}`);
    }

    const todosItensOP = [
      ...itensComEstoque.map(i => ({ produto_id: i.produto_id, produto_nome: i.produto_nome, quantidade: i.quantidade, disponivel: true })),
      ...itensSemEstoque.map(i => ({ produto_id: i.produto_id, produto_nome: i.produto_nome, quantidade: i.quantidadeFalta, disponivel: false })),
    ];

    const statusOP = precisaProducao ? 'a_produzir' : 'em_embalagem';
    const opData = {
      numero: gerarNumero('OP'),
      produto_nome: `Pedido ${numero}`,
      quantidade: todosItensOP.reduce((s, i) => s + i.quantidade, 0),
      itens: todosItensOP,
      status: statusOP,
      pedido_id: pedido.id,
      pedido_numero: numero,
      origem: 'bling',
    };
    if (!precisaProducao) {
      opData.data_embalagem = new Date().toISOString();
      opData.lote = gerarLote(pedido.id);
    }
    const ordem = await base44.entities.OrdemProducao.create(opData);
    await base44.entities.Pedido.update(pedido.id, { ordens_producao_ids: [ordem.id] });
    await registrarLog('Pedido', pedido.id, 'PROCESSAMENTO_BLING', `Pedido Bling ${numero} processado. Status: ${status}`);

    setProcessandoBling(false);
    setPedidoBlingProcessar(null);
    await load();
    const pedidoAtualizado = await base44.entities.Pedido.filter({ id: pedido.id });
    if (pedidoAtualizado[0]) setPedidoDetalhes(pedidoAtualizado[0]);
  };

  const cancelarPedido = async (id, numero) => {
    if (!confirm(`Cancelar pedido ${numero}? As ordens de produção vinculadas também serão canceladas.`)) return;
    await base44.entities.Pedido.update(id, { status: 'cancelado' });
    // Cancela OPs vinculadas no Kanban
    const todasOPs = await base44.entities.OrdemProducao.list();
    const opsVinculadas = todasOPs.filter(o => o.pedido_id === id && !['finalizado', 'cancelado'].includes(o.status));
    await Promise.all(opsVinculadas.map(op =>
      base44.entities.OrdemProducao.update(op.id, { status: 'cancelado' })
    ));
    await registrarLog('Pedido', id, 'CANCELAMENTO', `Pedido ${numero} cancelado. ${opsVinculadas.length} OP(s) cancelada(s).`);
    await load();
  };

  const expedir = async (pedido) => {
    if (!confirm(`Encaminhar pedido ${pedido.numero} para expedição?`)) return;
    const numero_nf = gerarNumero('NF');
    const hoje = new Date().toISOString().split('T')[0];
    await base44.entities.Expedicao.create({
      numero_nf,
      pedido_id: pedido.id,
      pedido_numero: pedido.numero,
      cliente_id: pedido.cliente_id || '',
      cliente_nome: pedido.cliente_nome,
      itens: pedido.itens || [],
      status: 'emitida',
      data_emissao: hoje,
      valor_total: pedido.valor_total || 0,
    });
    await base44.entities.Pedido.update(pedido.id, { status: 'expedido' });
    await registrarLog('Pedido', pedido.id, 'EXPEDICAO', `Pedido ${pedido.numero} encaminhado para expedição. NF: ${numero_nf}`);
    await load();
    alert(`✅ Pedido ${pedido.numero} encaminhado para expedição!`);
  };

  const statusEfetivo = (pedido) => {
    if (pedido.status === 'expedido') {
      const exp = expedicoes.find(e => e.pedido_id === pedido.id);
      if (exp?.confirmado_pelo_cliente || exp?.status === 'entregue') return 'entregue';
    }
    return pedido.status;
  };

  const grupoMap = useMemo(() => {
    const m = {};
    for (const g of grupos) {
      for (const pid of (g.pedidos_ids || [])) m[pid] = g;
    }
    return m;
  }, [grupos]);

  const pedidosFiltrados = useMemo(() => {
    if (!busca.trim()) return pedidos;
    const b = busca.toLowerCase();
    return pedidos.filter(p =>
      (p.numero || '').toLowerCase().includes(b) ||
      (p.cliente_nome || '').toLowerCase().includes(b) ||
      (p.itens || []).some(i => (i.produto_nome || '').toLowerCase().includes(b))
    );
  }, [pedidos, busca]);

  const totalPorStatus = useMemo(() => {
    const m = {};
    for (const c of COLUNAS_KANBAN) {
      m[c.key] = pedidos.filter(p => statusEfetivo(p) === c.key).length;
    }
    return m;
  }, [pedidos, expedicoes]);

  const totalPedidos = pedidos.filter(p => !['cancelado'].includes(p.status)).length;
  const totalValor = pedidos
    .filter(p => !['cancelado'].includes(p.status))
    .reduce((s, p) => s + (p.valor_total || 0), 0);

  const toggleColuna = (key) => {
    setColunasVisiveis(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* ── Header ── */}
      <div className="bg-card border border-border rounded-2xl px-5 py-4 flex-shrink-0">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-blue/10 flex items-center justify-center">
              <ShoppingCart size={19} className="text-sky-blue" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Pedidos</h2>
              <p className="text-xs text-muted-foreground">
                {totalPedidos} ativo(s) · {ocultarValores ? VALOR_OCULTO : `R$ ${totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em aberto`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Busca */}
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={busca} onChange={e => setBusca(e.target.value)}
                placeholder="Buscar pedido..."
                className="border border-border rounded-xl pl-8 pr-8 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary w-44" />
              {busca && (
                <button onClick={() => setBusca('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X size={13} />
                </button>
              )}
            </div>
            <button onClick={load} className="p-2.5 border border-border rounded-xl hover:bg-muted transition-colors">
              <RefreshCw size={15} className="text-muted-foreground" />
            </button>
            <button onClick={sincronizarBling} disabled={sincronizandoBling}
              className="flex items-center gap-1.5 border border-orange-300 text-orange-700 bg-orange-50 px-3 py-2 rounded-xl text-sm font-medium hover:bg-orange-100 transition-colors disabled:opacity-50">
              <Zap size={14} className={sincronizandoBling ? 'animate-pulse' : ''} />
              {sincronizandoBling ? 'Buscando...' : 'Bling'}
            </button>
            <button onClick={() => setShowFiltros(v => !v)}
              className={`p-2.5 border rounded-xl hover:bg-muted transition-colors ${showFiltros ? 'border-primary/30 bg-primary/10' : 'border-border'}`}>
              <Eye size={15} className={showFiltros ? 'text-primary' : 'text-muted-foreground'} />
            </button>
            <button onClick={() => setShowGrupamento(true)}
              className="flex items-center gap-1.5 border border-violet-300 text-violet-700 bg-violet-50 px-3 py-2 rounded-xl text-sm font-medium hover:bg-violet-100 transition-colors">
              <Link2 size={14} /> Grupos
              {grupos.length > 0 && (
                <span className="text-xs bg-violet-200 text-violet-800 px-1.5 py-0.5 rounded-full font-bold">{grupos.length}</span>
              )}
            </button>
            {!readonly ? (
              <button onClick={() => setShowForm(true)}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm">
                <Plus size={16} /> Novo Pedido
              </button>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-3 py-2 rounded-xl">
                <Eye size={13} /> Somente visualização
              </span>
            )}
          </div>
        </div>

        {/* Stats rápidas */}
        <div className="mt-4 grid grid-cols-4 md:grid-cols-7 gap-2">
          {COLUNAS_KANBAN.map(col => {
            const count = totalPorStatus[col.key] || 0;
            const Icon = col.icon;
            return (
              <button key={col.key}
                onClick={() => toggleColuna(col.key)}
                className={`text-center p-2 rounded-xl border transition-all ${colunasVisiveis.includes(col.key) ? 'border-transparent shadow-sm' : 'border-border opacity-50'}`}
                style={colunasVisiveis.includes(col.key) ? { background: col.bg, borderColor: col.border } : {}}>
                <div className="flex items-center justify-center mb-1">
                  <Icon size={11} style={{ color: col.color }} />
                </div>
                <p className="text-base font-bold text-foreground">{count}</p>
                <p className="text-[9px] text-muted-foreground leading-tight hidden sm:block">{col.label}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Filtro colunas visíveis ── */}
      {showFiltros && (
        <div className="bg-card border border-border rounded-2xl px-5 py-3 flex-shrink-0">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Colunas visíveis no Kanban:</p>
          <div className="flex gap-2 flex-wrap">
            {COLUNAS_KANBAN.map(col => (
              <button key={col.key} onClick={() => toggleColuna(col.key)}
                className="text-xs px-3 py-1.5 rounded-lg font-semibold border transition-all"
                style={colunasVisiveis.includes(col.key)
                  ? { background: col.bg, borderColor: col.border, color: col.color }
                  : { background: 'transparent', borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }
                }>
                {col.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Kanban Board ── */}
      <div className="flex gap-4 overflow-x-auto pb-4 flex-1 items-start">
        {COLUNAS_KANBAN.filter(c => colunasVisiveis.includes(c.key)).map(coluna => {
          const Icon = coluna.icon;
          const cardsDaColuna = pedidosFiltrados.filter(p => statusEfetivo(p) === coluna.key);
          const count = totalPorStatus[coluna.key] || 0;

          // Separa agrupados dos não agrupados
          const gruposNaColuna = {};
          const naoAgrupados = [];
          for (const card of cardsDaColuna) {
            const grupo = grupoMap[card.id];
            if (grupo) {
              if (!gruposNaColuna[grupo.id]) gruposNaColuna[grupo.id] = { grupo, cards: [] };
              gruposNaColuna[grupo.id].cards.push(card);
            } else {
              naoAgrupados.push(card);
            }
          }

          return (
            <div key={coluna.key}
              className="flex-shrink-0 w-72 rounded-2xl flex flex-col overflow-hidden"
              style={{ minHeight: '60vh', background: coluna.bg, border: `1.5px solid ${coluna.border}` }}>

              {/* Coluna header */}
              <div className="px-4 py-3 flex items-center justify-between sticky top-0 z-10"
                style={{ background: coluna.bg, borderBottom: `1px solid ${coluna.border}` }}>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: coluna.color }} />
                  <Icon size={13} style={{ color: coluna.color }} />
                  <span className="text-xs font-bold tracking-wide" style={{ color: coluna.color }}>
                    {coluna.label.toUpperCase()}
                  </span>
                </div>
                <span className="text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full text-white"
                  style={{ background: coluna.color, opacity: count === 0 ? 0.4 : 1 }}>
                  {count}
                </span>
              </div>

              {/* Cards */}
              <div className="flex-1 p-3 overflow-y-auto space-y-3">
                {cardsDaColuna.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 opacity-30">
                    <div className="w-10 h-10 rounded-full border-2 border-dashed flex items-center justify-center mb-2"
                      style={{ borderColor: coluna.color }}>
                      <Icon size={16} style={{ color: coluna.color }} />
                    </div>
                    <p className="text-xs text-muted-foreground">Sem pedidos</p>
                  </div>
                ) : (
                  <>
                    {/* Grupos */}
                    {Object.values(gruposNaColuna).map(({ grupo, cards }) => (
                      <div key={`grp-${grupo.id}`} className="border border-violet-300 rounded-2xl overflow-hidden">
                        <div className="px-3 py-2 bg-violet-100 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-xs">🔗</span>
                            <span className="text-xs font-bold text-violet-800 truncate">{grupo.cliente_nome}</span>
                          </div>
                          <span className="text-[10px] bg-violet-200 text-violet-700 px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0">
                            {cards.length} ped.
                          </span>
                        </div>
                        <div className="bg-violet-50/50 p-2 space-y-2">
                          {cards.map(card => (
                            <PedidoKanbanCard
                              key={card.id}
                              pedido={card}
                              grupo={grupo}
                              statusEfetivo={statusEfetivo(card)}
                              ocultarValores={ocultarValores}
                              readonly={readonly}
                              onVerDetalhes={setPedidoDetalhes}
                              onExpedir={expedir}
                              onCancelar={cancelarPedido}
                              onProcessarBling={setPedidoBlingProcessar}
                            />
                          ))}
                        </div>
                      </div>
                    ))}

                    {/* Não agrupados */}
                    {naoAgrupados.map(card => (
                      <PedidoKanbanCard
                        key={card.id}
                        pedido={card}
                        grupo={null}
                        statusEfetivo={statusEfetivo(card)}
                        ocultarValores={ocultarValores}
                        readonly={readonly}
                        onVerDetalhes={setPedidoDetalhes}
                        onExpedir={expedir}
                        onCancelar={cancelarPedido}
                        onProcessarBling={setPedidoBlingProcessar}
                      />
                    ))}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Modais ── */}
      {showForm && (
        <ModalNovoPedido
          clientes={clientes}
          produtos={produtos}
          loading={loading}
          onConfirmar={confirmarPedido}
          onClose={() => setShowForm(false)}
        />
      )}

      {pedidoBlingProcessar && (
        <ModalProcessarBling
          pedido={pedidoBlingProcessar}
          produtos={produtos}
          loading={processandoBling}
          onConfirmar={processarPedidoBling}
          onClose={() => setPedidoBlingProcessar(null)}
        />
      )}

      {showGrupamento && (
        <ModalGrupamento
          pedidos={pedidos}
          grupos={grupos}
          onClose={() => setShowGrupamento(false)}
          onRefresh={load}
        />
      )}

      {pedidoDetalhes && (
        <ModalDetalhesPedido
          pedido={pedidoDetalhes}
          ocultarValores={ocultarValores}
          podeEditarPrecos={podeEditarPrecos}
          onClose={() => setPedidoDetalhes(null)}
          onRefresh={load}
          onSalvarPrecos={salvarPrecos}
        />
      )}
    </div>
  );
}