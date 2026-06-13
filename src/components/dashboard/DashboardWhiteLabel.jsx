import { useMemo } from 'react';
import { Tag, Users, Package } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import CustomTooltip from './CustomTooltip';
import ExportableChart from './ExportableChart';

const COLORS = ['#A855F7', '#3B82F6', '#22C55E', '#F97316', '#EC4899', '#14B8A6'];
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

function KpiWL({ label, value, sub, color = 'bg-purple-500' }) {
  return (
    <div className="bg-card border border-purple-200 rounded-2xl p-4">
      <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center mb-2`}>
        <Tag size={14} className="text-white" />
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs font-semibold text-foreground mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

export default function DashboardWhiteLabel({ rawData, loading, period, ocultarValores }) {
  const d = useMemo(() => {
    if (!rawData) return null;
    const { pedidos: allPedidos, ordens: allOrdens } = rawData;
    const { from, to } = period;

    const pedidosWL = allPedidos.filter(p =>
      p.white_label && isInRange(p.data_pedido || p.created_date, from, to)
    );
    const ordensWL = allOrdens.filter(o =>
      (o.white_label || (o.pedido_id && allPedidos.find(p => p.id === o.pedido_id)?.white_label)) &&
      isInRange(o.created_date, from, to)
    );

    const totalPedidos = pedidosWL.length;
    const faturamentoWL = pedidosWL.reduce((s, p) => s + (p.valor_total || 0), 0);
    const qtdProduzida = ordensWL.filter(o => o.status === 'finalizado').reduce((s, o) => s + (o.quantidade || 0), 0);
    const clientesWL = new Set(pedidosWL.map(p => p.white_label_marca || p.cliente_nome).filter(Boolean)).size;

    // Por cliente WL
    const clienteMap = {};
    for (const p of pedidosWL) {
      const k = p.white_label_marca || p.cliente_nome || 'Sem marca';
      if (!clienteMap[k]) clienteMap[k] = { nome: k, pedidos: 0, faturamento: 0 };
      clienteMap[k].pedidos += 1;
      clienteMap[k].faturamento += p.valor_total || 0;
    }
    const porCliente = Object.values(clienteMap).sort((a, b) => b.faturamento - a.faturamento);

    // Evolução mensal
    const hoje = new Date();
    const mesesMap = {};
    for (let i = 5; i >= 0; i--) {
      const dt = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const k = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      mesesMap[k] = { mes: dt.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }), pedidos: 0, faturamento: 0 };
    }
    for (const p of allPedidos.filter(p => p.white_label)) {
      const d = p.data_pedido || p.created_date;
      if (!d) continue;
      const dt = new Date(d);
      const k = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      if (mesesMap[k]) {
        mesesMap[k].pedidos += 1;
        mesesMap[k].faturamento += p.valor_total || 0;
      }
    }
    const evolucao = Object.values(mesesMap);

    return { totalPedidos, faturamentoWL, qtdProduzida, clientesWL, porCliente, evolucao };
  }, [rawData, period]);

  const fR = (v) => ocultarValores ? VALOR_OCULTO : `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;

  const semDados = !loading && (d?.totalPedidos || 0) === 0;

  return (
    <div className="space-y-4">
      {semDados ? (
        <div className="bg-card border border-purple-100 rounded-2xl p-12 text-center">
          <Tag size={40} className="text-purple-200 mx-auto mb-3" />
          <p className="text-sm font-bold text-muted-foreground">Nenhum pedido White Label no período</p>
          <p className="text-xs text-muted-foreground mt-1">Marque pedidos como White Label na tela de Pedidos.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiWL label="Pedidos WL" value={loading ? '—' : d?.totalPedidos || 0} sub="No período selecionado" color="bg-purple-500" />
            <KpiWL label="Faturamento WL" value={loading ? '—' : fR(d?.faturamentoWL)} sub="Receita White Label" color="bg-indigo-500" />
            <KpiWL label="Produção WL" value={loading ? '—' : d?.qtdProduzida || 0} sub="Unidades produzidas" color="bg-pink-500" />
            <KpiWL label="Clientes WL" value={loading ? '—' : d?.clientesWL || 0} sub="Marcas ativas" color="bg-violet-500" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Faturamento por cliente */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Users size={14} className="text-purple-600" />
                <h3 className="text-sm font-bold text-foreground">Por Cliente / Marca</h3>
              </div>
              {loading ? <Skeleton h={180} /> : (d?.porCliente || []).length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">Sem dados</p>
              ) : (
                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                  {(d?.porCliente || []).map((cl, i) => {
                    const max = d.porCliente[0]?.faturamento || 1;
                    const pct = Math.round((cl.faturamento / max) * 100);
                    return (
                      <div key={cl.nome}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                              style={{ background: COLORS[i % COLORS.length] }}>
                              {i + 1}
                            </span>
                            <span className="font-medium text-foreground truncate">{cl.nome}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            <span className="text-[10px] text-muted-foreground">{cl.pedidos} ped.</span>
                            <span className="font-bold text-purple-600">{fR(cl.faturamento)}</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Evolução mensal */}
            <ExportableChart title="Evolução Mensal White Label">
              {loading ? <Skeleton h={180} /> : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={d?.evolucao || []} barSize={24}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="mes" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} width={25} />
                    <Tooltip content={<CustomTooltip unit=" pedidos" />} />
                    <Bar dataKey="pedidos" name="Pedidos WL" fill="#A855F7" radius={[5, 5, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ExportableChart>
          </div>
        </>
      )}
    </div>
  );
}