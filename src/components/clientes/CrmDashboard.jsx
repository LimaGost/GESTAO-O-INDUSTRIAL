import { useMemo, useState } from 'react';
import { TrendingUp, Users, ShoppingCart, DollarSign } from 'lucide-react';
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
  const ultima = new Date(Math.max(...datas));
  return Math.floor((Date.now() - ultima.getTime()) / (1000 * 60 * 60 * 24));
}

function getRisco(dias) {
  if (dias === null) return 'nunca';
  if (dias <= 30) return 'ativo';
  if (dias <= 90) return 'atencao';
  return 'risco';
}

const RISCO_CONFIG = {
  ativo: { label: 'Ativo', color: 'text-green-600', bg: 'bg-green-50', dot: 'bg-green-500', barColor: '#22C55E' },
  atencao: { label: 'Atenção', color: 'text-orange-600', bg: 'bg-orange-50', dot: 'bg-orange-500', barColor: '#F97316' },
  risco: { label: 'Em risco', color: 'text-red-600', bg: 'bg-red-50', dot: 'bg-red-500', barColor: '#EF4444' },
  nunca: { label: 'Sem pedido', color: 'text-muted-foreground', bg: 'bg-muted', dot: 'bg-muted-foreground', barColor: '#94A3B8' },
};

