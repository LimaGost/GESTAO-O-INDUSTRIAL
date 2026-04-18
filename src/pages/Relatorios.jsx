import { useEffect, useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  AreaChart, Area, CartesianGrid, Legend,
  PieChart, Pie
} from 'recharts';
import { FileText, TrendingUp, Package, Calendar, Factory, ShoppingCart, BarChart2, Zap } from 'lucide-react';
import ExportButtons from '@/components/relatorios/ExportButtons';
import { diffHoras, fmtHoras, fmtDateBR } from '@/lib/brasilia';
import ExportableChart from '@/components/dashboard/ExportableChart';
import CustomTooltip from '@/components/dashboard/CustomTooltip';
import PeriodFilter from '@/components/dashboard/PeriodFilter';

const COLORS = ['#F59E0B', '#3B82F6', '#22C55E', '#F97316', '#A855F7', '#EC4899', '#14B8A6'];

const TABS = [
  { key: 'semanal', label: 'Saída Semanal', icon: Calendar },
  { key: 'producao', label: 'Produção Geral', icon: Factory },
  { key: 'demanda', label: 'Produção por Pedido', icon: ShoppingCart },
  { key: 'produtividade', label: 'Produtividade', icon: Zap },
];

function fmt(v) { return v?.toLocaleString('pt-BR') ?? '—'; }
function fmtR(v) { return `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`; }

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

function EmptyState({ msg = 'Sem dados para o período selecionado.' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <BarChart2 size={32} className="mb-2 opacity-30" />
      <p className="text-sm">{msg}</p>
    </div>
  );
}

export default function Relatorios() {
  const [tab, setTab] = useState('semanal');
  const [loading, setLoading] = useState(true);
  const [ordens, setOrdens] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [period, setPeriod] = useState({ preset: 'all', from: '', to: '' });

  useEffect(() => {
    async function load() {
      const [ords, peds, prods] = await Promise.all([
        base44.entities.OrdemProducao.list('-created_date'),
        base44.entities.Pedido.list('-created_date'),
        base44.entities.Produto.list(),
      ]);
      setOrdens(ords); setPedidos(peds); setProdutos(prods); setLoading(false);
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
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rainbow-indigo/10 flex items-center justify-center">
              <BarChart2 size={19} className="text-rainbow-indigo" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Relatórios Operacionais</h2>
              <p className="text-xs text-muted-foreground">Análises de produção, expedição e demanda</p>
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
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-48 animate-pulse bg-muted rounded-2xl" />)}
        </div>
      ) : (
        <>
          {tab === 'semanal' && <RelatorioSemanal pedidos={filteredPedidos} />}
          {tab === 'producao' && <RelatorioProducaoGeral ordens={filteredOrdens} />}
          {tab === 'demanda' && <RelatorioDemanda ordens={filteredOrdens} pedidos={filteredPedidos} />}
          {tab === 'produtividade' && <RelatorioProdutividade ordens={filteredOrdens} produtos={produtos} />}
        </>
      )}
    </div>
  );
}

