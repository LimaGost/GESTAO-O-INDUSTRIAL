import { useEffect, useState, useMemo } from 'react';
import { cachedFetch, cacheInvalidate, cacheInvalidateMany, cacheGet, cacheSet } from '@/lib/entityCache';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { registrarLog } from '@/lib/audit';
import { gerarNumero, gerarLote } from '@/lib/numeracao';
import {
  ShoppingCart, Factory, Archive, Truck, AlertTriangle,
  TrendingUp, CheckCircle, Clock, Package, Tag,
  ArrowUpRight, Layers, Flag, Zap, RefreshCw, Activity, Calendar
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  CartesianGrid, Sector
} from 'recharts';
import ExportableChart from '@/components/dashboard/ExportableChart';
import CustomTooltip from '@/components/dashboard/CustomTooltip';
import PeriodFilter from '@/components/dashboard/PeriodFilter';
import { usePermissoes } from '@/lib/usePermissoes.jsx';

const COLORS = ['#F59E0B', '#3B82F6', '#22C55E', '#F97316', '#A855F7', '#EC4899', '#14B8A6'];

const STATUS_LABEL = {
  rascunho: 'Rascunho', aguardando_estoque: 'Ag. Estoque',
  separacao: 'Separação', separado: 'Separado',
  expedido: 'Expedido', cancelado: 'Cancelado', entregue: 'Entregue',
};

function isInRange(dateStr, from, to) {
  if (!dateStr) return true;
  const d = new Date(dateStr);
  if (from && d < new Date(from)) return false;
  if (to) { const t = new Date(to); t.setHours(23, 59, 59); if (d > t) return false; }
  return true;
}

const VALOR_OCULTO = '••••••';

