import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingCart, Factory, CheckCircle, Truck, AlertTriangle,
  TrendingUp, Users, Package, Tag, DollarSign, ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react';

function isInRange(dateStr, from, to) {
  if (!dateStr) return true;
  const d = new Date(dateStr);
  if (from && d < new Date(from)) return false;
  if (to) { const t = new Date(to); t.setHours(23, 59, 59); if (d > t) return false; }
  return true;
}

const VALOR_OCULTO = '••••••';

function fmtR(v) {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(1)}k`;
  return `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;
}

function Delta({ curr, prev }) {
  if (prev == null || prev === 0) return null;
  const pct = Math.round(((curr - prev) / prev) * 100);
  if (pct > 0) return (
    <span className="flex items-center gap-0.5 text-[10px] font-bold text-green-600">
      <ArrowUpRight size={10} /> +{pct}%
    </span>
  );
  if (pct < 0) return (
    <span className="flex items-center gap-0.5 text-[10px] font-bold text-red-500">
      <ArrowDownRight size={10} /> {pct}%
    </span>
  );
  return <span className="flex items-center gap-0.5 text-[10px] font-bold text-muted-foreground"><Minus size={10} /> 0%</span>;
}

function KpiCard({ icon: Icon, color, label, value, sub, path, alert, delta, deltaPrev, loading }) {
  return (
    <Link to={path}
      className={`rounded-2xl p-4 border hover:shadow-md transition-all group bg-card flex flex-col justify-between min-h-[110px] ${alert ? 'border-amber-300 bg-amber-50/30' : 'border-border'}`}>
      <div className="flex items-start justify-between mb-2">
        <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0`}>
          <Icon size={16} className="text-white" />
        </div>
        <div className="flex items-center gap-1">
          {alert && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
          <Delta curr={delta} prev={deltaPrev} />
        </div>
      </div>
      {loading
        ? <div className="h-7 w-14 rounded-lg animate-pulse bg-muted mb-1" />
        : <p className="text-xl font-bold text-foreground leading-tight">{value}</p>
      }
      <div>
        <p className="text-xs font-semibold text-foreground">{label}</p>
        <p className="text-[10px] mt-0.5 text-muted-foreground leading-snug">{sub}</p>
      </div>
    </Link>
  );
}

export default function DashboardKpis({ rawData, loading, period, ocultarValores }) {
  const kpis = useMemo(() => {
    if (!rawData) return null;
    const { pedidos: allPedidos, ordens: allOrdens, produtos, expedicoes, clientes } = rawData;
    const { from, to } = period;

    const pedidos = allPedidos.filter(p => isInRange(p.data_pedido || p.created_date, from, to));
    const ordens = allOrdens.filter(o => isInRange(o.created_date, from, to));

    const aberto = pedidos.filter(p => ['rascunho', 'aguardando_estoque'].includes(p.status)).length;
    const emProducao = pedidos.filter(p => ['separacao', 'separado'].includes(p.status)).length;
    const concluidos = pedidos.filter(p => p.status === 'entregue').length;
    const faturados = pedidos.filter(p => p.status === 'expedido').length;

    const hoje = new Date().toISOString().split('T')[0];
    const atrasados = pedidos.filter(p =>
      !['cancelado', 'entregue', 'expedido'].includes(p.status) &&
      p.data_entrega_prevista && p.data_entrega_prevista < hoje
    ).length;

    const faturamentoMes = pedidos
      .filter(p => p.status === 'expedido')
      .reduce((s, p) => s + (p.valor_total || 0), 0);

    const totalProduzido = ordens
      .filter(o => o.status === 'finalizado')
      .reduce((s, o) => s + (o.quantidade || 0), 0);

    const ticketMedio = faturados > 0
      ? pedidos.filter(p => p.status === 'expedido').reduce((s, p) => s + (p.valor_total || 0), 0) / faturados
      : 0;

    const clientesAtivos = new Set(pedidos.filter(p => p.status !== 'cancelado').map(p => p.cliente_nome)).size;

    return { aberto, emProducao, concluidos, faturados, atrasados, faturamentoMes, totalProduzido, ticketMedio, clientesAtivos };
  }, [rawData, period]);

  const fmt = (v) => loading ? '—' : String(v ?? 0);
  const fR = (v) => {
    if (loading) return '—';
    if (ocultarValores) return VALOR_OCULTO;
    return fmtR(v || 0);
  };

  const cards = [
    { icon: ShoppingCart,  color: 'bg-blue-500',    label: 'Pedidos em Aberto',     value: fmt(kpis?.aberto),        sub: 'Rascunho + Ag. Estoque',    path: '/Pedidos',   alert: false },
    { icon: Factory,       color: 'bg-amber-500',   label: 'Pedidos em Produção',   value: fmt(kpis?.emProducao),    sub: 'Separação + Separado',      path: '/Kanban',    alert: false },
    { icon: CheckCircle,   color: 'bg-emerald-500', label: 'Pedidos Concluídos',    value: fmt(kpis?.concluidos),    sub: 'Entregues no período',       path: '/Pedidos',   alert: false },
    { icon: Truck,         color: 'bg-purple-500',  label: 'Pedidos Faturados',     value: fmt(kpis?.faturados),     sub: 'NF emitida / expedidos',     path: '/Expedicao', alert: false },
    { icon: AlertTriangle, color: 'bg-red-500',     label: 'Pedidos Atrasados',     value: fmt(kpis?.atrasados),     sub: 'Além da data prevista',      path: '/Pedidos',   alert: (kpis?.atrasados || 0) > 0 },
    { icon: TrendingUp,    color: 'bg-green-600',   label: 'Faturamento do Mês',    value: fR(kpis?.faturamentoMes), sub: 'Total expedido no período',   path: '/Expedicao', alert: false },
    { icon: Package,       color: 'bg-orange-500',  label: 'Produção do Mês',       value: fmt(kpis?.totalProduzido),sub: 'Unidades finalizadas',        path: '/Kanban',    alert: false },
    { icon: DollarSign,    color: 'bg-sky-500',     label: 'Ticket Médio',          value: fR(kpis?.ticketMedio),   sub: 'Por pedido expedido',         path: '/Pedidos',   alert: false },
    { icon: Users,         color: 'bg-indigo-500',  label: 'Clientes Ativos',       value: fmt(kpis?.clientesAtivos),sub: 'Com pedidos no período',      path: '/Clientes',  alert: false },
    { icon: Tag,           color: 'bg-pink-500',    label: 'Total Produzido',       value: fmt(kpis?.totalProduzido),sub: 'OPs finalizadas no período',   path: '/Kanban',    alert: false },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map(c => (
        <KpiCard key={c.label} loading={loading} {...c} />
      ))}
    </div>
  );
}