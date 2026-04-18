import { useEffect, useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Trash2, TrendingDown, Package, AlertTriangle, Search, X, Calendar } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  CartesianGrid, Area, AreaChart
} from 'recharts';
import ExportableChart from '@/components/dashboard/ExportableChart';
import CustomTooltip from '@/components/dashboard/CustomTooltip';

const MOTIVO_LABEL = {
  defeito_fabricacao: 'Defeito de Fabricação',
  contaminacao:       'Contaminação',
  quebra:             'Quebra / Dano',
  vencimento:         'Vencimento',
  erro_processo:      'Erro de Processo',
  outros:             'Outros',
};

const MOTIVO_COLOR = {
  defeito_fabricacao: '#EF4444',
  contaminacao:       '#F97316',
  quebra:             '#EAB308',
  vencimento:         '#8B5CF6',
  erro_processo:      '#3B82F6',
  outros:             '#94A3B8',
};

const ETAPA_LABEL = {
  a_produzir:   'A Produzir',
  em_producao:  'Em Produção',
  produzido:    'Produzido',
  em_embalagem: 'Em Embalagem',
};

function fmtR(v) { return `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`; }
function fmtN(v) { return (v || 0).toLocaleString('pt-BR'); }

function isInRange(dateStr, from, to) {
  if (!dateStr) return true;
  const d = new Date(dateStr);
  if (from && d < new Date(from)) return false;
  if (to) { const t = new Date(to); t.setHours(23, 59, 59); if (d > t) return false; }
  return true;
}

function Empty({ msg = 'Sem dados no período.' }) {
  return <div className="py-10 text-center text-muted-foreground text-sm">{msg}</div>;
}