export default function Dashboard() {
  const { somenteLeitura, ocultarFinanceiro } = usePermissoes();
  const readonly = somenteLeitura('Dashboard');
  const ocultarValores = ocultarFinanceiro('Dashboard');
  const [rawData, setRawData]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [criandoOP, setCriandoOP] = useState({});
  const [period, setPeriod]       = useState({ preset: 'all', from: '', to: '' });

  useEffect(() => { load(); }, []);

  async function load(invalidate = false) {
    setLoading(true);
    if (invalidate) {
      cacheInvalidateMany(['Pedido','OrdemProducao','Produto','Expedicao','Etiqueta']);
    }
    const [pedidos, ordens, produtos, expedicoes, etiquetas] = await Promise.all([
      cachedFetch('Pedido',        () => base44.entities.Pedido.list(),        60_000),
      cachedFetch('OrdemProducao', () => base44.entities.OrdemProducao.list(), 30_000),
      cachedFetch('Produto',       () => base44.entities.Produto.list(),       120_000),
      cachedFetch('Expedicao',     () => base44.entities.Expedicao.list(),     60_000),
      cachedFetch('Etiqueta',      () => base44.entities.Etiqueta.list(),      60_000),
    ]);
    setRawData({ pedidos, ordens, produtos, expedicoes, etiquetas });
    setLoading(false);
  }

  const data = useMemo(() => {
    if (!rawData) return null;
    const { pedidos: allPedidos, ordens: allOrdens, produtos, expedicoes, etiquetas } = rawData;
    const { from, to } = period;

    const pedidos = allPedidos.filter(p => isInRange(p.data_pedido || p.created_date, from, to));
    const ordens  = allOrdens.filter(o => isInRange(o.data_inicio || o.created_date, from, to));

    const pedidosAtivos = pedidos.filter(p => !['expedido', 'cancelado'].includes(p.status));
    const faturamentoExpedido = pedidos.filter(p => p.status === 'expedido').reduce((s, p) => s + (p.valor_total || 0), 0);
    const faturamentoPendente = pedidosAtivos.filter(p => p.status !== 'cancelado').reduce((s, p) => s + (p.valor_total || 0), 0);

    const pedidosPorStatus = Object.entries(
      pedidos.reduce((acc, p) => { acc[p.status] = (acc[p.status] || 0) + 1; return acc; }, {})
    ).map(([status, value]) => ({ name: STATUS_LABEL[status] || status, value })).filter(s => s.value > 0);

    const ordensAbertas    = ordens.filter(o => o.status !== 'finalizado');
    const ordensFinalizadas = ordens.filter(o => o.status === 'finalizado');
    const aProduzir   = ordens.filter(o => o.status === 'a_produzir').length;
    const emProducao  = ordens.filter(o => o.status === 'em_producao').length;
    const produzido   = ordens.filter(o => o.status === 'produzido').length;
    const emEmbalagem = ordens.filter(o => o.status === 'em_embalagem').length;

    const producaoPipeline = [
      { name: 'A Produzir', value: aProduzir },
      { name: 'Em Produção', value: emProducao },
      { name: 'Produzido', value: produzido },
      { name: 'Embalagem', value: emEmbalagem },
    ];

    const totalEstoque = produtos.reduce((s, p) => s + (p.estoque_atual || 0), 0);
    const alertasBaixo = produtos.filter(p => (p.estoque_atual || 0) <= (p.estoque_minimo || 0));
    const alertasZero  = alertasBaixo.filter(p => (p.estoque_atual || 0) === 0);
    const top5Estoque  = [...produtos]
      .sort((a, b) => (b.estoque_atual || 0) - (a.estoque_atual || 0)).slice(0, 5)
      .map(p => ({ name: p.nome.length > 18 ? p.nome.slice(0, 18) + '…' : p.nome, estoque: p.estoque_atual || 0 }));

    const expEmitidas  = expedicoes.filter(e => e.status === 'emitida').length;
    const expEnviadas  = expedicoes.filter(e => e.status === 'enviada').length;
    const expEntregues = expedicoes.filter(e => e.status === 'entregue').length;
    const etiqPendentes = etiquetas.filter(e => !e.impresso).length;
    const etiqImpressas = etiquetas.filter(e => e.impresso).length;

    return {
      pedidosAtivos: pedidosAtivos.length, faturamentoExpedido, faturamentoPendente, pedidosPorStatus,
      ordensAbertas: ordensAbertas.length, ordensFinalizadas: ordensFinalizadas.length,
      aProduzir, emProducao, emEmbalagem, producaoPipeline,
      ordensAbertasLista: allOrdens.filter(o => o.status !== 'finalizado'),
      totalEstoque, totalProdutos: produtos.length,
      alertasBaixo: alertasBaixo.length, alertasZero: alertasZero.length,
      alertasProdutos: alertasBaixo, top5Estoque,
      expEmitidas, expEnviadas, expEntregues, etiqPendentes, etiqImpressas,
    };
  }, [rawData, period]);

  const fmt  = (v) => loading ? '—' : String(v ?? '—');
  const fmtR = (v) => {
    if (loading) return '—';
    if (ocultarValores) return VALOR_OCULTO;
    return `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  const criarOPReposicao = async (produto) => {
    const jaTemOP = (data?.ordensAbertasLista || []).some(o => o.produto_id === produto.id && o.origem === 'estoque_minimo');
    if (jaTemOP) { alert(`⚠️ Já existe uma OP de reposição ativa para "${produto.nome}".`); return; }
    setCriandoOP(p => ({ ...p, [produto.id]: true }));
    const qtd = Math.max((produto.estoque_minimo || 10) * 2 - (produto.estoque_atual || 0), produto.estoque_minimo || 10);
    const op = await base44.entities.OrdemProducao.create({
      numero: gerarNumero('OP'), produto_id: produto.id, produto_nome: produto.nome,
      quantidade: qtd, status: 'a_produzir', origem: 'estoque_minimo', lote: gerarLote(produto.id),
    });
    registrarLog('OrdemProducao', op.id, 'CRIACAO_REPOSICAO', `OP de reposição via Dashboard — ${produto.nome} — qtd ${qtd}`).catch(() => {});
    // Atualiza cache e estado local sem re-fetch
    const cachedOrdens = cacheGet('OrdemProducao');
    if (cachedOrdens) cacheSet('OrdemProducao', [...cachedOrdens, op]);
    setRawData(d => ({ ...d, ordens: [...(d.ordens || []), op] }));
    setCriandoOP(p => ({ ...p, [produto.id]: false }));
  };

  const radarData = [
    { area: 'Pedidos',    value: Math.min(100, ((data?.pedidosAtivos || 0) / 10) * 100) },
    { area: 'Produção',   value: Math.min(100, ((data?.emProducao || 0) / 5) * 100) },
    { area: 'Estoque',    value: Math.min(100, Math.max(0, 100 - ((data?.alertasBaixo || 0) / Math.max(data?.totalProdutos || 1, 1)) * 100)) },
    { area: 'Expedição',  value: Math.min(100, ((data?.expEntregues || 0) / Math.max((data?.expEmitidas || 0) + (data?.expEntregues || 0), 1)) * 100) },
    { area: 'Etiquetas',  value: Math.min(100, Math.max(0, 100 - ((data?.etiqPendentes || 0) / Math.max((data?.etiqImpressas || 0) + (data?.etiqPendentes || 0), 1)) * 100)) },
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl px-6 py-4 flex items-center justify-between flex-wrap gap-3" style={{ background: '#2D2420' }}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">☀️</span>
          <div>
            <p className="text-sm font-bold text-white">Raio do Sol — Gestão Industrial</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>Dashboard Operacional</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
          <button onClick={() => load(true)} className="flex items-center gap-1.5 text-xs hover:text-white transition-colors" style={{ color: 'rgba(255,255,255,0.5)' }}>
            <RefreshCw size={13} /> Atualizar
          </button>
        </div>
      </div>

      <PeriodFilter value={period} onChange={setPeriod} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard loading={loading} icon={ShoppingCart} color="bg-blue-500"
          label="Pedidos Ativos" value={fmt(data?.pedidosAtivos)}
          sub={`${fmt(data?.ordensAbertas)} OPs em aberto`} path="/Pedidos" />
        <KpiCard loading={loading} icon={TrendingUp} color="bg-green-500"
          label="Faturamento Expedido" value={fmtR(data?.faturamentoExpedido)}
          sub="Total de pedidos expedidos" path="/Expedicao" />
        <KpiCard loading={loading} icon={AlertTriangle} color="bg-red-500"
          label="Alertas de Estoque" value={fmt(data?.alertasBaixo)}
          sub={`${fmt(data?.alertasZero)} produtos zerados`} path="/Estoque" alert={(data?.alertasBaixo || 0) > 0} />
        <KpiCard loading={loading} icon={Factory} color="bg-amber-500"
          label="Em Produção" value={fmt(data?.emProducao)}
          sub={`${fmt(data?.aProduzir)} a produzir · ${fmt(data?.emEmbalagem)} embalagem`} path="/Kanban" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard loading={loading} icon={Package} color="bg-orange-500"
          label="Total em Estoque" value={fmt(data?.totalEstoque)}
          sub={`${fmt(data?.totalProdutos)} SKUs cadastrados`} path="/Estoque" />
        <KpiCard loading={loading} icon={Truck} color="bg-purple-500"
          label="NFs Emitidas" value={fmt(data?.expEmitidas)}
          sub={`${fmt(data?.expEnviadas)} trânsito · ${fmt(data?.expEntregues)} entregues`} path="/Expedicao" />
        <KpiCard loading={loading} icon={Tag} color="bg-blue-500"
          label="Etiquetas Pendentes" value={fmt(data?.etiqPendentes)}
          sub={`${fmt(data?.etiqImpressas)} já impressas`} path="/Etiquetas" />
        <KpiCard loading={loading} icon={Flag} color="bg-green-500"
          label="OPs Finalizadas" value={fmt(data?.ordensFinalizadas)}
          sub="Total histórico" path="/Kanban" />
      </div>

      {!loading && (data?.alertasProdutos || []).length > 0 && (
        <div className="rounded-2xl p-5" style={{ background: '#FFF8EE', border: '2px solid #F59E0B33' }}>
          <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#FEF3C7' }}>
                <AlertTriangle size={16} style={{ color: '#D97706' }} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground">Reposição de Estoque</h3>
                <p className="text-xs text-muted-foreground">{data.alertasProdutos.length} produto(s) abaixo do mínimo</p>
              </div>
            </div>
            <Link to="/Kanban" className="text-xs font-semibold hover:underline text-primary">Ver Kanban →</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {data.alertasProdutos.map(p => {
              const pct = p.estoque_minimo > 0 ? Math.min(100, Math.round(((p.estoque_atual || 0) / p.estoque_minimo) * 100)) : 0;
              const jaTemOP = (data.ordensAbertasLista || []).some(o => o.produto_id === p.id && o.origem === 'estoque_minimo');
              const criando = criandoOP[p.id];
              const qtd = Math.max((p.estoque_minimo || 10) * 2 - (p.estoque_atual || 0), p.estoque_minimo || 10);
              return (
                <div key={p.id} className="rounded-xl border p-3.5 flex flex-col gap-2 bg-card" style={{ borderColor: jaTemOP ? '#86EFAC' : '#FDE68A' }}>
                  <p className="text-xs font-semibold leading-tight truncate text-foreground">{p.nome}</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Estoque:</span>
                    <strong style={{ color: (p.estoque_atual || 0) === 0 ? '#DC2626' : '#D97706' }}>
                      {p.estoque_atual || 0} / {p.estoque_minimo} un
                    </strong>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden bg-amber-100">
                    <div className="h-full rounded-full" style={{ width: `${Math.max(pct, 3)}%`, background: pct === 0 ? '#DC2626' : '#F59E0B' }} />
                  </div>
                  {jaTemOP ? (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-green-600">
                      <CheckCircle size={12} /> OP já criada
                    </div>
                  ) : !readonly ? (
                    <button onClick={() => criarOPReposicao(p)} disabled={criando}
                      className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50">
                      {criando ? <RefreshCw size={12} className="animate-spin" /> : <Zap size={12} />}
                      {criando ? 'Criando...' : `Criar OP (+${qtd} un)`}
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ExportableChart title="Pipeline de Produção" className="lg:col-span-2">
          {loading ? <Skeleton h={160} /> : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={data?.producaoPipeline} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(35,20%,90%)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip unit=" OPs" />} />
                <Bar dataKey="value" name="OPs" radius={[6, 6, 0, 0]}>
                  {data?.producaoPipeline.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ExportableChart>

        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Layers size={16} className="text-muted-foreground" />
            <h3 className="font-semibold text-foreground text-sm">Pedidos por Status</h3>
          </div>
          {loading ? <Skeleton h={160} /> : (
            <>
              <ResponsiveContainer width="100%" height={130}>
                <PieChart>
                  <Pie data={data?.pedidosPorStatus} dataKey="value" cx="50%" cy="50%"
                    outerRadius={55} innerRadius={30}>
                    {data?.pedidosPorStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                {data?.pedidosPorStatus.map((s, i) => (
                  <div key={s.name} className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    {s.name} ({s.value})
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ExportableChart title="Top 5 Produtos em Estoque">
          {loading ? <Skeleton h={140} /> : (
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={data?.top5Estoque} layout="vertical" barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(35,20%,90%)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={100} />
                <Tooltip content={<CustomTooltip unit=" un" />} />
                <Bar dataKey="estoque" name="Estoque" fill="#3B82F6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ExportableChart>

        <div className={`bg-card rounded-2xl border p-5 ${(data?.alertasBaixo || 0) > 0 ? 'border-red-200' : 'border-border'}`}>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={16} className={(data?.alertasBaixo || 0) > 0 ? 'text-red-500' : 'text-muted-foreground'} />
            <h3 className="font-semibold text-foreground text-sm">Alertas de Estoque Mínimo</h3>
          </div>
          {loading ? <Skeleton h={100} /> : (data?.alertasProdutos || []).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/50 text-sm">
              <CheckCircle size={28} className="mb-2 text-green-500" />
              Todos os estoques estão OK
            </div>
          ) : (
            <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
              {data.alertasProdutos.map(p => {
                const pct = p.estoque_minimo > 0 ? Math.min(100, Math.round(((p.estoque_atual || 0) / p.estoque_minimo) * 100)) : 0;
                return (
                  <div key={p.id} className="p-3 bg-red-50 rounded-xl">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-medium text-foreground truncate flex-1">{p.nome}</p>
                      <span className="text-xs text-red-600 font-bold ml-2">{p.estoque_atual || 0} / {p.estoque_minimo}</span>
                    </div>
                    <div className="h-1.5 bg-red-100 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5">
          <p className="text-xs text-muted-foreground mb-1">Faturamento Pendente</p>
          <p className="text-2xl font-bold text-foreground">{fmtR(data?.faturamentoPendente)}</p>
          {!ocultarValores && (
            <p className="text-xs text-muted-foreground mt-1">em {fmt(data?.pedidosAtivos)} pedido(s) não expedidos</p>
          )}
          <div className="mt-4 flex items-center gap-1 text-xs text-green-600 font-medium">
            <ArrowUpRight size={13} />
            Total expedido: {fmtR(data?.faturamentoExpedido)}
          </div>
        </div>

        <ExportableChart title="Desempenho Operacional">
          {loading ? <Skeleton h={160} /> : (
            <ResponsiveContainer width="100%" height={160}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(35,20%,88%)" />
                <PolarAngleAxis dataKey="area" tick={{ fontSize: 10, fill: 'hsl(25,15%,50%)' }} />
                <Radar name="Score" dataKey="value" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.25} strokeWidth={2} />
                <Tooltip content={<CustomTooltip unit="%" />} />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </ExportableChart>

        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Novo Pedido', path: '/Pedidos',   icon: '📋', color: 'border-blue-200 hover:bg-blue-50' },
            { label: 'Ver Kanban',  path: '/Kanban',    icon: '🏭', color: 'border-amber-200 hover:bg-amber-50' },
            { label: 'Embalagem',   path: '/Embalagem', icon: '📦', color: 'border-green-200 hover:bg-green-50' },
            { label: 'Expedição',   path: '/Expedicao', icon: '🚚', color: 'border-orange-200 hover:bg-orange-50' },
          ].map(({ label, path, icon, color }) => (
            <Link key={label} to={path} className={`bg-card rounded-xl border p-4 text-center transition-all ${color}`}>
              <span className="text-2xl block mb-1">{icon}</span>
              <p className="text-sm font-medium text-foreground">{label}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, color, label, value, sub, path, alert, loading }) {
  return (
    <Link to={path}
      className="rounded-2xl p-5 border hover:shadow-md transition-all group bg-card"
      style={{ borderColor: alert ? '#FBBF24' : 'hsl(var(--border))' }}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
          <Icon size={18} className="text-white" />
        </div>
        {alert && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
      </div>
      {loading
        ? <div className="h-8 w-16 rounded-lg animate-pulse bg-muted mb-1" />
        : <p className="text-2xl font-bold text-foreground">{value}</p>
      }
      <p className="text-xs font-semibold mt-0.5 text-foreground">{label}</p>
      <p className="text-xs mt-0.5 text-muted-foreground">{sub}</p>
    </Link>
  );
}

function Skeleton({ h }) {
  return <div className="animate-pulse bg-muted rounded-xl" style={{ height: h }} />;
}