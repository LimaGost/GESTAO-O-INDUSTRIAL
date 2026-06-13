import { useMemo } from 'react';
import { Truck, MapPin, CheckCircle, Package } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import ExportableChart from '@/components/dashboard/ExportableChart';
import ExportButtons from '@/components/relatorios/ExportButtons';

const COLORS = ['#3B82F6', '#22C55E', '#F97316', '#A855F7', '#F59E0B', '#14B8A6'];

function fmtR(v) { return `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`; }
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d.includes('T') ? d : d + 'T12:00:00').toLocaleDateString('pt-BR');
}

function KpiCard({ label, value, sub, color, emoji }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <span className="text-2xl block mb-1">{emoji}</span>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs font-semibold text-foreground mt-0.5">{label}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export default function TabExpedicaoRel({ expedicoes, pedidos }) {
  const { destinoPie, transportadoras, evolucao, stats } = useMemo(() => {
    const DESTINO_L = {
      retirada_fabrica: 'Retirada Fábrica', retirada_unidade: 'Retirada Unidade',
      transportadora: 'Transportadora', entrega_cliente: 'Entrega Cliente',
    };

    // Mapa de pedidos por id
    const pedidoMap = {};
    for (const p of pedidos) pedidoMap[p.id] = p;

    // Destinos
    const destMap = {};
    for (const e of expedicoes) {
      const p = pedidoMap[e.pedido_id];
      const k = p?.destino_tipo || 'sem_destino';
      destMap[k] = (destMap[k] || 0) + 1;
    }
    const destinoPie = Object.entries(destMap).map(([k, v], i) => ({
      name: DESTINO_L[k] || 'Sem destino', value: v, color: COLORS[i % COLORS.length],
    }));

    // Transportadoras
    const transpMap = {};
    for (const e of expedicoes) {
      const k = e.transportadora || 'Própria / Retirada';
      if (!transpMap[k]) transpMap[k] = { nome: k, total: 0, entregues: 0, confirmadas: 0 };
      transpMap[k].total += 1;
      if (e.status === 'entregue' || e.status === 'enviada') transpMap[k].entregues += 1;
      if (e.confirmado_pelo_cliente) transpMap[k].confirmadas += 1;
    }
    const transportadoras = Object.values(transpMap).sort((a, b) => b.total - a.total);

    // Evolução mensal
    const hoje = new Date();
    const mesesMap = {};
    for (let i = 5; i >= 0; i--) {
      const dt = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const k = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      mesesMap[k] = { mes: dt.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }), emitidas: 0, enviadas: 0, entregues: 0 };
    }
    for (const e of expedicoes) {
      const ref = e.data_emissao || e.created_date;
      if (!ref) continue;
      const dt = new Date(ref);
      const k = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      if (!mesesMap[k]) continue;
      mesesMap[k].emitidas += 1;
      if (e.status === 'enviada' || e.status === 'entregue') mesesMap[k].enviadas += 1;
      if (e.status === 'entregue') mesesMap[k].entregues += 1;
    }
    const evolucao = Object.values(mesesMap);

    const stats = {
      total: expedicoes.length,
      emTransito: expedicoes.filter(e => e.status === 'enviada').length,
      entregues: expedicoes.filter(e => e.status === 'entregue').length,
      confirmados: expedicoes.filter(e => e.confirmado_pelo_cliente).length,
      valorTotal: expedicoes.reduce((s, e) => s + (e.valor_total || 0), 0),
    };

    return { destinoPie, transportadoras, evolucao, stats };
  }, [expedicoes, pedidos]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard emoji="📄" label="Total Expedições" value={stats.total} sub="NFs emitidas" />
        <KpiCard emoji="🚛" label="Em Trânsito" value={stats.emTransito} sub="em rota" />
        <KpiCard emoji="✅" label="Entregues" value={stats.entregues} sub="confirmadas" />
        <KpiCard emoji="🤝" label="Conf. pelo Cliente" value={stats.confirmados} sub="assinaturas coletadas" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Destinos */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <MapPin size={14} className="text-primary" />
            <h3 className="text-sm font-bold text-foreground">Destino dos Pedidos</h3>
          </div>
          {destinoPie.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground/50"><p className="text-xs">Sem dados</p></div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={destinoPie} dataKey="value" cx="50%" cy="50%" outerRadius={65} innerRadius={32}>
                    {destinoPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-1.5 mt-2">
                {destinoPie.map(s => (
                  <div key={s.name} className="flex items-center gap-1.5 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                    <span className="text-muted-foreground truncate">{s.name}</span>
                    <span className="font-bold text-foreground ml-auto">{s.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Evolução */}
        <ExportableChart title="Expedições por Mês">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={evolucao} barSize={18}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} width={25} />
              <Tooltip />
              <Bar dataKey="emitidas" name="Emitidas" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="entregues" name="Entregues" fill="#22C55E" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ExportableChart>
      </div>

      {/* Transportadoras */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Truck size={14} className="text-primary" />
            <h3 className="text-sm font-bold text-foreground">Ranking de Transportadoras</h3>
          </div>
          <ExportButtons filename="transportadoras" title="Transportadoras — Raio do Sol"
            columns={[
              { header: 'Transportadora', key: 'nome', width: 50 },
              { header: 'Entregas', key: 'total', width: 25 },
              { header: 'Em Trânsito', key: 'entregues', width: 25 },
              { header: 'Confirmadas', key: 'confirmadas', width: 25 },
            ]}
            rows={transportadoras.map(t => ({ nome: t.nome, total: t.total, entregues: t.entregues, confirmadas: t.confirmadas }))}
          />
        </div>
        {transportadoras.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">Nenhuma expedição registrada</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border">
                {['Transportadora', 'Total', 'Entregues/Trânsito', 'Confirmados', 'Taxa Confirmação'].map(h => (
                  <th key={h} className="text-left py-2 pr-4 text-xs text-muted-foreground font-semibold">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {transportadoras.map((t, i) => {
                  const taxa = t.total > 0 ? Math.round((t.confirmadas / t.total) * 100) : 0;
                  return (
                    <tr key={t.nome} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="py-2 pr-4 font-medium text-foreground">{t.nome}</td>
                      <td className="py-2 pr-4 font-bold text-foreground">{t.total}</td>
                      <td className="py-2 pr-4 text-blue-600 font-semibold">{t.entregues}</td>
                      <td className="py-2 pr-4 text-green-600 font-semibold">{t.confirmadas}</td>
                      <td className="py-2 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 rounded-full" style={{ width: `${taxa}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground">{taxa}%</span>
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