import { useMemo } from 'react';
import { Truck, Package, CheckCircle, MapPin } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import CustomTooltip from './CustomTooltip';
import ExportableChart from './ExportableChart';

const CORES_DESTINO = {
  retirada_fabrica: { label: 'Retirada Fábrica',  color: '#64748B', emoji: '🏭' },
  retirada_unidade: { label: 'Retirada Unidade',  color: '#3B82F6', emoji: '🏢' },
  transportadora:   { label: 'Transportadora',    color: '#F97316', emoji: '🚛' },
  entrega_cliente:  { label: 'Entrega Cliente',   color: '#22C55E', emoji: '🏠' },
};

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

function StatBox({ label, value, color = 'text-foreground', sub, emoji }) {
  return (
    <div className="bg-muted/30 rounded-xl p-3 text-center">
      {emoji && <span className="text-xl block mb-1">{emoji}</span>}
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs font-semibold text-foreground mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

export default function DashboardLogistica({ rawData, loading, period }) {
  const d = useMemo(() => {
    if (!rawData) return null;
    const { pedidos: allPedidos, expedicoes: allExps } = rawData;
    const { from, to } = period;

    const pedidos = allPedidos.filter(p => isInRange(p.data_pedido || p.created_date, from, to));
    const exps = allExps.filter(e => isInRange(e.data_emissao || e.created_date, from, to));

    // Destino dos pedidos
    const destinoMap = {};
    for (const p of pedidos) {
      const k = p.destino_tipo || 'sem_destino';
      destinoMap[k] = (destinoMap[k] || 0) + 1;
    }
    const destinoPie = Object.entries(destinoMap).map(([k, v]) => ({
      name: CORES_DESTINO[k]?.label || 'Sem destino',
      value: v,
      color: CORES_DESTINO[k]?.color || '#94A3B8',
      emoji: CORES_DESTINO[k]?.emoji || '📦',
    }));

    // Status expedição
    const hoje = new Date().toISOString().split('T')[0];
    const aguardando = allPedidos.filter(p => p.status === 'separado').length;
    const expHoje = allExps.filter(e => (e.data_emissao || '').startsWith(hoje)).length;
    const emTransito = allExps.filter(e => e.status === 'enviada').length;
    const entregues = allExps.filter(e => e.status === 'entregue').length;

    // Transportadoras
    const transpMap = {};
    for (const e of allExps) {
      const k = e.transportadora || 'Própria/Retirada';
      if (!transpMap[k]) transpMap[k] = { nome: k, entregas: 0, confirmadas: 0 };
      transpMap[k].entregas += 1;
      if (e.confirmado_pelo_cliente) transpMap[k].confirmadas += 1;
    }
    const transportadoras = Object.values(transpMap).sort((a, b) => b.entregas - a.entregas).slice(0, 6);

    // Evolução de entregas por mês
    const mesesMap = {};
    const agora = new Date();
    for (let i = 5; i >= 0; i--) {
      const dt = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
      const k = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      mesesMap[k] = { mes: dt.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }), emitidas: 0, enviadas: 0, entregues: 0 };
    }
    for (const e of allExps) {
      const ref = e.data_emissao || e.created_date;
      if (!ref) continue;
      const dt = new Date(ref);
      const k = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      if (!mesesMap[k]) continue;
      mesesMap[k].emitidas += 1;
      if (e.status === 'enviada' || e.status === 'entregue') mesesMap[k].enviadas += 1;
      if (e.status === 'entregue') mesesMap[k].entregues += 1;
    }
    const evolucaoExps = Object.values(mesesMap);

    return { destinoPie, aguardando, expHoje, emTransito, entregues, transportadoras, evolucaoExps };
  }, [rawData, period]);

  return (
    <div className="space-y-4">
      {/* Resumo expedição */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatBox emoji="⏳" label="Aguardando Expedição" value={loading ? '—' : d?.aguardando || 0} color="text-amber-600" sub="Pedidos separados" />
        <StatBox emoji="📄" label="Expedidos Hoje" value={loading ? '—' : d?.expHoje || 0} color="text-blue-600" sub="NFs emitidas hoje" />
        <StatBox emoji="🚛" label="Em Trânsito" value={loading ? '—' : d?.emTransito || 0} color="text-orange-600" sub="Aguardando entrega" />
        <StatBox emoji="✅" label="Entregues" value={loading ? '—' : d?.entregues || 0} color="text-green-600" sub="Confirmadas" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Destino dos pedidos */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <MapPin size={14} className="text-primary" />
            <h3 className="text-sm font-bold text-foreground">Destino dos Pedidos</h3>
          </div>
          {loading ? <Skeleton h={180} /> : (d?.destinoPie || []).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground/50">
              <MapPin size={28} className="mb-2 opacity-30" />
              <p className="text-xs">Nenhum dado de destino</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={d?.destinoPie || []} dataKey="value" cx="50%" cy="50%" outerRadius={60} innerRadius={30}>
                    {(d?.destinoPie || []).map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {(d?.destinoPie || []).map(s => (
                  <div key={s.name} className="flex items-center gap-1.5 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                    <span className="text-muted-foreground truncate">{s.emoji} {s.name}</span>
                    <span className="font-bold text-foreground ml-auto">{s.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Evolução mensal expedições */}
        <ExportableChart title="Expedições por Mês">
          {loading ? <Skeleton h={180} /> : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={d?.evolucaoExps || []} barSize={18}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} width={25} />
                <Tooltip content={<CustomTooltip unit=" NFs" />} />
                <Bar dataKey="emitidas"  name="Emitidas"  fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="entregues" name="Entregues" fill="#22C55E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ExportableChart>
      </div>

      {/* Transportadoras */}
      {!loading && (d?.transportadoras || []).length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Truck size={14} className="text-primary" />
            <h3 className="text-sm font-bold text-foreground">Ranking de Transportadoras</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {(d?.transportadoras || []).map((t, i) => {
              const pct = t.entregas > 0 ? Math.round((t.confirmadas / t.entregas) * 100) : 0;
              return (
                <div key={t.nome} className="bg-muted/30 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-bold text-foreground truncate">{t.nome}</p>
                    <span className="text-xs font-bold text-primary">{t.entregas}</span>
                  </div>
                  <div className="h-1 bg-muted rounded-full overflow-hidden mb-1">
                    <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[10px] text-muted-foreground">{pct}% confirmadas</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}