import { useMemo, useState } from 'react';
import { TrendingUp, Users, Award, AlertTriangle, Clock, ShoppingCart, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const PERIODOS = [
  { key: 'mes', label: 'Este Mês', meses: 1 },
  { key: 'trimestre', label: 'Trimestre', meses: 3 },
  { key: 'semestre', label: 'Semestre', meses: 6 },
  { key: 'ano', label: 'Ano', meses: 12 },
];

function diasSemComprar(pedidos) {
  const ativos = pedidos.filter(p => p.status !== 'cancelado');
  if (ativos.length === 0) return null;
  const datas = ativos.map(p => new Date(p.data_pedido || p.created_date)).filter(d => !isNaN(d));
  if (datas.length === 0) return null;
  return Math.floor((Date.now() - Math.max(...datas)) / 86400000);
}

function getRisco(dias) {
  if (dias === null) return 'nunca';
  if (dias <= 30) return 'ativo';
  if (dias <= 90) return 'atencao';
  return 'risco';
}

const RISCO_CONFIG = {
  ativo: { label: 'Ativo', color: 'text-green-600', bg: 'bg-green-100', dot: 'bg-green-500', barColor: '#22C55E' },
  atencao: { label: 'Atenção', color: 'text-amber-600', bg: 'bg-amber-100', dot: 'bg-amber-500', barColor: '#F97316' },
  risco: { label: 'Em risco', color: 'text-red-600', bg: 'bg-red-100', dot: 'bg-red-500', barColor: '#EF4444' },
  nunca: { label: 'Sem pedido', color: 'text-muted-foreground', bg: 'bg-muted', dot: 'bg-muted-foreground', barColor: '#94A3B8' },
};

const fmtR = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
const fmtRShort = (v) => v >= 1000 ? `R$ ${(v / 1000).toFixed(1)}k` : `R$ ${(v || 0).toFixed(0)}`;

export default function CrmDashboard({ clientes, pedidos, onVerCliente }) {
  const [periodo, setPeriodo] = useState('semestre');
  const [ordenarPor, setOrdenarPor] = useState('valor_desc');
  const [abaAtiva, setAbaAtiva] = useState('lista');

  const pedidosPorCliente = useMemo(() => {
    const map = {};
    for (const p of pedidos) {
      if (!p.cliente_id) continue;
      if (!map[p.cliente_id]) map[p.cliente_id] = [];
      map[p.cliente_id].push(p);
    }
    return map;
  }, [pedidos]);

  const mesesPeriodo = PERIODOS.find(p => p.key === periodo)?.meses || 6;
  const inicioPeriodo = new Date();
  inicioPeriodo.setMonth(inicioPeriodo.getMonth() - mesesPeriodo);

  const clientesComMetricas = useMemo(() => {
    return clientes.map(c => {
      const todosPedidos = pedidosPorCliente[c.id] || [];
      const dias = diasSemComprar(todosPedidos);
      const risco = getRisco(dias);
      const pedidosPeriodo = todosPedidos.filter(p =>
        p.status !== 'cancelado' && new Date(p.data_pedido || p.created_date) >= inicioPeriodo
      );
      const totalPeriodo = pedidosPeriodo.reduce((s, p) => s + (p.valor_total || 0), 0);
      const qtdPeriodo = pedidosPeriodo.length;
      const ticketMedio = qtdPeriodo > 0 ? totalPeriodo / qtdPeriodo : 0;
      return { ...c, dias, risco, totalPeriodo, qtdPeriodo, ticketMedio };
    });
  }, [clientes, pedidosPorCliente, mesesPeriodo]);

  const sorted = useMemo(() => {
    return [...clientesComMetricas].sort((a, b) => {
      if (ordenarPor === 'dias_desc') return (b.dias ?? -1) - (a.dias ?? -1);
      if (ordenarPor === 'dias_asc') return (a.dias ?? 99999) - (b.dias ?? 99999);
      if (ordenarPor === 'valor_desc') return b.totalPeriodo - a.totalPeriodo;
      if (ordenarPor === 'qtd_desc') return b.qtdPeriodo - a.qtdPeriodo;
      return 0;
    });
  }, [clientesComMetricas, ordenarPor]);

  const resumo = useMemo(() => ({
    ativo: clientesComMetricas.filter(c => c.risco === 'ativo').length,
    atencao: clientesComMetricas.filter(c => c.risco === 'atencao').length,
    risco: clientesComMetricas.filter(c => c.risco === 'risco').length,
    nunca: clientesComMetricas.filter(c => c.risco === 'nunca').length,
  }), [clientesComMetricas]);

  const totalPeriodoGeral = clientesComMetricas.reduce((s, c) => s + c.totalPeriodo, 0);
  const totalPedidosPeriodo = clientesComMetricas.reduce((s, c) => s + c.qtdPeriodo, 0);
  const ticketMedioGeral = totalPedidosPeriodo > 0 ? totalPeriodoGeral / totalPedidosPeriodo : 0;

  const topRanking = [...clientesComMetricas].sort((a, b) => b.totalPeriodo - a.totalPeriodo).slice(0, 8)
    .map(c => ({ nome: c.nome.split(' ')[0], total: c.totalPeriodo, risco: c.risco, fullCliente: c }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-bold text-foreground">Painel CRM</h3>
        <div className="flex gap-1">
          {PERIODOS.map(p => (
            <button key={p.key} onClick={() => setPeriodo(p.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${periodo === p.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Faturamento', value: fmtRShort(totalPeriodoGeral), icon: DollarSign, color: 'bg-green-500' },
          { label: 'Pedidos', value: totalPedidosPeriodo, icon: ShoppingCart, color: 'bg-blue-500' },
          { label: 'Ticket Médio', value: fmtRShort(ticketMedioGeral), icon: TrendingUp, color: 'bg-purple-500' },
          { label: 'Total Clientes', value: clientes.length, icon: Users, color: 'bg-amber-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-card border border-border rounded-2xl p-4">
            <div className={`w-8 h-8 rounded-xl ${color} flex items-center justify-center mb-2`}>
              <Icon size={15} className="text-white" />
            </div>
            <p className="text-xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[
          { key: 'ativo', icon: '🟢', label: 'Ativos', value: resumo.ativo },
          { key: 'atencao', icon: '🟡', label: 'Atenção', value: resumo.atencao },
          { key: 'risco', icon: '🔴', label: 'Em risco', value: resumo.risco },
          { key: 'nunca', icon: '⚪', label: 'Sem pedido', value: resumo.nunca },
        ].map(item => (
          <div key={item.key} className="bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-lg">{item.icon}</p>
            <p className="text-xl font-bold text-foreground">{item.value}</p>
            <p className="text-xs text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 bg-muted p-1 rounded-xl">
        {[['lista', 'Lista'], ['ranking', 'Ranking'], ['risco', 'Em Risco']].map(([key, label]) => (
          <button key={key} onClick={() => setAbaAtiva(key)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${abaAtiva === key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            {label}
          </button>
        ))}
      </div>

      {abaAtiva === 'ranking' && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-foreground text-sm mb-4">Top Clientes por Faturamento</h3>
          {topRanking.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">Nenhum dado no período.</p> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topRanking} layout="vertical" barSize={16} onClick={e => e?.activePayload && onVerCliente(e.activePayload[0]?.payload?.fullCliente)}>
                <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="nome" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip formatter={(v) => fmtR(v)} />
                <Bar dataKey="total" name="Faturamento" radius={[0, 6, 6, 0]}>
                  {topRanking.map((e, i) => <Cell key={i} fill={RISCO_CONFIG[e.risco]?.barColor || '#94A3B8'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {abaAtiva === 'risco' && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{resumo.risco + resumo.atencao} clientes precisam de atenção</p>
          {sorted.filter(c => c.risco === 'risco' || c.risco === 'atencao').map(c => {
            const cfg = RISCO_CONFIG[c.risco];
            return (
              <button key={c.id} onClick={() => onVerCliente(c)} className="w-full flex items-center gap-3 p-3 bg-card border border-border rounded-xl hover:shadow-sm transition-all text-left">
                <div className={`w-9 h-9 rounded-full ${cfg.bg} flex items-center justify-center font-bold text-sm ${cfg.color}`}>{c.nome.charAt(0).toUpperCase()}</div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{c.nome}</p>
                  <p className="text-xs text-muted-foreground">{c.dias !== null ? `${c.dias}d sem comprar` : 'Nunca comprou'}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
              </button>
            );
          })}
          {resumo.risco + resumo.atencao === 0 && <p className="text-sm text-green-600 text-center py-6">🎉 Todos os clientes estão ativos!</p>}
        </div>
      )}

      {abaAtiva === 'lista' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">Clientes ({sorted.length})</p>
            <select value={ordenarPor} onChange={e => setOrdenarPor(e.target.value)}
              className="text-xs border border-border rounded-lg px-2 py-1 bg-background text-foreground focus:outline-none">
              <option value="valor_desc">Maior faturamento</option>
              <option value="qtd_desc">Mais pedidos</option>
              <option value="dias_desc">Mais tempo sem comprar</option>
              <option value="dias_asc">Comprou mais recente</option>
            </select>
          </div>
          {sorted.map((c, idx) => {
            const cfg = RISCO_CONFIG[c.risco];
            const isTop = idx < 3 && ordenarPor === 'valor_desc' && c.totalPeriodo > 0;
            return (
              <button key={c.id} onClick={() => onVerCliente(c)} className="w-full flex items-center gap-3 p-3 bg-card border border-border rounded-xl hover:shadow-sm transition-all text-left">
                <div className={`w-9 h-9 rounded-full ${cfg.bg} flex items-center justify-center font-bold text-sm ${cfg.color}`}>
                  {isTop ? ['🥇','🥈','🥉'][idx] : c.nome.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{c.nome}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.cidade || c.email || ''}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-foreground">{fmtRShort(c.totalPeriodo)}</p>
                  <p className="text-xs text-muted-foreground">{c.qtdPeriodo} pedido{c.qtdPeriodo !== 1 ? 's' : ''}</p>
                </div>
              </button>
            );
          })}
          {sorted.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Nenhum cliente.</p>}
        </div>
      )}
    </div>
  );
}