import { useEffect, useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  AreaChart, Area, CartesianGrid, Legend,
  PieChart, Pie, LineChart, Line
} from 'recharts';
import {
  BarChart2, Factory, ShoppingCart, Calendar, Zap,
  TrendingUp, Users, Package, DollarSign, Clock,
  ArrowUpRight, ArrowDownRight, Award, AlertTriangle
} from 'lucide-react';
import ExportButtons from '@/components/relatorios/ExportButtons';
import ExportableChart from '@/components/dashboard/ExportableChart';
import PeriodFilter from '@/components/dashboard/PeriodFilter';
import { diffHoras, fmtHoras } from '@/lib/brasilia';

const COLORS = ['#F59E0B', '#3B82F6', '#22C55E', '#F97316', '#A855F7', '#EC4899', '#14B8A6', '#EF4444'];

const TABS = [
  { key: 'visao_geral', label: 'Visão Geral', icon: BarChart2 },
  { key: 'clientes', label: 'Clientes', icon: Users },
  { key: 'produtos', label: 'Produtos', icon: Package },
  { key: 'producao', label: 'Produção', icon: Factory },
  { key: 'produtividade', label: 'Produtividade', icon: Zap },
];

const fmt = (v) => v?.toLocaleString('pt-BR') ?? '—';
const fmtR = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
const fmtRShort = (v) => {
  if (!v) return 'R$ 0';
  if (v >= 1000000) return `R$ ${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `R$ ${(v / 1000).toFixed(1)}k`;
  return fmtR(v);
};

function startOfWeek(d) {
  const dt = new Date(d); dt.setDate(dt.getDate() - dt.getDay()); dt.setHours(0, 0, 0, 0); return dt;
}
function weekLabel(d) {
  const s = startOfWeek(d); const e = new Date(s); e.setDate(s.getDate() + 6);
  return `${s.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} – ${e.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;
}
function isInRange(dateStr, from, to) {
  if (!dateStr) return true;
  const d = new Date(dateStr);
  if (from && d < new Date(from)) return false;
  if (to) { const t = new Date(to); t.setHours(23, 59, 59); if (d > t) return false; }
  return true;
}

function KpiCard({ label, value, sub, icon: Icon, color = 'bg-primary', trend, trendLabel }) {
  const up = trend > 0;
  return (
    <div className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center`}>
          <Icon size={16} className="text-white" />
        </div>
        {trend !== undefined && (
          <span className={`flex items-center gap-1 text-xs font-semibold ${up ? 'text-green-600' : 'text-red-500'}`}>
            {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground leading-tight">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        {trendLabel && <p className="text-xs text-muted-foreground">{trendLabel}</p>}
      </div>
    </div>
  );
}

function EmptyState({ msg = 'Sem dados para o período selecionado.' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <BarChart2 size={32} className="mb-2 opacity-20" />
      <p className="text-sm">{msg}</p>
    </div>
  );
}

function SectionTitle({ children }) {
  return <h3 className="font-bold text-foreground text-base mb-3">{children}</h3>;
}

/* ──────────────────────────────────────────────────────────────────────────── */
export default function Relatorios() {
  const [tab, setTab] = useState('visao_geral');
  const [loading, setLoading] = useState(true);
  const [ordens, setOrdens] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [period, setPeriod] = useState({ preset: 'month', from: '', to: '' });

  useEffect(() => {
    async function load() {
      const [ords, peds, prods, cls] = await Promise.all([
        base44.entities.OrdemProducao.list('-created_date'),
        base44.entities.Pedido.list('-created_date'),
        base44.entities.Produto.list(),
        base44.entities.Cliente.list(),
      ]);
      setOrdens(ords); setPedidos(peds); setProdutos(prods); setClientes(cls);
      setLoading(false);
    }
    load();
  }, []);

  const { from, to } = period;

  const filteredPedidos = useMemo(() =>
    pedidos.filter(p => isInRange(p.data_pedido || p.created_date, from, to)),
    [pedidos, from, to]
  );
  const filteredOrdens = useMemo(() =>
    ordens.filter(o => isInRange(o.data_inicio || o.created_date, from, to)),
    [ordens, from, to]
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-card border border-border rounded-2xl px-5 py-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rainbow-indigo/10 flex items-center justify-center">
              <BarChart2 size={19} className="text-rainbow-indigo" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Relatórios</h2>
              <p className="text-xs text-muted-foreground">Análise completa de vendas, produção e clientes</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground self-center">
            {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Filtro de período */}
      <PeriodFilter value={period} onChange={setPeriod} />

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              tab === key ? 'bg-primary text-primary-foreground shadow' : 'bg-card border border-border text-muted-foreground hover:bg-muted'
            }`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-32 animate-pulse bg-muted rounded-2xl" />)}
        </div>
      ) : (
        <>
          {tab === 'visao_geral' && <TabVisaoGeral pedidos={filteredPedidos} ordens={filteredOrdens} produtos={produtos} clientes={clientes} />}
          {tab === 'clientes' && <TabClientes pedidos={filteredPedidos} clientes={clientes} />}
          {tab === 'produtos' && <TabProdutos pedidos={filteredPedidos} ordens={filteredOrdens} produtos={produtos} />}
          {tab === 'producao' && <TabProducao ordens={filteredOrdens} />}
          {tab === 'produtividade' && <TabProdutividade ordens={filteredOrdens} produtos={produtos} />}
        </>
      )}
    </div>
  );
}

