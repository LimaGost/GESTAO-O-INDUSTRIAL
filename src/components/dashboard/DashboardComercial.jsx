import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Users, Package, BarChart2 } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend
} from 'recharts';
import CustomTooltip from './CustomTooltip';
import ExportableChart from './ExportableChart';

const COLORS = ['#F59E0B', '#3B82F6', '#22C55E', '#F97316', '#A855F7', '#EC4899', '#14B8A6', '#64748B'];
const VALOR_OCULTO = '••••••';

function isInRange(dateStr, from, to) {
  if (!dateStr) return true;
  const d = new Date(dateStr);
  if (from && d < new Date(from)) return false;
  if (to) { const t = new Date(to); t.setHours(23, 59, 59); if (d > t) return false; }
  return true;
}

function Skeleton({ h = 160 }) {
  return <div className="animate-pulse bg-muted rounded-xl" style={{ height: h }} />;
}

function SectionTitle({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon size={14} className="text-primary" />
      </div>
      <h3 className="text-sm font-bold text-foreground">{label}</h3>
    </div>
  );
}

export default function DashboardComercial({ rawData, loading, period, ocultarValores, geral }) {
  const c = useMemo(() => {
    if (!rawData) return null;
    const { pedidos: allPedidos, clientes: allClientes = [] } = rawData;
    const { from, to } = period;
    const pedidos = allPedidos.filter(p => isInRange(p.data_pedido || p.created_date, from, to) && p.status !== 'cancelado');

    // Evolução de vendas por dia (últimos 30 dias)
    const hoje = new Date();
    const diasMap = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(hoje); d.setDate(hoje.getDate() - i);
      const k = d.toISOString().split('T')[0];
      diasMap[k] = { data: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), pedidos: 0, faturamento: 0 };
    }
    for (const p of pedidos) {
      const k = (p.data_pedido || p.created_date || '').split('T')[0];
      if (diasMap[k]) {
        diasMap[k].pedidos += 1;
        diasMap[k].faturamento += p.valor_total || 0;
      }
    }
    const evolucao = Object.values(diasMap);

    // Faturamento por mês (últimos 6 meses)
    const mesesMap = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      mesesMap[k] = { mes: label, faturamento: 0, pedidos: 0 };
    }
    for (const p of allPedidos.filter(p => p.status !== 'cancelado')) {
      const d = p.data_pedido || p.created_date;
      if (!d) continue;
      const dt = new Date(d);
      const k = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      if (mesesMap[k]) {
        mesesMap[k].faturamento += p.valor_total || 0;
        mesesMap[k].pedidos += 1;
      }
    }
    const faturamentoMensal = Object.values(mesesMap);

    // Clientes novos por mês (últimos 6 meses)
    const clientesMesMap = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      clientesMesMap[k] = { mes: label, clientes: 0 };
    }
    for (const cli of allClientes) {
      const d = cli.created_date;
      if (!d) continue;
      const dt = new Date(d);
      const k = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      if (clientesMesMap[k]) clientesMesMap[k].clientes += 1;
    }
    const clientesNovosMensal = Object.values(clientesMesMap);

    // Top clientes
    const clienteMap = {};
    for (const p of pedidos) {
      const k = p.cliente_nome || 'Sem nome';
      if (!clienteMap[k]) clienteMap[k] = { nome: k, faturamento: 0, pedidos: 0 };
      clienteMap[k].faturamento += p.valor_total || 0;
      clienteMap[k].pedidos += 1;
    }
    const topClientes = Object.values(clienteMap).sort((a, b) => b.faturamento - a.faturamento).slice(0, 8);

    // Top produtos
    const prodMap = {};
    for (const p of pedidos) {
      for (const item of (p.itens || [])) {
        const k = item.produto_nome;
        if (!prodMap[k]) prodMap[k] = { nome: k, quantidade: 0, faturamento: 0 };
        prodMap[k].quantidade += item.quantidade || 0;
        prodMap[k].faturamento += (item.preco_unitario || 0) * (item.quantidade || 0);
      }
    }
    const topProdutos = Object.values(prodMap).sort((a, b) => b.quantidade - a.quantidade).slice(0, 6);
    const totalQtd = topProdutos.reduce((s, p) => s + p.quantidade, 0);
    topProdutos.forEach(p => { p.participacao = totalQtd > 0 ? ((p.quantidade / totalQtd) * 100).toFixed(1) : 0; });

    // Status dos pedidos para pie
    const statusMap = {};
    for (const p of allPedidos.filter(p => isInRange(p.data_pedido || p.created_date, from, to))) {
      statusMap[p.status] = (statusMap[p.status] || 0) + 1;
    }
    const STATUS_L = { rascunho: 'Rascunho', aguardando_estoque: 'Ag. Estoque', separacao: 'Separação', separado: 'Separado', expedido: 'Expedido', entregue: 'Entregue', cancelado: 'Cancelado' };
    const statusPie = Object.entries(statusMap).map(([k, v]) => ({ name: STATUS_L[k] || k, value: v })).filter(x => x.value > 0);

    return { evolucao, faturamentoMensal, clientesNovosMensal, topClientes, topProdutos, statusPie };
  }, [rawData, period]);

  const fR = (v) => ocultarValores ? VALOR_OCULTO : `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;

  return (
    <div className="space-y-4">
      {/* Evolução de pedidos */}
      <ExportableChart title="Evolução de Pedidos — Últimos 30 dias">
        {loading ? <Skeleton h={180} /> : (
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={c?.evolucao || []} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gPedidos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="data" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} interval={4} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} width={25} />
              <Tooltip content={<CustomTooltip unit=" pedidos" />} />
              <Area type="monotone" dataKey="pedidos" name="Pedidos" stroke="#3B82F6" fill="url(#gPedidos)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </ExportableChart>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Clientes novos por mês */}
        <ExportableChart title="Clientes Novos — Últimos 6 meses">
          {loading ? <Skeleton h={180} /> : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={c?.clientesNovosMensal || []} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={25} allowDecimals={false} />
                <Tooltip content={<CustomTooltip unit=" clientes" />} />
                <Bar dataKey="clientes" name="Clientes novos" fill="#A855F7" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ExportableChart>

        {/* Faturamento mensal */}
        <ExportableChart title="Faturamento Mensal — Últimos 6 meses">
          {loading ? <Skeleton h={180} /> : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={c?.faturamentoMensal || []} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={40}
                  tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                <Tooltip content={<CustomTooltip prefix="R$ " formatter={(v) => v.toLocaleString('pt-BR')} />} />
                <Bar dataKey="faturamento" name="Faturamento" fill="#22C55E" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ExportableChart>

        {/* Status dos pedidos */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <SectionTitle icon={BarChart2} label="Pedidos por Status" />
          {loading ? <Skeleton h={140} /> : (
            <>
              <ResponsiveContainer width="100%" height={130}>
                <PieChart>
                  <Pie data={c?.statusPie || []} dataKey="value" cx="50%" cy="50%" outerRadius={55} innerRadius={28}>
                    {(c?.statusPie || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                {(c?.statusPie || []).map((s, i) => (
                  <div key={s.name} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    {s.name} ({s.value})
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top clientes */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <SectionTitle icon={Users} label="Top Clientes por Faturamento" />
          {loading ? <Skeleton h={200} /> : (
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {(c?.topClientes || []).length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">Nenhum dado no período</p>
              ) : (c?.topClientes || []).map((cl, i) => {
                const max = c.topClientes[0]?.faturamento || 1;
                const pct = Math.round((cl.faturamento / max) * 100);
                return (
                  <div key={cl.nome} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                          style={{ background: COLORS[i % COLORS.length] }}>
                          {i + 1}
                        </span>
                        <span className="font-medium text-foreground truncate">{cl.nome}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        <span className="text-[10px] text-muted-foreground">{cl.pedidos} ped.</span>
                        <span className="font-bold text-primary text-[11px]">{fR(cl.faturamento)}</span>
                      </div>
                    </div>
                    <div className="h-1 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top produtos */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <SectionTitle icon={Package} label="Produtos Mais Vendidos" />
          {loading ? <Skeleton h={200} /> : (
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {(c?.topProdutos || []).length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">Nenhum dado no período</p>
              ) : (c?.topProdutos || []).map((p, i) => {
                const max = c.topProdutos[0]?.quantidade || 1;
                const pct = Math.round((p.quantidade / max) * 100);
                return (
                  <div key={p.nome} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground truncate flex-1">{p.nome}</span>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        <span className="text-[10px] text-muted-foreground">{p.participacao}%</span>
                        <span className="font-bold text-foreground">{p.quantidade} un</span>
                      </div>
                    </div>
                    <div className="h-1 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}