export default function Perdas() {
  const [descartes, setDescartes] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [busca, setBusca]         = useState('');
  const [filtroMotivo, setFiltroMotivo] = useState('todos');
  const [filtroEtapa, setFiltroEtapa]   = useState('todas');
  const [from, setFrom] = useState('');
  const [to, setTo]     = useState('');

  useEffect(() => {
    base44.entities.Descarte.list('-created_date').then(d => {
      setDescartes(d);
      setLoading(false);
    });
  }, []);

  const filtrados = useMemo(() => descartes.filter(d => {
    const matchBusca   = !busca || (d.produto_nome || '').toLowerCase().includes(busca.toLowerCase()) || (d.ordem_producao_numero || '').toLowerCase().includes(busca.toLowerCase());
    const matchMotivo  = filtroMotivo === 'todos' || d.motivo === filtroMotivo;
    const matchEtapa   = filtroEtapa  === 'todas' || d.etapa_producao === filtroEtapa;
    const matchPeriodo = isInRange(d.data_descarte || d.created_date, from, to);
    return matchBusca && matchMotivo && matchEtapa && matchPeriodo;
  }), [descartes, busca, filtroMotivo, filtroEtapa, from, to]);

  const totalDescartado   = filtrados.reduce((s, d) => s + (d.quantidade || 0), 0);
  const custoTotal        = filtrados.reduce((s, d) => s + (d.custo_total || 0), 0);
  const registros         = filtrados.length;
  const ticketMedioPerda  = registros > 0 ? custoTotal / registros : 0;

  const porMotivo = Object.entries(
    filtrados.reduce((acc, d) => {
      const k = d.motivo || 'outros';
      acc[k] = (acc[k] || 0) + (d.custo_total || 0);
      return acc;
    }, {})
  ).map(([motivo, custo]) => ({ name: MOTIVO_LABEL[motivo] || motivo, custo, color: MOTIVO_COLOR[motivo] || '#94A3B8' }))
   .sort((a, b) => b.custo - a.custo);

  const porProduto = Object.entries(
    filtrados.reduce((acc, d) => {
      const k = d.produto_nome || '—';
      if (!acc[k]) acc[k] = { qtd: 0, custo: 0 };
      acc[k].qtd   += d.quantidade || 0;
      acc[k].custo += d.custo_total || 0;
      return acc;
    }, {})
  ).map(([nome, v]) => ({ name: nome.length > 22 ? nome.slice(0, 22) + '…' : nome, ...v }))
   .sort((a, b) => b.custo - a.custo).slice(0, 8);

  const porDia = Object.entries(
    filtrados.reduce((acc, d) => {
      const dia = (d.data_descarte || d.created_date || '').slice(0, 10);
      if (!dia) return acc;
      acc[dia] = (acc[dia] || 0) + (d.custo_total || 0);
      return acc;
    }, {})
  ).sort((a, b) => a[0].localeCompare(b[0]))
   .slice(-14)
   .map(([dia, custo]) => ({
     dia: new Date(dia + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
     custo
   }));

  const motivos = Object.keys(MOTIVO_LABEL);
  const etapas  = Object.keys(ETAPA_LABEL);
  const filtrosAtivos = busca || filtroMotivo !== 'todos' || filtroEtapa !== 'todas' || from || to;

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="rounded-2xl px-6 py-4 flex items-center justify-between flex-wrap gap-3" style={{ background: '#2D2420' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-destructive/20 flex items-center justify-center">
            <Trash2 size={17} className="text-red-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Relatório de Perdas e Descartes</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>Análise de eficiência e controle de desperdício</p>
          </div>
        </div>
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
          {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Filtros */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2.5 bg-background border border-border rounded-xl px-3.5 py-2.5">
          <Search size={14} className="text-muted-foreground flex-shrink-0" />
          <input value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por produto ou nº OP..."
            className="bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground w-full" />
          {busca && <button onClick={() => setBusca('')}><X size={13} className="text-muted-foreground" /></button>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="sm:col-span-2 flex items-center gap-2">
            <Calendar size={13} className="text-muted-foreground flex-shrink-0" />
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              className="flex-1 border border-border rounded-lg px-2.5 py-1.5 text-xs bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
            <span className="text-xs text-muted-foreground">até</span>
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              className="flex-1 border border-border rounded-lg px-2.5 py-1.5 text-xs bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <select value={filtroMotivo} onChange={e => setFiltroMotivo(e.target.value)}
            className="w-full border border-border rounded-xl px-3 py-2 text-xs bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="todos">Todos os motivos</option>
            {motivos.map(m => <option key={m} value={m}>{MOTIVO_LABEL[m]}</option>)}
          </select>
          <select value={filtroEtapa} onChange={e => setFiltroEtapa(e.target.value)}
            className="w-full border border-border rounded-xl px-3 py-2 text-xs bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="todas">Todas as etapas</option>
            {etapas.map(e => <option key={e} value={e}>{ETAPA_LABEL[e]}</option>)}
          </select>
        </div>

        {filtrosAtivos && (
          <button onClick={() => { setBusca(''); setFiltroMotivo('todos'); setFiltroEtapa('todas'); setFrom(''); setTo(''); }}
            className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors">
            <X size={11} /> Limpar filtros — {filtrados.length} registro(s)
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Registros de Descarte',  value: fmtN(registros),          icon: Trash2,        color: 'bg-rainbow-red' },
          { label: 'Custo Total de Perdas',   value: fmtR(custoTotal),          icon: TrendingDown,  color: 'bg-rainbow-orange' },
          { label: 'Unidades Descartadas',    value: fmtN(totalDescartado),     icon: Package,       color: 'bg-rainbow-purple' },
          { label: 'Custo Médio / Descarte',  value: fmtR(ticketMedioPerda),    icon: AlertTriangle, color: 'bg-sun-yellow' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-card border border-border rounded-2xl p-5">
            <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center mb-3`}>
              <Icon size={16} className="text-white" />
            </div>
            <p className="text-2xl font-bold text-foreground">{loading ? '—' : value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ExportableChart title="Custo de Perdas por Motivo">
          {porMotivo.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={porMotivo} layout="vertical" barSize={16}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(35,20%,90%)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v/1000).toFixed(1)}k`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={140} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="custo" name="Custo" radius={[0, 6, 6, 0]}>
                  {porMotivo.map((m, i) => <Cell key={i} fill={m.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ExportableChart>

        <ExportableChart title="Produtos com Mais Perdas (R$)">
          {porProduto.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={porProduto} layout="vertical" barSize={16}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(35,20%,90%)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v/1000).toFixed(1)}k`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={140} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="custo" name="Custo" fill="#EF4444" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ExportableChart>
      </div>

      {porDia.length > 1 && (
        <ExportableChart title="Evolução Diária de Perdas (últimos 14 dias)">
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={porDia}>
              <defs>
                <linearGradient id="areaPerda" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(35,20%,90%)" vertical={false} />
              <XAxis dataKey="dia" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v/1000).toFixed(1)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="custo" name="Custo" stroke="#EF4444" fill="url(#areaPerda)" strokeWidth={2} dot={{ r: 3, fill: '#EF4444' }} />
            </AreaChart>
          </ResponsiveContainer>
        </ExportableChart>
      )}

      {/* Tabela */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center gap-2">
          <Trash2 size={15} className="text-muted-foreground" />
          <h3 className="font-semibold text-sm text-foreground">Histórico de Descartes</h3>
          <span className="ml-auto text-xs text-muted-foreground">{filtrados.length} registro(s)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead style={{ background: 'hsl(35,25%,93%)' }}>
              <tr>
                {['Data', 'OP', 'Produto', 'Etapa', 'Motivo', 'Qtd', 'Custo Unit.', 'Custo Total', 'Registrado por', 'Observação'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={10} className="text-center py-10 text-muted-foreground text-sm">Carregando...</td></tr>
              ) : filtrados.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-14 text-muted-foreground text-sm">
                  <Trash2 size={32} className="mx-auto mb-3 opacity-20" />
                  Nenhum descarte registrado.
                </td></tr>
              ) : filtrados.map(d => (
                <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {d.data_descarte ? new Date(d.data_descarte + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{d.ordem_producao_numero || '—'}</td>
                  <td className="px-4 py-3 text-sm font-medium text-foreground max-w-[160px] truncate">{d.produto_nome}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                      {ETAPA_LABEL[d.etapa_producao] || d.etapa_producao || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: `${MOTIVO_COLOR[d.motivo] || '#94A3B8'}20`, color: MOTIVO_COLOR[d.motivo] || '#64748B' }}>
                      {MOTIVO_LABEL[d.motivo] || d.motivo}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold text-foreground">{d.quantidade}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{d.custo_unitario ? fmtR(d.custo_unitario) : '—'}</td>
                  <td className="px-4 py-3 font-bold text-destructive">{d.custo_total ? fmtR(d.custo_total) : '—'}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-[120px]">{d.registrado_por || '—'}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px]">
                    {d.descricao ? (
                      <span title={d.descricao} className="block truncate cursor-help" style={{ maxWidth: 180 }}>{d.descricao}</span>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}