/* ── VISÃO GERAL ──────────────────────────────────────────────────────────── */
function TabVisaoGeral({ pedidos, ordens, produtos, clientes }) {
  const ativos = pedidos.filter(p => p.status !== 'cancelado');
  const faturamento = ativos.reduce((s, p) => s + (p.valor_total || 0), 0);
  const expedidos = pedidos.filter(p => p.status === 'expedido' || p.status === 'entregue');
  const faturamentoExpedido = expedidos.reduce((s, p) => s + (p.valor_total || 0), 0);
  const ticketMedio = ativos.length > 0 ? faturamento / ativos.length : 0;
  const ops = ordens.filter(o => o.status === 'finalizado');
  const totalProduzido = ops.reduce((s, o) => s + (o.itens?.length > 0 ? o.itens.reduce((a,i) => a+(i.quantidade||0),0) : (o.quantidade||0)), 0);
  const produtosAlerta = produtos.filter(p => (p.estoque_atual||0) <= (p.estoque_minimo||0));

  // Evolução semanal de faturamento
  const semanas = {};
  for (const ped of ativos) {
    if (!ped.data_pedido) continue;
    const wk = weekLabel(ped.data_pedido);
    if (!semanas[wk]) semanas[wk] = { semana: wk, faturamento: 0, pedidos: 0 };
    semanas[wk].faturamento += ped.valor_total || 0;
    semanas[wk].pedidos += 1;
  }
  const semanasList = Object.values(semanas).slice(-10);

  // Status dos pedidos
  const statusPedidos = [
    { name: 'Rascunho', value: pedidos.filter(p=>p.status==='rascunho').length, color: '#94A3B8' },
    { name: 'Ag. Estoque', value: pedidos.filter(p=>p.status==='aguardando_estoque').length, color: '#F97316' },
    { name: 'Separação', value: pedidos.filter(p=>p.status==='separacao').length, color: '#3B82F6' },
    { name: 'Separado', value: pedidos.filter(p=>p.status==='separado').length, color: '#22C55E' },
    { name: 'Expedido', value: pedidos.filter(p=>p.status==='expedido').length, color: '#A855F7' },
    { name: 'Entregue', value: pedidos.filter(p=>p.status==='entregue').length, color: '#14B8A6' },
    { name: 'Cancelado', value: pedidos.filter(p=>p.status==='cancelado').length, color: '#EF4444' },
  ].filter(s => s.value > 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Faturamento" value={fmtRShort(faturamento)} sub={`${ativos.length} pedidos`} icon={DollarSign} color="bg-green-500" />
        <KpiCard label="Faturamento Expedido" value={fmtRShort(faturamentoExpedido)} sub={`${expedidos.length} expedidos`} icon={TrendingUp} color="bg-sky-500" />
        <KpiCard label="Ticket Médio" value={fmtRShort(ticketMedio)} sub="por pedido" icon={ShoppingCart} color="bg-purple-500" />
        <KpiCard label="Unidades Produzidas" value={fmt(totalProduzido)} sub={`${ops.length} OPs finalizadas`} icon={Factory} color="bg-amber-500" />
      </div>

      {produtosAlerta.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
          <AlertTriangle size={18} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 font-medium">
            {produtosAlerta.length} produto(s) abaixo do estoque mínimo: {produtosAlerta.slice(0,3).map(p=>p.nome).join(', ')}{produtosAlerta.length > 3 ? '...' : ''}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ExportableChart title="Evolução de Faturamento (Semanal)">
          {semanasList.length === 0 ? <EmptyState /> : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={semanasList}>
                <defs>
                  <linearGradient id="gradFat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0e8dc" />
                <XAxis dataKey="semana" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => fmtRShort(v)} />
                <Tooltip formatter={v => fmtR(v)} labelStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="faturamento" name="Faturamento" stroke="#F59E0B" strokeWidth={2} fill="url(#gradFat)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ExportableChart>

        <ExportableChart title="Distribuição de Pedidos por Status">
          {statusPedidos.length === 0 ? <EmptyState /> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusPedidos} cx="50%" cy="50%" outerRadius={80} innerRadius={40} dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                  {statusPedidos.map((s, i) => <Cell key={i} fill={s.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ExportableChart>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <SectionTitle>Resumo do Período</SectionTitle>
          <ExportButtons filename="visao-geral" title="Visão Geral — Raio do Sol"
            columns={[
              { header: 'Métrica', key: 'metrica', width: 60 },
              { header: 'Valor', key: 'valor', width: 60 },
            ]}
            rows={[
              { metrica: 'Faturamento Total', valor: fmtR(faturamento) },
              { metrica: 'Faturamento Expedido', valor: fmtR(faturamentoExpedido) },
              { metrica: 'Ticket Médio', valor: fmtR(ticketMedio) },
              { metrica: 'Total de Pedidos', valor: ativos.length },
              { metrica: 'OPs Finalizadas', valor: ops.length },
              { metrica: 'Unidades Produzidas', valor: totalProduzido },
              { metrica: 'Produtos em Alerta', valor: produtosAlerta.length },
            ]}
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
          {[
            { label: 'Clientes Ativos', value: clientes.filter(c=>c.ativo!==false).length, color: 'text-sky-600' },
            { label: 'Pedidos no Período', value: ativos.length, color: 'text-foreground' },
            { label: 'Produtos Cadastrados', value: produtos.length, color: 'text-foreground' },
            { label: 'Alerta de Estoque', value: produtosAlerta.length, color: produtosAlerta.length > 0 ? 'text-red-600' : 'text-green-600' },
          ].map(item => (
            <div key={item.label} className="bg-muted/30 rounded-xl p-3">
              <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── CLIENTES ─────────────────────────────────────────────────────────────── */
function TabClientes({ pedidos, clientes }) {
  const [ordenar, setOrdenar] = useState('faturamento');

  const clienteMetricas = useMemo(() => {
    const map = {};
    for (const ped of pedidos.filter(p => p.status !== 'cancelado')) {
      const k = ped.cliente_id || ped.cliente_nome;
      if (!k) continue;
      if (!map[k]) map[k] = { id: ped.cliente_id, nome: ped.cliente_nome, faturamento: 0, pedidos: 0, itens: 0 };
      map[k].faturamento += ped.valor_total || 0;
      map[k].pedidos += 1;
      map[k].itens += (ped.itens || []).reduce((s, i) => s + (i.quantidade || 0), 0);
    }
    return Object.values(map).sort((a, b) => b[ordenar] - a[ordenar]);
  }, [pedidos, ordenar]);

  const topClientes = clienteMetricas.slice(0, 10);
  const chartData = topClientes.map(c => ({ name: c.nome.split(' ')[0], faturamento: c.faturamento, pedidos: c.pedidos }));

  const totalFat = clienteMetricas.reduce((s, c) => s + c.faturamento, 0);
  const top3Fat = clienteMetricas.slice(0, 3).reduce((s, c) => s + c.faturamento, 0);
  const concentracao = totalFat > 0 ? ((top3Fat / totalFat) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Clientes com Pedidos" value={clienteMetricas.length} sub="no período" icon={Users} color="bg-sky-500" />
        <KpiCard label="Faturamento Total" value={fmtRShort(totalFat)} sub="pedidos ativos" icon={DollarSign} color="bg-green-500" />
        <KpiCard label="Ticket Médio/Cliente" value={fmtRShort(clienteMetricas.length > 0 ? totalFat / clienteMetricas.length : 0)} icon={TrendingUp} color="bg-purple-500" />
        <KpiCard label="Concentração Top 3" value={`${concentracao}%`} sub="do faturamento" icon={Award} color="bg-amber-500" />
      </div>

      <ExportableChart title="Top 10 Clientes por Faturamento">
        {topClientes.length === 0 ? <EmptyState /> : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} layout="vertical" barSize={14}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0e8dc" />
              <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => fmtRShort(v)} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
              <Tooltip formatter={v => fmtR(v)} />
              <Bar dataKey="faturamento" name="Faturamento" radius={[0, 6, 6, 0]}>
                {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </ExportableChart>

      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <SectionTitle>Ranking de Clientes</SectionTitle>
          <div className="flex items-center gap-2">
            <select value={ordenar} onChange={e => setOrdenar(e.target.value)}
              className="text-xs border border-border rounded-lg px-2 py-1.5 bg-background text-foreground focus:outline-none">
              <option value="faturamento">Por Faturamento</option>
              <option value="pedidos">Por Qtd. Pedidos</option>
              <option value="itens">Por Unidades</option>
            </select>
            <ExportButtons filename="ranking-clientes" title="Ranking de Clientes — Raio do Sol"
              columns={[
                { header: 'Pos.', key: 'pos', width: 15 },
                { header: 'Cliente', key: 'nome', width: 60 },
                { header: 'Pedidos', key: 'pedidos', width: 25 },
                { header: 'Faturamento', key: 'fatFmt', width: 45 },
                { header: 'Unidades', key: 'itens', width: 30 },
              ]}
              rows={clienteMetricas.map((c, i) => ({ pos: i+1, nome: c.nome, pedidos: c.pedidos, fatFmt: fmtR(c.faturamento), itens: c.itens }))}
            />
          </div>
        </div>
        <div className="space-y-2">
          {clienteMetricas.slice(0, 15).map((c, i) => {
            const pct = totalFat > 0 ? Math.round((c.faturamento / totalFat) * 100) : 0;
            const medals = ['🥇', '🥈', '🥉'];
            return (
              <div key={c.id || c.nome} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                <span className="w-8 text-center text-sm font-bold text-muted-foreground flex-shrink-0">
                  {i < 3 ? medals[i] : `${i+1}º`}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-foreground truncate">{c.nome}</p>
                    <p className="text-sm font-bold text-foreground ml-2 flex-shrink-0">{fmtR(c.faturamento)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">{c.pedidos} ped. · {pct}%</span>
                  </div>
                </div>
              </div>
            );
          })}
          {clienteMetricas.length === 0 && <EmptyState msg="Nenhum cliente com pedidos no período." />}
        </div>
      </div>
    </div>
  );
}

/* ── PRODUTOS ─────────────────────────────────────────────────────────────── */
function TabProdutos({ pedidos, ordens, produtos }) {
  const vendidos = useMemo(() => {
    const map = {};
    for (const ped of pedidos.filter(p => p.status !== 'cancelado')) {
      for (const item of ped.itens || []) {
        const k = item.produto_nome || 'Sem nome';
        if (!map[k]) map[k] = { nome: k, qtd: 0, faturamento: 0 };
        map[k].qtd += item.quantidade || 0;
        map[k].faturamento += item.total || (item.quantidade || 0) * (item.preco_unitario || 0);
      }
    }
    return Object.values(map).sort((a, b) => b.qtd - a.qtd);
  }, [pedidos]);

  const produzidos = useMemo(() => {
    const map = {};
    for (const op of ordens.filter(o => o.status === 'finalizado')) {
      const itens = op.itens?.length > 0 ? op.itens : (op.produto_nome ? [{ produto_nome: op.produto_nome, quantidade: op.quantidade || 0 }] : []);
      for (const item of itens) {
        const k = item.produto_nome || 'Sem nome';
        if (!map[k]) map[k] = { nome: k, qtd: 0 };
        map[k].qtd += item.quantidade || 0;
      }
    }
    return Object.values(map).sort((a, b) => b.qtd - a.qtd).slice(0, 10);
  }, [ordens]);

  const topVendidos = vendidos.slice(0, 10);
  const alertaProdutos = produtos.filter(p => (p.estoque_atual || 0) <= (p.estoque_minimo || 0));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Produtos Vendidos" value={vendidos.length} sub="tipos distintos" icon={Package} color="bg-sky-500" />
        <KpiCard label="Mais Vendido" value={topVendidos[0]?.nome?.split(' ').slice(0,2).join(' ') || '—'} sub={topVendidos[0] ? `${fmt(topVendidos[0].qtd)} un` : ''} icon={Award} color="bg-amber-500" />
        <KpiCard label="Total Unidades Vendidas" value={fmt(vendidos.reduce((s,p) => s+p.qtd, 0))} icon={TrendingUp} color="bg-green-500" />
        <KpiCard label="Produtos em Alerta" value={alertaProdutos.length} sub="abaixo do mínimo" icon={AlertTriangle} color={alertaProdutos.length > 0 ? 'bg-red-500' : 'bg-green-500'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ExportableChart title="Top 10 Mais Vendidos (unidades)">
          {topVendidos.length === 0 ? <EmptyState /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topVendidos.map(p => ({ name: p.nome.length > 18 ? p.nome.slice(0,18)+'…' : p.nome, qtd: p.qtd }))} layout="vertical" barSize={14}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0e8dc" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={130} />
                <Tooltip />
                <Bar dataKey="qtd" name="Unidades" radius={[0,6,6,0]}>
                  {topVendidos.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ExportableChart>

        <ExportableChart title="Top 10 Mais Produzidos (OPs finalizadas)">
          {produzidos.length === 0 ? <EmptyState /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={produzidos.map(p => ({ name: p.nome.length > 18 ? p.nome.slice(0,18)+'…' : p.nome, qtd: p.qtd }))} layout="vertical" barSize={14}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0e8dc" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={130} />
                <Tooltip />
                <Bar dataKey="qtd" name="Produzido" radius={[0,6,6,0]}>
                  {produzidos.map((_, i) => <Cell key={i} fill={COLORS[(i+3) % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ExportableChart>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <SectionTitle>Ranking de Produtos</SectionTitle>
          <ExportButtons filename="ranking-produtos" title="Ranking de Produtos — Raio do Sol"
            columns={[
              { header: 'Pos.', key: 'pos', width: 15 },
              { header: 'Produto', key: 'nome', width: 70 },
              { header: 'Unidades Vendidas', key: 'qtd', width: 35 },
            ]}
            rows={vendidos.map((p, i) => ({ pos: i+1, nome: p.nome, qtd: p.qtd }))}
          />
        </div>
        {vendidos.length === 0 ? <EmptyState msg="Nenhum produto vendido no período." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border">
                {['#', 'Produto', 'Unidades Vendidas', 'Participação'].map(h => (
                  <th key={h} className="text-left py-2 pr-4 text-xs text-muted-foreground font-semibold">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {vendidos.slice(0, 20).map((p, i) => {
                  const totalQtd = vendidos.reduce((s, x) => s + x.qtd, 0);
                  const pct = totalQtd > 0 ? ((p.qtd / totalQtd) * 100).toFixed(1) : 0;
                  return (
                    <tr key={p.nome} className="border-b border-border/50">
                      <td className="py-2 pr-4 text-muted-foreground text-xs font-bold">{i+1}º</td>
                      <td className="py-2 pr-4 text-foreground font-medium">{p.nome}</td>
                      <td className="py-2 pr-4 font-bold text-foreground">{fmt(p.qtd)}</td>
                      <td className="py-2 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── PRODUÇÃO ─────────────────────────────────────────────────────────────── */
function TabProducao({ ordens }) {
  const finalizadas = ordens.filter(o => o.status === 'finalizado');
  const totalProduzido = finalizadas.reduce((s, o) =>
    s + (o.itens?.length > 0 ? o.itens.reduce((a, i) => a + (i.quantidade || 0), 0) : (o.quantidade || 0)), 0);

  const statusData = [
    { name: 'A Produzir', value: ordens.filter(o=>o.status==='a_produzir').length, color: '#94A3B8' },
    { name: 'Em Produção', value: ordens.filter(o=>o.status==='em_producao').length, color: '#3B82F6' },
    { name: 'Produzido', value: ordens.filter(o=>o.status==='produzido').length, color: '#22C55E' },
    { name: 'Embalagem', value: ordens.filter(o=>o.status==='em_embalagem').length, color: '#F59E0B' },
    { name: 'Finalizado', value: ordens.filter(o=>o.status==='finalizado').length, color: '#A855F7' },
  ];

  const origemData = [
    { name: 'Sob Demanda', value: ordens.filter(o=>o.origem==='pedido').length, color: '#3B82F6' },
    { name: 'Reposição', value: ordens.filter(o=>o.origem==='estoque_minimo').length, color: '#F97316' },
    { name: 'Manual', value: ordens.filter(o=>o.origem==='manual').length, color: '#94A3B8' },
  ].filter(o => o.value > 0);

  const porProduto = {};
  for (const o of finalizadas) {
    const itens = o.itens?.length > 0 ? o.itens : (o.produto_nome ? [{ produto_nome: o.produto_nome, quantidade: o.quantidade || 0 }] : []);
    for (const item of itens) {
      const k = item.produto_nome || 'Sem nome';
      porProduto[k] = (porProduto[k] || 0) + (item.quantidade || 0);
    }
  }
  const chartPorProduto = Object.entries(porProduto).sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([name, qtd]) => ({ name: name.length > 20 ? name.slice(0,20)+'…' : name, qtd }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total de OPs" value={ordens.length} sub="no período" icon={Factory} color="bg-slate-500" />
        <KpiCard label="OPs Finalizadas" value={finalizadas.length} sub={`${ordens.length > 0 ? ((finalizadas.length/ordens.length)*100).toFixed(0) : 0}% do total`} icon={Package} color="bg-purple-500" />
        <KpiCard label="Em Andamento" value={ordens.filter(o=>['em_producao','produzido','em_embalagem'].includes(o.status)).length} icon={Clock} color="bg-sky-500" />
        <KpiCard label="Unidades Produzidas" value={fmt(totalProduzido)} icon={TrendingUp} color="bg-green-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ExportableChart title="OPs por Status">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" outerRadius={80} innerRadius={35} dataKey="value"
                label={({ name, value }) => value > 0 ? `${name}: ${value}` : ''} labelLine={false}>
                {statusData.map((s, i) => <Cell key={i} fill={s.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ExportableChart>

        <ExportableChart title="Distribuição por Origem">
          {origemData.length === 0 ? <EmptyState /> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={origemData} cx="50%" cy="50%" outerRadius={80} innerRadius={35} dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                  {origemData.map((s, i) => <Cell key={i} fill={s.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ExportableChart>

        <ExportableChart title="Produção por Produto (OPs finalizadas)">
          {chartPorProduto.length === 0 ? <EmptyState /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartPorProduto} layout="vertical" barSize={14}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0e8dc" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
                <Tooltip />
                <Bar dataKey="qtd" name="Qtd" radius={[0,6,6,0]}>
                  {chartPorProduto.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ExportableChart>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <SectionTitle>Histórico de Ordens de Produção</SectionTitle>
          <ExportButtons filename="ordens-producao" title="Histórico de OPs — Raio do Sol"
            columns={[
              { header: 'Nº OP', key: 'numero', width: 25 },
              { header: 'Produto', key: 'produto', width: 70 },
              { header: 'Origem', key: 'origem', width: 30 },
              { header: 'Qtd', key: 'qtd', width: 20 },
              { header: 'Status', key: 'status', width: 35 },
              { header: 'Lote', key: 'lote', width: 30 },
            ]}
            rows={ordens.map(o => ({
              numero: o.numero,
              produto: o.produto_nome || `Pedido ${o.pedido_numero}`,
              origem: o.origem === 'pedido' ? 'Demanda' : o.origem === 'estoque_minimo' ? 'Reposição' : 'Manual',
              qtd: o.itens?.length > 0 ? o.itens.reduce((s,i) => s+(i.quantidade||0), 0) : (o.quantidade||0),
              status: { a_produzir:'A Produzir',em_producao:'Em Produção',produzido:'Produzido',em_embalagem:'Embalagem',finalizado:'Finalizado' }[o.status] || o.status,
              lote: o.lote || '—',
            }))}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border">
              {['Nº OP', 'Produto', 'Origem', 'Qtd', 'Status', 'Lote'].map(h => (
                <th key={h} className="text-left py-2 pr-4 text-xs text-muted-foreground font-semibold">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {ordens.slice(0, 30).map(o => {
                const qtd = o.itens?.length > 0 ? o.itens.reduce((s,i) => s+(i.quantidade||0), 0) : (o.quantidade||0);
                const STATUS_COLORS = { a_produzir:'bg-slate-100 text-slate-600', em_producao:'bg-sky-100 text-sky-700', produzido:'bg-green-100 text-green-700', em_embalagem:'bg-amber-100 text-amber-700', finalizado:'bg-purple-100 text-purple-700' };
                return (
                  <tr key={o.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="py-2 pr-4 font-mono text-xs text-foreground">{o.numero}</td>
                    <td className="py-2 pr-4 text-foreground">{o.produto_nome || `Pedido ${o.pedido_numero}`}</td>
                    <td className="py-2 pr-4 text-muted-foreground text-xs">{o.origem === 'pedido' ? 'Demanda' : o.origem === 'estoque_minimo' ? 'Reposição' : 'Manual'}</td>
                    <td className="py-2 pr-4 font-semibold text-foreground">{qtd}</td>
                    <td className="py-2 pr-4">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[o.status] || 'bg-muted text-muted-foreground'}`}>
                        {{ a_produzir:'A Produzir', em_producao:'Em Produção', produzido:'Produzido', em_embalagem:'Embalagem', finalizado:'Finalizado' }[o.status] || o.status}
                      </span>
                    </td>
                    <td className="py-2 pr-4 font-mono text-xs text-muted-foreground">{o.lote || '—'}</td>
                  </tr>
                );
              })}
              {ordens.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">Nenhuma OP no período.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ── PRODUTIVIDADE ────────────────────────────────────────────────────────── */
function TabProdutividade({ ordens, produtos }) {
  const finalizadas = ordens.filter(o => o.status === 'finalizado');

  const mediaHorasProd = (() => {
    const valid = finalizadas.filter(o => o.data_inicio && o.data_fim_producao);
    if (!valid.length) return null;
    return valid.reduce((s, o) => s + (diffHoras(o.data_inicio, o.data_fim_producao) || 0), 0) / valid.length;
  })();

  const mediaHorasEmb = (() => {
    const valid = finalizadas.filter(o => o.data_embalagem && o.data_finalizacao);
    if (!valid.length) return null;
    return valid.reduce((s, o) => s + (diffHoras(o.data_embalagem, o.data_finalizacao) || 0), 0) / valid.length;
  })();

  const totalUnidades = finalizadas.reduce((s, o) =>
    s + (o.itens?.length > 0 ? o.itens.reduce((a, i) => a + (i.quantidade || 0), 0) : (o.quantidade || 0)), 0);

  const produtosAlerta = produtos.filter(p => (p.estoque_atual || 0) <= (p.estoque_minimo || 0));
  const produtosZero = produtos.filter(p => (p.estoque_atual || 0) === 0);

  const horasPorOP = ordens
    .map(o => {
      const hProd = diffHoras(o.data_inicio, o.data_fim_producao);
      const hEmb = diffHoras(o.data_embalagem, o.data_finalizacao);
      const hTotal = (hProd ?? 0) + (hEmb ?? 0) || null;
      return { nome: o.produto_nome ? (o.produto_nome.length > 20 ? o.produto_nome.slice(0,20)+'…' : o.produto_nome) : `OP ${o.numero}`, hProd, hEmb, hTotal };
    })
    .filter(o => o.hTotal !== null)
    .sort((a, b) => (b.hTotal ?? 0) - (a.hTotal ?? 0))
    .slice(0, 10);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="OPs Finalizadas" value={finalizadas.length} icon={Factory} color="bg-purple-500" />
        <KpiCard label="Média Produção" value={fmtHoras(mediaHorasProd)} sub="por OP" icon={Clock} color="bg-sky-500" />
        <KpiCard label="Média Embalagem" value={fmtHoras(mediaHorasEmb)} sub="por OP" icon={Clock} color="bg-amber-500" />
        <KpiCard label="Produtos em Alerta" value={produtosAlerta.length} sub={`${produtosZero.length} zerados`} icon={AlertTriangle} color={produtosAlerta.length > 0 ? 'bg-red-500' : 'bg-green-500'} />
      </div>

      {horasPorOP.length > 0 && (
        <ExportableChart title="Tempo por OP — Produção + Embalagem (horas)">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={horasPorOP.map(o => ({ name: o.nome, Produção: parseFloat((o.hProd??0).toFixed(2)), Embalagem: parseFloat((o.hEmb??0).toFixed(2)) }))} layout="vertical" barSize={10}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0e8dc" />
              <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `${v}h`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={130} />
              <Tooltip formatter={v => `${v}h`} />
              <Legend />
              <Bar dataKey="Produção" fill="#3B82F6" radius={[0,4,4,0]} stackId="a" />
              <Bar dataKey="Embalagem" fill="#F59E0B" radius={[0,4,4,0]} stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </ExportableChart>
      )}

      {produtosAlerta.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <SectionTitle>Produtos Abaixo do Estoque Mínimo</SectionTitle>
            <ExportButtons filename="alerta-estoque" title="Alerta de Estoque — Raio do Sol"
              columns={[
                { header: 'Produto', key: 'nome', width: 60 },
                { header: 'Estoque Atual', key: 'atual', width: 35 },
                { header: 'Estoque Mínimo', key: 'minimo', width: 35 },
                { header: 'Situação', key: 'situacao', width: 35 },
              ]}
              rows={produtosAlerta.map(p => ({
                nome: p.nome,
                atual: p.estoque_atual || 0,
                minimo: p.estoque_minimo || 0,
                situacao: (p.estoque_atual || 0) === 0 ? 'Zerado' : 'Abaixo do mínimo',
              }))}
            />
          </div>
          <div className="space-y-2">
            {produtosAlerta.map(p => {
              const pct = p.estoque_minimo > 0 ? Math.min(100, Math.round(((p.estoque_atual||0) / p.estoque_minimo) * 100)) : 0;
              const zerado = (p.estoque_atual || 0) === 0;
              return (
                <div key={p.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-foreground truncate">{p.nome}</p>
                      <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                        {zerado && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">Zerado</span>}
                        <p className="text-xs text-muted-foreground">{p.estoque_atual||0} / {p.estoque_minimo} un</p>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-red-500 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <SectionTitle>Resumo de Produtividade</SectionTitle>
          <ExportButtons filename="produtividade" title="Produtividade — Raio do Sol"
            columns={[
              { header: 'Produto', key: 'nome', width: 60 },
              { header: 'Estoque Atual', key: 'atual', width: 35 },
              { header: 'Estoque Mínimo', key: 'minimo', width: 35 },
              { header: 'Situação', key: 'situacao', width: 35 },
            ]}
            rows={produtos.map(p => ({
              nome: p.nome,
              atual: p.estoque_atual || 0,
              minimo: p.estoque_minimo || 0,
              situacao: (p.estoque_atual||0) === 0 ? 'Zerado' : (p.estoque_atual||0) <= (p.estoque_minimo||0) ? 'Abaixo do mínimo' : 'OK',
            }))}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div className="bg-muted/30 rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Unidades Produzidas</p>
            <p className="text-3xl font-bold text-foreground">{fmt(totalUnidades)}</p>
          </div>
          <div className="bg-muted/30 rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Média Produção / OP</p>
            <p className="text-3xl font-bold text-foreground">{fmtHoras(mediaHorasProd)}</p>
          </div>
          <div className="bg-muted/30 rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Média Embalagem / OP</p>
            <p className="text-3xl font-bold text-foreground">{fmtHoras(mediaHorasEmb)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}