import { useMemo } from 'react';
import { Factory, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
  PieChart, Pie, RadarChart, Radar, PolarGrid, PolarAngleAxis
} from 'recharts';
import CustomTooltip from './CustomTooltip';
import ExportableChart from './ExportableChart';

const STATUS_OP = {
  a_produzir:   { label: 'A Produzir',   color: '#64748B' },
  em_producao:  { label: 'Em Produção',  color: '#0EA5E9' },
  produzido:    { label: 'Produzido',    color: '#22C55E' },
  em_embalagem: { label: 'Em Embalagem', color: '#F59E0B' },
  em_separacao: { label: 'Em Separação', color: '#14B8A6' },
  finalizado:   { label: 'Finalizado',   color: '#A855F7' },
  cancelado:    { label: 'Cancelado',    color: '#EF4444' },
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

function StatBox({ label, value, color = 'text-foreground', sub }) {
  return (
    <div className="bg-muted/30 rounded-xl p-3 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs font-semibold text-foreground mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

export default function DashboardProducao({ rawData, loading, period }) {
  const d = useMemo(() => {
    if (!rawData) return null;
    const { ordens: allOrdens } = rawData;
    const { from, to } = period;
    const ordens = allOrdens.filter(o => isInRange(o.created_date, from, to));

    // Por status
    const porStatus = Object.entries(STATUS_OP).map(([k, cfg]) => ({
      name: cfg.label,
      value: ordens.filter(o => o.status === k).length,
      color: cfg.color,
    })).filter(s => s.value > 0);

    // Por período (últimos 7 dias)
    const hoje = new Date();
    const diasMap = {};
    for (let i = 6; i >= 0; i--) {
      const dt = new Date(hoje); dt.setDate(hoje.getDate() - i);
      const k = dt.toISOString().split('T')[0];
      diasMap[k] = { data: dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), finalizadas: 0, iniciadas: 0 };
    }
    for (const op of allOrdens) {
      const kf = (op.data_finalizacao || '').split('T')[0];
      if (diasMap[kf]) diasMap[kf].finalizadas += 1;
      const ki = (op.data_inicio || '').split('T')[0];
      if (diasMap[ki]) diasMap[ki].iniciadas += 1;
    }
    const producaoDiaria = Object.values(diasMap);

    // Resumo do dia
    const todayStr = hoje.toISOString().split('T')[0];
    const finalizadasHoje = allOrdens.filter(o => (o.data_finalizacao || '').startsWith(todayStr)).length;
    const iniciadasHoje = allOrdens.filter(o => (o.data_inicio || '').startsWith(todayStr)).length;

    // Semana
    const semanaInicio = new Date(hoje); semanaInicio.setDate(hoje.getDate() - 6);
    const finalizadasSemana = allOrdens.filter(o => {
      if (!o.data_finalizacao) return false;
      const d = new Date(o.data_finalizacao);
      return d >= semanaInicio && d <= hoje;
    }).length;

    // OPs atrasadas (>7 dias em produção)
    const opsAtrasadas = allOrdens.filter(o =>
      ['a_produzir', 'em_producao'].includes(o.status) &&
      o.created_date && new Date(o.created_date) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );

    // Eficiência: finalizadas vs total
    const total = ordens.length;
    const finalizadas = ordens.filter(o => o.status === 'finalizado').length;
    const eficiencia = total > 0 ? Math.round((finalizadas / total) * 100) : 0;

    // Meses anteriores para gráfico de produção mensal
    const mesesMap = {};
    for (let i = 5; i >= 0; i--) {
      const dt = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const k = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      mesesMap[k] = { mes: dt.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }), finalizadas: 0 };
    }
    for (const op of allOrdens.filter(o => o.status === 'finalizado')) {
      if (!op.data_finalizacao) continue;
      const dt = new Date(op.data_finalizacao);
      const k = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      if (mesesMap[k]) mesesMap[k].finalizadas += 1;
    }
    const producaoMensal = Object.values(mesesMap);

    return { porStatus, producaoDiaria, producaoMensal, finalizadasHoje, iniciadasHoje, finalizadasSemana, opsAtrasadas, eficiencia, total, finalizadas };
  }, [rawData, period]);

  return (
    <div className="space-y-4">
      {/* Resumo rápido */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatBox label="Hoje" value={loading ? '—' : d?.finalizadasHoje || 0} color="text-green-600" sub="OPs finalizadas" />
        <StatBox label="Esta Semana" value={loading ? '—' : d?.finalizadasSemana || 0} color="text-blue-600" sub="OPs finalizadas" />
        <StatBox label="OPs Atrasadas" value={loading ? '—' : d?.opsAtrasadas?.length || 0} color={(d?.opsAtrasadas?.length || 0) > 0 ? 'text-red-600' : 'text-foreground'} sub="+7 dias em produção" />
        <StatBox label="Eficiência" value={loading ? '—' : `${d?.eficiencia || 0}%`} color="text-primary" sub={`${d?.finalizadas || 0} de ${d?.total || 0} OPs`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Status das OPs */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Factory size={14} className="text-primary" />
            <h3 className="text-sm font-bold text-foreground">Status das OPs</h3>
          </div>
          {loading ? <Skeleton h={180} /> : (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={d?.porStatus || []} barSize={26}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} width={25} />
                  <Tooltip content={<CustomTooltip unit=" OPs" />} />
                  <Bar dataKey="value" name="OPs" radius={[5, 5, 0, 0]}>
                    {(d?.porStatus || []).map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 mt-2">
                {(d?.porStatus || []).map(s => (
                  <div key={s.name} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                    {s.name} ({s.value})
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Produção mensal */}
        <ExportableChart title="OPs Finalizadas por Mês">
          {loading ? <Skeleton h={180} /> : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={d?.producaoMensal || []} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} width={25} />
                <Tooltip content={<CustomTooltip unit=" OPs" />} />
                <Bar dataKey="finalizadas" name="OPs Finalizadas" fill="#A855F7" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ExportableChart>
      </div>

      {/* OPs atrasadas */}
      {!loading && (d?.opsAtrasadas || []).length > 0 && (
        <div className="bg-card border border-red-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={14} className="text-red-500" />
            <h3 className="text-sm font-bold text-red-700">{d.opsAtrasadas.length} OPs Atrasadas (paradas há +7 dias)</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
            {d.opsAtrasadas.map(op => {
              const st = STATUS_OP[op.status] || { label: op.status, color: '#64748B' };
              const diasAtrasado = op.created_date
                ? Math.floor((Date.now() - new Date(op.created_date)) / (1000 * 60 * 60 * 24))
                : null;
              return (
                <div key={op.id} className="flex items-center justify-between bg-red-50 rounded-xl px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{op.numero}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{op.produto_nome}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <span className="text-[10px] text-red-600 font-bold">{diasAtrasado}d</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full text-white font-semibold" style={{ background: st.color }}>
                      {st.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}