const fmtR = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
const fmtRShort = (v) => {
  if (v >= 1000) return `R$ ${(v / 1000).toFixed(1)}k`;
  return `R$ ${(v || 0).toFixed(0)}`;
};

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
        p.status !== 'cancelado' &&
        new Date(p.data_pedido || p.created_date) >= inicioPeriodo
      );
      const totalPeriodo = pedidosPeriodo.reduce((s, p) => s + (p.valor_total || 0), 0);
      const qtdPeriodo = pedidosPeriodo.length;
      const ticketMedio = qtdPeriodo > 0 ? totalPeriodo / qtdPeriodo : 0;
      return { ...c, dias, risco, totalPeriodo, qtdPeriodo, ticketMedio };
    });
  }, [clientes, pedidosPorCliente, mesesPeriodo]);

  const sorted = useMemo(() => {
    return [...clientesComMetricas].sort((a, b) => {
      switch (ordenarPor) {
        case 'dias_desc': return (b.dias ?? -1) - (a.dias ?? -1);
        case 'dias_asc': return (a.dias ?? 99999) - (b.dias ?? 99999);
        case 'valor_desc': return b.totalPeriodo - a.totalPeriodo;
        case 'qtd_desc': return b.qtdPeriodo - a.qtdPeriodo;
        default: return 0;
      }
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

  const topRanking = [...clientesComMetricas]
    .sort((a, b) => b.totalPeriodo - a.totalPeriodo)
    .slice(0, 8)
    .map(c => ({ nome: c.nome.split(' ')[0], total: c.totalPeriodo, risco: c.risco, fullCliente: c }));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="font-bold text-foreground text-lg">Painel CRM</h3>
        <div className="flex gap-1 bg-muted p-1 rounded-xl">
          {PERIODOS.map(p => (
            <button key={p.key} onClick={() => setPeriodo(p.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${periodo === p.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Faturamento', value: fmtRShort(totalPeriodoGeral), sub: 'no período', icon: DollarSign, color: 'bg-green-500' },
          { label: 'Pedidos', value: totalPedidosPeriodo, sub: 'no período', icon: ShoppingCart, color: 'bg-sky-500' },
          { label: 'Ticket Médio', value: fmtRShort(ticketMedioGeral), sub: 'por pedido', icon: TrendingUp, color: 'bg-purple-500' },
          { label: 'Total Clientes', value: clientes.length, sub: `${resumo.ativo} ativos`, icon: Users, color: 'bg-amber-500' },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="bg-card border border-border rounded-2xl p-4">
            <div className={`w-8 h-8 rounded-xl ${color} flex items-center justify-center mb-2`}>
              <Icon size={15} className="text-white" />
            </div>
            <p className="text-xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-xs text-muted-foreground">{sub}</p>
          </div>
        ))}
      </div>

      {/* Status de risco */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { key: 'ativo', icon: '🟢', label: 'Ativos', sub: '≤30 dias', value: resumo.ativo },
          { key: 'atencao', icon: '🟡', label: 'Atenção', sub: '31–90 dias', value: resumo.atencao },
          { key: 'risco', icon: '🔴', label: 'Em risco', sub: '>90 dias', value: resumo.risco },
          { key: 'nunca', icon: '⚪', label: 'Sem pedido', sub: 'nunca compraram', value: resumo.nunca },
        ].map(item => (
          <div key={item.key} className="bg-card border border-border rounded-2xl p-3 text-center">
            <p className="text-lg">{item.icon}</p>
            <p className="text-2xl font-bold text-foreground">{item.value}</p>
            <p className="text-xs font-medium text-foreground">{item.label}</p>
            <p className="text-xs text-muted-foreground">{item.sub}</p>
          </div>
        ))}
      </div>

      {/* Abas */}
      <div className="flex gap-1 bg-muted p-1 rounded-xl w-fit">
        {[{ key: 'lista', label: 'Lista' }, { key: 'ranking', label: 'Ranking' }, { key: 'risco', label: 'Em Risco' }].map(a => (
          <button key={a.key} onClick={() => setAbaAtiva(a.key)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${abaAtiva === a.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            {a.label}
          </button>
        ))}
      </div>

      {/* Aba: Ranking */}
      {abaAtiva === 'ranking' && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <h4 className="font-semibold text-foreground">Top Clientes por Faturamento</h4>
          {topRanking.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum dado no período.</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={topRanking} onClick={e => e?.activePayload && onVerCliente(e.activePayload[0]?.payload?.fullCliente)}>
                  <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={v => fmtRShort(v)} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => fmtR(v)} />
                  <Bar dataKey="total" radius={[6,6,0,0]}>
                    {topRanking.map((entry, i) => (
                      <Cell key={i} fill={RISCO_CONFIG[entry.risco]?.barColor || '#94A3B8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {topRanking.map((c, i) => (
                  <button key={i} onClick={() => onVerCliente(c.fullCliente)}
                    className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-muted transition-colors text-left">
                    <span className="w-6 text-center text-xs font-bold text-muted-foreground">{i + 1}</span>
                    <span className="flex-1 text-sm font-medium text-foreground">{c.fullCliente?.nome}</span>
                    <span className="text-sm font-bold text-foreground">{fmtRShort(c.total)}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Aba: Em risco */}
      {abaAtiva === 'risco' && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <p className="text-sm font-semibold text-foreground">{resumo.risco + resumo.atencao} clientes precisam de atenção</p>
          {sorted.filter(c => c.risco === 'risco' || c.risco === 'atencao').map(c => {
            const cfg = RISCO_CONFIG[c.risco];
            return (
              <button key={c.id} onClick={() => onVerCliente(c)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors text-left border border-border">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${cfg.bg} ${cfg.color}`}>
                  {c.nome.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{c.nome}</p>
                  <p className="text-xs text-muted-foreground">{c.cidade || c.email || '—'}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${cfg.bg} ${cfg.color}`}>
                  {c.dias !== null ? `${c.dias}d sem comprar` : 'Nunca comprou'}
                </span>
              </button>
            );
          })}
          {resumo.risco + resumo.atencao === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">🎉 Todos os clientes estão ativos!</p>
          )}
        </div>
      )}

      {/* Aba: Lista */}
      {abaAtiva === 'lista' && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Clientes ({sorted.length})</p>
            <select value={ordenarPor} onChange={e => setOrdenarPor(e.target.value)}
              className="text-xs border border-border rounded-lg px-2 py-1 bg-background text-foreground focus:outline-none">
              <option value="valor_desc">Maior faturamento</option>
              <option value="qtd_desc">Mais pedidos</option>
              <option value="dias_desc">Mais tempo sem comprar</option>
              <option value="dias_asc">Comprou mais recente</option>
            </select>
          </div>
          <div className="space-y-2">
            {sorted.map((c, idx) => {
              const cfg = RISCO_CONFIG[c.risco];
              const isTop = idx < 3 && ordenarPor === 'valor_desc' && c.totalPeriodo > 0;
              return (
                <button key={c.id} onClick={() => onVerCliente(c)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors text-left border border-border">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${isTop ? 'bg-amber-100 text-amber-700' : 'bg-muted text-muted-foreground'}`}>
                    {isTop ? ['🥇','🥈','🥉'][idx] : c.nome.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{c.nome}</p>
                    <p className="text-xs text-muted-foreground">{c.cidade || c.email || ''}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-foreground">{fmtRShort(c.totalPeriodo)}</p>
                    <p className="text-xs text-muted-foreground">{c.qtdPeriodo} pedido{c.qtdPeriodo !== 1 ? 's' : ''}</p>
                  </div>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                </button>
              );
            })}
            {sorted.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Nenhum cliente cadastrado.</p>}
          </div>
        </div>
      )}
    </div>
  );
}