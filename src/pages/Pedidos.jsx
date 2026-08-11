import { useEffect, useState, useMemo, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import {
  ShoppingCart, Search, X, Plus, RefreshCw,
  CheckCircle, Clock, Package, Truck, Ban, FileText, Eye, Zap, Tag, Layers
} from 'lucide-react';
import ModalGrupamento from '@/components/pedidos/ModalGrupamento';
import ModalProcessarBling from '@/components/pedidos/ModalProcessarBling';
import ModalProcessarPortal from '@/components/pedidos/ModalProcessarPortal';
import ModalNovoPedido from '@/components/pedidos/ModalNovoPedido';
import PedidoKanbanCard from '@/components/pedidos/PedidoKanbanCard';
import GrupoPedidosResumoCard from '@/components/pedidos/GrupoPedidosResumoCard';
import DicaColuna from '@/components/common/DicaColuna';
import ModalDetalhesPedido from '@/components/pedidos/ModalDetalhesPedido';
import ModalSincronizarBling from '@/components/pedidos/ModalSincronizarBling';
import { gerarNumero, gerarLote } from '@/lib/numeracao';
import { registrarLog } from '@/lib/audit';
import { alocarPedido } from '@/lib/alocacaoPedido';
import { usePermissoes } from '@/lib/usePermissoes.jsx';
import PullToRefresh from '@/components/PullToRefresh';


const VALOR_OCULTO = '••••••';

const COLUNAS_KANBAN = [
  { key: 'pendente',  label: 'Pendente',  color: '#F59E0B', bg: '#FFFBEB', border: '#FCD34D', icon: Clock },
  { key: 'expedido',  label: 'Expedido',  color: '#F97316', bg: '#FFF7ED', border: '#FDBA74', icon: Truck },
  { key: 'entregue',  label: 'Entregue',  color: '#10B981', bg: '#ECFDF5', border: '#6EE7B7', icon: CheckCircle },
  { key: 'cancelado', label: 'Cancelado', color: '#EF4444', bg: '#FFF5F5', border: '#FCA5A5', icon: Ban },
];

export default function Pedidos() {
  const { somenteLeitura, ocultarFinanceiro } = usePermissoes();
  const readonly = somenteLeitura('Pedidos');
  const ocultarValores = ocultarFinanceiro('Pedidos');

  const [pedidos, setPedidos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [expedicoes, setExpedicoes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');
  const [colunasVisiveis, setColunasVisiveis] = useState(['pendente', 'expedido', 'entregue']);
  const [pedidoDetalhes, setPedidoDetalhes] = useState(null);
  const [pedidoBlingProcessar, setPedidoBlingProcessar] = useState(null);
  const [processandoBling, setProcessandoBling] = useState(false);
  const [pedidoPortalProcessar, setPedidoPortalProcessar] = useState(null);
  const [processandoPortal, setProcessandoPortal] = useState(false);
  const [user, setUser] = useState(null);
  const [showFiltros, setShowFiltros] = useState(false);
  const [filtroWL, setFiltroWL] = useState(false);
  const [sincronizandoBling, setSincronizandoBling] = useState(false);
  const [showModalBling, setShowModalBling] = useState(false);
  const [showGrupamento, setShowGrupamento] = useState(false);
  const [grupos, setGrupos] = useState([]);
  const loadingRef = useRef(false);
  const staticLoadedRef = useRef(false);

  // Carrega todos os dados em paralelo, com guard contra chamadas simultâneas e retry
  const load = async (tentativa = 0) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const [p, exp, grp] = await Promise.all([
        base44.entities.Pedido.list('-created_date'),
        base44.entities.Expedicao.list(),
        base44.entities.GrupoPedidos.filter({ status: 'ativo' }).catch(() => []),
      ]);
      setPedidos(p);
      setExpedicoes(exp);
      setGrupos(grp);
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
    const init = async () => {
      await load();
      await new Promise(r => setTimeout(r, 300));
      await loadStatic();
      base44.auth.me().then(setUser).catch(() => {});
    };
    init();
  }, []);

  // Tempo real: quando a entrega é confirmada no Kanban de Expedição, o card move para "Entregue" automaticamente
  useEffect(() => {
    const unsubscribe = base44.entities.Expedicao.subscribe(() => { load(); });
    return () => unsubscribe();
  }, []);

  // Data de confirmação de entrega por pedido (para ordenar o quadro Entregue — mais recente no topo)
  const dataEntregaPorPedido = useMemo(() => {
    const m = {};
    for (const e of expedicoes) {
      if (!e.pedido_id) continue;
      if (e.status === 'entregue' || e.confirmado_pelo_cliente) {
        const d = e.data_confirmacao_cliente || e.data_entrega || e.updated_date || '';
        if (!m[e.pedido_id] || d > m[e.pedido_id]) m[e.pedido_id] = d;
      }
    }
    return m;
  }, [expedicoes]);

  const podeEditarPrecos = user?.role === 'vendedor' || user?.role === 'admin';

  const sincronizarBling = async ({ dataInicio, dataFim }) => {
    setSincronizandoBling(true);
    setShowModalBling(false);
    try {
      const res = await base44.functions.invoke('blingSincronizar', { dataInicio, dataFim });
      const { importados = 0, duplicados = 0 } = res?.data || {};
      if (importados > 0) alert(`✅ ${importados} pedido(s) importado(s) do Bling!`);
      else alert(`Nenhum pedido novo encontrado no período. (${duplicados} já existiam)`);
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

  const confirmarReservaManual = async (pedido) => {
    setLoading(true);
    const itens = (pedido.itens || []).filter(i => i.produto_id && i.quantidade > 0);
    const { status } = await alocarPedido({ pedido, itens, produtos, origem: 'pedido' });
    await registrarLog('Pedido', pedido.id, 'RESERVA_CONFIRMADA',
      `Reserva de estoque confirmada manualmente para o pedido ${pedido.numero}. Status: ${status}`);
    await load();
    setLoading(false);
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

    const numero = gerarNumero('PED');
    const valorTotal = form.itens.reduce((s, i) => s + (i.total || 0), 0);

    const pedido = await base44.entities.Pedido.create({
      ...form,
      numero,
      status: 'rascunho',
      origem: form.origem || 'pedido',
      valor_total: valorTotal,
      ordens_producao_ids: [],
    });

    let status = 'rascunho';
    if (form.reservar_estoque_agora !== false) {
      // Alocação inteligente: reserva estoque, cria Separação e OP (parcial) se necessário
      const resultado = await alocarPedido({ pedido, itens: itensAgrupados, produtos, origem: 'pedido' });
      status = resultado.status;
      await registrarLog('Pedido', pedido.id, 'CRIACAO', `Pedido ${numero} criado. Status: ${status}`);
    } else {
      // Fica em rascunho — alguém confirma a reserva de estoque depois, manualmente
      await registrarLog('Pedido', pedido.id, 'CRIACAO', `Pedido ${numero} criado como rascunho — aguardando confirmação manual de reserva de estoque`);
    }
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

    const numero = pedido.numero || gerarNumero('PED');
    await base44.entities.Pedido.update(pedido.id, { itens: itensVinculados, numero });

    // Alocação inteligente: reserva estoque, cria Separação e OP (parcial) se necessário
    const { status } = await alocarPedido({ pedido: { ...pedido, numero, itens: itensVinculados }, itens: itensAgrupados, produtos, origem: 'bling' });
    await registrarLog('Pedido', pedido.id, 'PROCESSAMENTO_BLING', `Pedido Bling ${numero} processado. Status: ${status}`);

    setProcessandoBling(false);
    setPedidoBlingProcessar(null);
    await load();
    const pedidoAtualizado = await base44.entities.Pedido.filter({ id: pedido.id });
    if (pedidoAtualizado[0]) setPedidoDetalhes(pedidoAtualizado[0]);
  };

  const processarPedidoPortal = async (itensVinculados) => {
    const pedido = pedidoPortalProcessar;
    setProcessandoPortal(true);

    const numero = pedido.numero;
    await base44.entities.Pedido.update(pedido.id, { itens: itensVinculados });

    // Alocação inteligente: reserva estoque, cria Separação e OP (parcial) se necessário
    const { status } = await alocarPedido({ pedido: { ...pedido, itens: itensVinculados }, itens: itensVinculados.filter(i => i.produto_id), produtos, origem: 'portal' });
    await registrarLog('Pedido', pedido.id, 'PROCESSAMENTO_PORTAL', `Pedido Portal ${numero} processado. Status: ${status}`);

    setProcessandoPortal(false);
    setPedidoPortalProcessar(null);
    await load();
    const pedidoAtualizado = await base44.entities.Pedido.filter({ id: pedido.id });
    if (pedidoAtualizado[0]) setPedidoDetalhes(pedidoAtualizado[0]);
  };

  const cancelarPedido = async (id, numero) => {
    if (!confirm(`Cancelar pedido ${numero}?\n\nIsso irá cancelar TODOS os cards vinculados (produção, separação e expedição) e restaurar o estoque dos itens já separados.`)) return;

    const pedidoParaCancelar = pedidos.find(p => p.id === id);
    if (!pedidoParaCancelar) return;

    const { cancelarPedidoEmCascata } = await import('@/lib/cancelamentoCascata');
    await cancelarPedidoEmCascata(pedidoParaCancelar);
    await load();
  };

  const avancarParaSeparado = async (pedido) => {
    await base44.entities.Pedido.update(pedido.id, { status: 'separado' });
    await registrarLog('Pedido', pedido.id, 'STATUS', `Pedido ${pedido.numero} marcado como Separado manualmente`);
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
      pedido_criado_por_id: pedido.created_by_id || null,
      cliente_id: pedido.cliente_id || '',
      cliente_nome: pedido.cliente_nome,
      itens: pedido.itens || [],
      sem_rotulo: !!(pedido.sem_rotulo || (pedido.itens || []).some(i => i.sem_rotulo)),
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
    // Fluxo simplificado: tudo antes da expedição fica em "Pendente"
    if (['rascunho', 'aguardando_estoque', 'separacao', 'separado'].includes(pedido.status)) return 'pendente';
    return pedido.status;
  };

  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter(p => {
      if (filtroWL && !p.white_label) return false;
      if (!busca.trim()) return true;
      const b = busca.toLowerCase();
      return (
        (p.numero || '').toLowerCase().includes(b) ||
        (p.cliente_nome || '').toLowerCase().includes(b) ||
        (p.white_label_marca || '').toLowerCase().includes(b) ||
        (p.itens || []).some(i => (i.produto_nome || '').toLowerCase().includes(b))
      );
    });
  }, [pedidos, busca, filtroWL]);

  // Mapa pedido_id → grupo ativo (para consolidar cards agrupados no Kanban)
  const grupoPorPedido = useMemo(() => {
    const m = {};
    for (const g of grupos) {
      for (const pid of (g.pedidos_ids || [])) m[pid] = g;
    }
    return m;
  }, [grupos]);

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
    <PullToRefresh onRefresh={load}>
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
            <button onClick={() => setShowModalBling(true)} disabled={sincronizandoBling}
              className="flex items-center gap-1.5 border border-orange-300 text-orange-700 bg-orange-50 px-3 py-2 rounded-xl text-sm font-medium hover:bg-orange-100 transition-colors disabled:opacity-50">
              <Zap size={14} className={sincronizandoBling ? 'animate-pulse' : ''} />
              {sincronizandoBling ? 'Buscando...' : 'Bling'}
            </button>
            {!readonly && (
              <button onClick={() => setShowGrupamento(true)}
                className="flex items-center gap-1.5 border border-violet-300 text-violet-700 bg-violet-50 px-3 py-2 rounded-xl text-sm font-medium hover:bg-violet-100 transition-colors">
                <Layers size={14} /> Agrupar{grupos.length > 0 ? ` (${grupos.length})` : ''}
              </button>
            )}
            <button onClick={() => setShowFiltros(v => !v)}
              className={`p-2.5 border rounded-xl hover:bg-muted transition-colors ${showFiltros ? 'border-primary/30 bg-primary/10' : 'border-border'}`}>
              <Eye size={15} className={showFiltros ? 'text-primary' : 'text-muted-foreground'} />
            </button>
            <button onClick={() => setFiltroWL(v => !v)}
              className={`flex items-center gap-1.5 border px-3 py-2 rounded-xl text-sm font-medium transition-colors ${filtroWL ? 'border-purple-400 bg-purple-50 text-purple-700' : 'border-border text-muted-foreground hover:bg-muted'}`}>
              <Tag size={14} /> WL
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
        <div className="mt-4 grid grid-cols-4 gap-2">
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
          let cardsDaColuna = pedidosFiltrados.filter(p => statusEfetivo(p) === coluna.key);
          if (coluna.key === 'entregue') {
            cardsDaColuna = [...cardsDaColuna].sort((a, b) =>
              (dataEntregaPorPedido[b.id] || '').localeCompare(dataEntregaPorPedido[a.id] || '')
            );
          }
          const count = totalPorStatus[coluna.key] || 0;

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
                  <DicaColuna coluna={coluna} kanbanKey="pedidos" accent={coluna.color}
                    proximoLabel={COLUNAS_KANBAN[COLUNAS_KANBAN.findIndex(c => c.key === coluna.key) + 1]?.label || null} />
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
                ) : (() => {
                  const gruposNaColuna = {};
                  const soltos = [];
                  for (const card of cardsDaColuna) {
                    const g = grupoPorPedido[card.id];
                    if (g) {
                      if (!gruposNaColuna[g.id]) gruposNaColuna[g.id] = { grupo: g, pedidos: [] };
                      gruposNaColuna[g.id].pedidos.push(card);
                    } else {
                      soltos.push(card);
                    }
                  }
                  return (
                    <>
                      {Object.values(gruposNaColuna).map(({ grupo, pedidos: pedidosGrupo }) => (
                        <GrupoPedidosResumoCard
                          key={`grp-${grupo.id}`}
                          grupo={grupo}
                          pedidos={pedidosGrupo}
                          accent={coluna.color}
                          ocultarValores={ocultarValores}
                          onVerPedido={setPedidoDetalhes}
                        />
                      ))}
                      {soltos.map(card => (
                        <PedidoKanbanCard
                          key={card.id}
                          pedido={card}
                          statusEfetivo={statusEfetivo(card)}
                          ocultarValores={ocultarValores}
                          readonly={readonly}
                          onVerDetalhes={setPedidoDetalhes}
                          onExpedir={expedir}
                          onCancelar={cancelarPedido}
                          onProcessarBling={setPedidoBlingProcessar}
                          onProcessarPortal={setPedidoPortalProcessar}
                          onConfirmarReserva={confirmarReservaManual}
                          onAvancarSeparado={avancarParaSeparado}
                        />
                      ))}
                    </>
                  );
                })()}
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

      {pedidoPortalProcessar && (
        <ModalProcessarPortal
          pedido={pedidoPortalProcessar}
          produtos={produtos}
          loading={processandoPortal}
          onConfirmar={processarPedidoPortal}
          onClose={() => setPedidoPortalProcessar(null)}
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

      {showModalBling && (
        <ModalSincronizarBling
          loading={sincronizandoBling}
          onConfirmar={sincronizarBling}
          onClose={() => setShowModalBling(false)}
        />
      )}

      {pedidoDetalhes && (
        <ModalDetalhesPedido
          pedido={pedidoDetalhes}
          ocultarValores={ocultarValores}
          podeEditarPrecos={podeEditarPrecos}
          produtos={produtos}
          onClose={() => setPedidoDetalhes(null)}
          onRefresh={load}
          onSalvarPrecos={salvarPrecos}
          onCancelar={readonly ? null : cancelarPedido}
        />
      )}
    </div>
    </PullToRefresh>
  );
}