/* ─── 1. RELATÓRIO SEMANAL ─────────────────────────────────────────────────── */
function RelatorioSemanal({ pedidos }) {
  const expedidos = pedidos.filter(p => p.status === 'expedido' && p.data_pedido);
  const semanas = {};
  for (const ped of expedidos) {
    const wk = weekLabel(ped.data_pedido);
    if (!semanas[wk]) semanas[wk] = { semana: wk, valor: 0, pedidos: 0 };
    semanas[wk].valor += ped.valor_total || 0;
    semanas[wk].pedidos += 1;
  }
  const semanasList = Object.values(semanas).slice(-8);

  const prodSaida = {};
  for (const ped of expedidos) for (const item of ped.itens || [])
    prodSaida[item.produto_nome] = (prodSaida[item.produto_nome] || 0) + (item.quantidade || 0);

  const topProdutos = Object.entries(prodSaida).sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([name, qtd]) => ({ name: name.length > 20 ? name.slice(0, 20) + '…' : name, qtd }));

  const totalValor = expedidos.reduce((s, p) => s + (p.valor_total || 0), 0);
  const totalItens = Object.values(prodSaida).reduce((s, v) => s + v, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs text-muted-foreground">Faturamento Expedido</p>
          <p className="text-2xl font-bold text-foreground">{fmtR(totalValor)}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs text-muted-foreground">Unidades Expedidas</p>
          <p className="text-2xl font-bold text-foreground">{fmt(totalItens)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ExportableChart title="Faturamento por Semana">
          {semanasList.length === 0 ? <EmptyState /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={semanasList} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="semana" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={v => fmtR(v)} />
                <Bar dataKey="valor" name="Faturamento" fill="#F59E0B" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ExportableChart>

        <ExportableChart title="Top Produtos Expedidos">
          {topProdutos.length === 0 ? <EmptyState /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topProdutos} layout="vertical" barSize={14}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
                <Tooltip />
                <Bar dataKey="qtd" name="Qtd" fill="#3B82F6" radius={[0, 6, 6, 0]}>
                  {topProdutos.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ExportableChart>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">Detalhamento Semanal</h3>
          <ExportButtons
            filename="saida-semanal"
            title="Relatório de Saída Semanal — Raio do Sol"
            columns={[
              { header: 'Semana', key: 'semana', width: 50 },
              { header: 'Pedidos', key: 'pedidos', width: 30 },
              { header: 'Faturamento (R$)', key: 'valorFmt', width: 50 },
            ]}
            rows={semanasList.map(s => ({ ...s, valorFmt: s.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }))}
          />
        </div>
        {semanasList.length === 0 ? <EmptyState /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border">
                {['Semana', 'Pedidos', 'Faturamento'].map(h => (
                  <th key={h} className="text-left py-2 pr-4 text-xs text-muted-foreground font-semibold">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {semanasList.map((s, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-2 pr-4 text-foreground">{s.semana}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{s.pedidos}</td>
                    <td className="py-2 pr-4 font-semibold text-foreground">{fmtR(s.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── 2. PRODUÇÃO GERAL ────────────────────────────────────────────────────── */
function RelatorioProducaoGeral({ ordens }) {
  const finalizadas = ordens.filter(o => o.status === 'finalizado');
  const totalProduzido = finalizadas.reduce((s, o) =>
    s + (o.itens?.length > 0 ? o.itens.reduce((a, i) => a + (i.quantidade || 0), 0) : (o.quantidade || 0)), 0);

  const horasPorOP = ordens.map(o => {
    const hProd = diffHoras(o.data_inicio, o.data_fim_producao);
    const hEmb = diffHoras(o.data_embalagem, o.data_finalizacao);
    const hTotal = (hProd ?? 0) + (hEmb ?? 0) || null;
    return {
      nome: o.produto_nome ? (o.produto_nome.length > 22 ? o.produto_nome.slice(0, 22) + '…' : o.produto_nome) : `OP ${o.numero}`,
      numero: o.numero, hProd, hEmb, hTotal, status: o.status,
    };
  }).filter(o => o.hTotal !== null).sort((a, b) => (b.hTotal ?? 0) - (a.hTotal ?? 0));

  const chartHoras = horasPorOP.slice(0, 10).map(o => ({
    name: o.nome,
    'Produção': parseFloat((o.hProd ?? 0).toFixed(2)),
    'Embalagem': parseFloat((o.hEmb ?? 0).toFixed(2)),
  }));

  const mediaProd = horasPorOP.filter(o => o.hProd).reduce((s, o, _, a) => s + o.hProd / a.length, 0) || null;
  const mediaEmb = horasPorOP.filter(o => o.hEmb).reduce((s, o, _, a) => s + o.hEmb / a.length, 0) || null;

  const porProduto = {};
  for (const o of finalizadas) {
    const itens = o.itens?.length > 0 ? o.itens : (o.produto_nome ? [{ produto_nome: o.produto_nome, quantidade: o.quantidade || 0 }] : []);
    for (const item of itens) { porProduto[item.produto_nome || 'Sem nome'] = (porProduto[item.produto_nome || 'Sem nome'] || 0) + (item.quantidade || 0); }
  }
  const chartPorProduto = Object.entries(porProduto).sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([name, qtd]) => ({ name: name.length > 20 ? name.slice(0, 20) + '…' : name, qtd }));

  const statusData = [
    { name: 'A Produzir', value: ordens.filter(o => o.status === 'a_produzir').length, color: '#94A3B8' },
    { name: 'Em Produção', value: ordens.filter(o => o.status === 'em_producao').length, color: '#3B82F6' },
    { name: 'Produzido', value: ordens.filter(o => o.status === 'produzido').length, color: '#22C55E' },
    { name: 'Embalagem', value: ordens.filter(o => o.status === 'em_embalagem').length, color: '#F59E0B' },
    { name: 'Finalizado', value: ordens.filter(o => o.status === 'finalizado').length, color: '#A855F7' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs text-muted-foreground">OPs Finalizadas</p>
          <p className="text-2xl font-bold text-foreground">{finalizadas.length}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs text-muted-foreground">Unidades Produzidas</p>
          <p className="text-2xl font-bold text-foreground">{fmt(totalProduzido)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {chartHoras.length > 0 && (
          <ExportableChart title="Horas por OP (Produção + Embalagem)">
            <div className="flex gap-4 text-xs text-muted-foreground mb-2">
              <span>Média Produção: <strong className="text-foreground">{fmtHoras(mediaProd)}</strong></span>
              <span>Média Embalagem: <strong className="text-foreground">{fmtHoras(mediaEmb)}</strong></span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartHoras} layout="vertical" barSize={10}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `${v}h`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={120} />
                <Tooltip formatter={([v, name]) => [`${v}h`, name]} />
                <Legend />
                <Bar dataKey="Produção" fill="#3B82F6" radius={[0, 4, 4, 0]} stackId="a" />
                <Bar dataKey="Embalagem" fill="#F59E0B" radius={[0, 4, 4, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </ExportableChart>
        )}

        <ExportableChart title="OPs por Status">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => value > 0 ? `${name}: ${value}` : ''} labelLine={false}>
                {statusData.map((s, i) => <Cell key={i} fill={s.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ExportableChart>

        <ExportableChart title="Produção por Produto (finalizadas)">
          {chartPorProduto.length === 0 ? <EmptyState /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartPorProduto} layout="vertical" barSize={14}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
                <Tooltip />
                <Bar dataKey="qtd" name="Qtd" radius={[0, 6, 6, 0]}>
                  {chartPorProduto.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ExportableChart>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">Histórico de Ordens de Produção</h3>
          <ExportButtons
            filename="ordens-producao"
            title="Histórico de OPs — Raio do Sol"
            columns={[
              { header: 'Nº OP', key: 'numero', width: 25 },
              { header: 'Produto / Pedido', key: 'prodNome', width: 70 },
              { header: 'Origem', key: 'origemLabel', width: 30 },
              { header: 'Qtd', key: 'qtd', width: 20 },
              { header: 'Status', key: 'statusLabel', width: 35 },
              { header: 'Lote', key: 'lote', width: 30 },
            ]}
            rows={ordens.map(o => ({
              numero: o.numero,
              prodNome: o.produto_nome || `Pedido ${o.pedido_numero}`,
              origemLabel: o.origem === 'pedido' ? 'Pedido' : o.origem === 'estoque_minimo' ? 'Reposição' : 'Manual',
              qtd: o.itens?.length > 0 ? o.itens.reduce((s, i) => s + (i.quantidade || 0), 0) : (o.quantidade || 0),
              statusLabel: { a_produzir: 'A Produzir', em_producao: 'Em Produção', produzido: 'Produzido', em_embalagem: 'Embalagem', finalizado: 'Finalizado' }[o.status] || o.status,
              lote: o.lote || '—',
            }))}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border">
              {['Nº OP', 'Produto / Pedido', 'Origem', 'Qtd', 'Status', 'Lote'].map(h => (
                <th key={h} className="text-left py-2 pr-4 text-xs text-muted-foreground font-semibold">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {ordens.slice(0, 30).map(o => {
                const qtd = o.itens?.length > 0 ? o.itens.reduce((s, i) => s + (i.quantidade || 0), 0) : (o.quantidade || 0);
                const STATUS_COLORS = { a_produzir: 'bg-slate-100 text-slate-600', em_producao: 'bg-sky-100 text-sky-700', produzido: 'bg-green-100 text-green-700', em_embalagem: 'bg-amber-100 text-amber-700', finalizado: 'bg-purple-100 text-purple-700' };
                return (
                  <tr key={o.id} className="border-b border-border/50">
                    <td className="py-2 pr-4 font-mono text-xs text-foreground">{o.numero}</td>
                    <td className="py-2 pr-4 text-foreground">{o.produto_nome || `Pedido ${o.pedido_numero}`}</td>
                    <td className="py-2 pr-4 text-muted-foreground text-xs">{o.origem === 'pedido' ? 'Pedido' : o.origem === 'estoque_minimo' ? 'Reposição' : 'Manual'}</td>
                    <td className="py-2 pr-4 font-semibold text-foreground">{qtd}</td>
                    <td className="py-2 pr-4">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[o.status] || 'bg-muted text-muted-foreground'}`}>
                        {{ a_produzir: 'A Produzir', em_producao: 'Em Produção', produzido: 'Produzido', em_embalagem: 'Embalagem', finalizado: 'Finalizado' }[o.status] || o.status}
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

/* ─── 3. DEMANDA ───────────────────────────────────────────────────────────── */
function RelatorioDemanda({ ordens, pedidos }) {
  const opsDemanda = ordens.filter(o => o.origem === 'pedido');
  const opsReposicao = ordens.filter(o => o.origem === 'estoque_minimo');
  const opsManual = ordens.filter(o => o.origem === 'manual');
  const totalDemanda = opsDemanda.reduce((s, o) =>
    s + (o.itens?.length > 0 ? o.itens.reduce((a, i) => a + (i.quantidade || 0), 0) : (o.quantidade || 0)), 0);

  const origemData = [
    { name: 'Sob Demanda', value: opsDemanda.length, color: '#3B82F6' },
    { name: 'Reposição', value: opsReposicao.length, color: '#F97316' },
    { name: 'Manual', value: opsManual.length, color: '#94A3B8' },
  ].filter(o => o.value > 0);

  const demandaPorProduto = {};
  for (const o of opsDemanda) {
    const itens = o.itens?.length > 0 ? o.itens : (o.produto_nome ? [{ produto_nome: o.produto_nome, quantidade: o.quantidade || 0 }] : []);
    for (const item of itens) {
      const k = item.produto_nome || 'Sem nome';
      demandaPorProduto[k] = (demandaPorProduto[k] || 0) + (item.quantidade || 0);
    }
  }
  const chartDemanda = Object.entries(demandaPorProduto).sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([name, qtd]) => ({ name: name.length > 22 ? name.slice(0, 22) + '…' : name, qtd }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs text-muted-foreground">OPs por Demanda</p>
          <p className="text-2xl font-bold text-sky-blue">{opsDemanda.length}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs text-muted-foreground">OPs Reposição</p>
          <p className="text-2xl font-bold text-rainbow-orange">{opsReposicao.length}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs text-muted-foreground">Unidades por Demanda</p>
          <p className="text-2xl font-bold text-foreground">{fmt(totalDemanda)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ExportableChart title="Distribuição de OPs por Origem">
          {origemData.length === 0 ? <EmptyState /> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={origemData} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                  {origemData.map((s, i) => <Cell key={i} fill={s.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ExportableChart>

        <ExportableChart title="Demanda por Produto (sob pedido)">
          {chartDemanda.length === 0 ? <EmptyState /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartDemanda} layout="vertical" barSize={14}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={130} />
                <Tooltip />
                <Bar dataKey="qtd" name="Qtd" fill="#3B82F6" radius={[0, 6, 6, 0]}>
                  {chartDemanda.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ExportableChart>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">OPs por Demanda</h3>
          <ExportButtons
            filename="ops-demanda"
            title="OPs por Demanda — Raio do Sol"
            columns={[
              { header: 'Nº OP', key: 'numero', width: 25 },
              { header: 'Produto', key: 'produto_nome', width: 70 },
              { header: 'Qtd', key: 'qtd', width: 20 },
              { header: 'Pedido', key: 'pedido_numero', width: 30 },
            ]}
            rows={opsDemanda.map(o => ({
              numero: o.numero,
              produto_nome: o.produto_nome || '—',
              qtd: o.itens?.length > 0 ? o.itens.reduce((s, i) => s + (i.quantidade || 0), 0) : (o.quantidade || 0),
              pedido_numero: o.pedido_numero || '—',
            }))}
          />
        </div>
        {opsDemanda.length === 0 ? <EmptyState msg="Nenhuma OP por demanda no período." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border">
                {['Nº OP', 'Produto', 'Qtd', 'Pedido', 'Status'].map(h => (
                  <th key={h} className="text-left py-2 pr-4 text-xs text-muted-foreground font-semibold">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {opsDemanda.slice(0, 20).map(o => {
                  const qtd = o.itens?.length > 0 ? o.itens.reduce((s, i) => s + (i.quantidade || 0), 0) : (o.quantidade || 0);
                  return (
                    <tr key={o.id} className="border-b border-border/50">
                      <td className="py-2 pr-4 font-mono text-xs">{o.numero}</td>
                      <td className="py-2 pr-4 text-foreground">{o.produto_nome || '—'}</td>
                      <td className="py-2 pr-4 font-semibold">{qtd}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{o.pedido_numero || '—'}</td>
                      <td className="py-2 pr-4 text-xs text-muted-foreground capitalize">{o.status?.replace(/_/g, ' ')}</td>
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

/* ─── 4. PRODUTIVIDADE ──────────────────────────────────────────────────────── */
function RelatorioProdutividade({ ordens, produtos }) {
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

  const unidPorHora = (mediaHorasProd && totalUnidades > 0) ? (totalUnidades / (finalizadas.length * (mediaHorasProd || 1))).toFixed(1) : '—';

  const produtosAlerta = produtos.filter(p => (p.estoque_atual || 0) <= (p.estoque_minimo || 0));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs text-muted-foreground">OPs Finalizadas</p>
          <p className="text-2xl font-bold text-foreground">{finalizadas.length}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs text-muted-foreground">Média Produção</p>
          <p className="text-2xl font-bold text-foreground">{fmtHoras(mediaHorasProd)}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs text-muted-foreground">Média Embalagem</p>
          <p className="text-2xl font-bold text-foreground">{fmtHoras(mediaHorasEmb)}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs text-muted-foreground">Produtos em Alerta</p>
          <p className={`text-2xl font-bold ${produtosAlerta.length > 0 ? 'text-rainbow-red' : 'text-rainbow-green'}`}>{produtosAlerta.length}</p>
        </div>
      </div>

      {produtosAlerta.length > 0 && (
        <div className="bg-card border border-rainbow-red/20 rounded-2xl p-5">
          <h3 className="font-semibold text-foreground mb-3">Produtos Abaixo do Mínimo</h3>
          <div className="space-y-2">
            {produtosAlerta.map(p => {
              const pct = p.estoque_minimo > 0 ? Math.min(100, Math.round(((p.estoque_atual || 0) / p.estoque_minimo) * 100)) : 0;
              return (
                <div key={p.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-foreground truncate">{p.nome}</p>
                      <p className="text-xs text-muted-foreground ml-2 flex-shrink-0">{p.estoque_atual || 0} / {p.estoque_minimo} un</p>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-rainbow-red" style={{ width: `${pct}%` }} />
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
          <h3 className="font-semibold text-foreground">Resumo de Produtividade</h3>
          <ExportButtons
            filename="produtividade"
            title="Relatório de Produtividade — Raio do Sol"
            columns={[
              { header: 'Produto', key: 'nome', width: 60 },
              { header: 'Estoque Atual', key: 'estoque_atual', width: 35 },
              { header: 'Estoque Mínimo', key: 'estoque_minimo', width: 35 },
              { header: 'Situação', key: 'situacao', width: 35 },
            ]}
            rows={produtos.map(p => ({
              nome: p.nome,
              estoque_atual: p.estoque_atual || 0,
              estoque_minimo: p.estoque_minimo || 0,
              situacao: (p.estoque_atual || 0) <= (p.estoque_minimo || 0) ? 'Abaixo do mínimo' : 'OK',
            }))}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div className="bg-muted/30 rounded-xl p-4">
            <p className="text-xs text-muted-foreground">Unidades Produzidas</p>
            <p className="text-3xl font-bold text-foreground">{fmt(totalUnidades)}</p>
          </div>
          <div className="bg-muted/30 rounded-xl p-4">
            <p className="text-xs text-muted-foreground">Média h/OP Produção</p>
            <p className="text-3xl font-bold text-foreground">{fmtHoras(mediaHorasProd)}</p>
          </div>
          <div className="bg-muted/30 rounded-xl p-4">
            <p className="text-xs text-muted-foreground">Média h/OP Embalagem</p>
            <p className="text-3xl font-bold text-foreground">{fmtHoras(mediaHorasEmb)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}