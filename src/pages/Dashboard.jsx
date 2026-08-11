import { useEffect, useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { registrarLog } from '@/lib/audit';
import { gerarNumero, gerarLote } from '@/lib/numeracao';
import { cachedFetch, cacheInvalidateMany, cacheGet, cacheSet } from '@/lib/entityCache';
import { usePermissoes } from '@/lib/usePermissoes.jsx';
import { useAuth } from '@/lib/AuthContext';
import CentralTarefas from '@/components/dashboard/CentralTarefas';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import DashboardKpis from '@/components/dashboard/DashboardKpis';
import DashboardComercial from '@/components/dashboard/DashboardComercial';
import DashboardProducao from '@/components/dashboard/DashboardProducao';
import DashboardLogistica from '@/components/dashboard/DashboardLogistica';
import DashboardWhiteLabel from '@/components/dashboard/DashboardWhiteLabel';
import DashboardAlertas from '@/components/dashboard/DashboardAlertas';
import PeriodFilter from '@/components/dashboard/PeriodFilter';
import PullToRefresh from '@/components/PullToRefresh';

const ABAS = [
  { id: 'geral',      label: '📊 Geral' },
  { id: 'comercial',  label: '💼 Comercial' },
  { id: 'producao',   label: '🏭 Produção' },
  { id: 'logistica',  label: '🚚 Logística' },
  { id: 'whitelabel', label: '🏷️ White Label' },
];

function isInRange(dateStr, from, to) {
  if (!dateStr) return true;
  const d = new Date(dateStr);
  if (from && d < new Date(from)) return false;
  if (to) { const t = new Date(to); t.setHours(23, 59, 59); if (d > t) return false; }
  return true;
}

function getPrevRange(from, to) {
  if (!from || !to) return { from: '', to: '' };
  const f = new Date(from), t = new Date(to);
  const diff = t - f;
  const pf = new Date(f - diff);
  const pt = new Date(f);
  pt.setDate(pt.getDate() - 1);
  return { from: pf.toISOString().split('T')[0], to: pt.toISOString().split('T')[0] };
}

export default function Dashboard() {
  const { somenteLeitura, ocultarFinanceiro } = usePermissoes();
  const { user } = useAuth();
  const ocultarValores = ocultarFinanceiro('Dashboard');

  const PAPEIS_SO_TAREFAS = ['vendedor', 'vendedor_industria', 'vendedor_loja', 'estoquista', 'estoquista_industria', 'motorista', 'embalador', 'maquinista'];
  const somenteTarefas = PAPEIS_SO_TAREFAS.includes(user?.role);
  const temCentralTarefas = somenteTarefas || user?.role === 'gerente_producao';
  const escondeComercial = user?.role === 'gerente_producao'; // sem dados financeiros/vendas pro gerente de produção
  const abasVisiveis = escondeComercial ? ABAS.filter(a => ['producao', 'logistica'].includes(a.id)) : ABAS;

  const [rawData, setRawData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState({ preset: 'month', from: '', to: '' });
  const [aba, setAba] = useState('geral');
  const [criandoOP, setCriandoOP] = useState({});

  useEffect(() => { load(); }, []);

  // Resolve from/to a partir do preset se necessário
  const resolvedPeriod = useMemo(() => {
    if (period.preset === 'all') return { from: '', to: '' };
    if (period.from && period.to) return { from: period.from, to: period.to };
    const hoje = new Date();
    const fmt = (d) => d.toISOString().split('T')[0];
    if (period.preset === 'today') return { from: fmt(hoje), to: fmt(hoje) };
    if (period.preset === 'week') {
      const s = new Date(hoje); s.setDate(hoje.getDate() - 6);
      return { from: fmt(s), to: fmt(hoje) };
    }
    if (period.preset === 'month') {
      return { from: fmt(new Date(hoje.getFullYear(), hoje.getMonth(), 1)), to: fmt(hoje) };
    }
    if (period.preset === '3months') {
      const s = new Date(hoje); s.setMonth(hoje.getMonth() - 3);
      return { from: fmt(s), to: fmt(hoje) };
    }
    return { from: period.from, to: period.to };
  }, [period]);

  async function load(invalidate = false) {
    setLoading(true);
    if (invalidate) cacheInvalidateMany(['Pedido', 'OrdemProducao', 'Produto', 'Expedicao', 'Etiqueta', 'Cliente']);
    const [pedidos, ordens, produtos, expedicoes, etiquetas, clientes] = await Promise.all([
      cachedFetch('Pedido',        () => base44.entities.Pedido.list(),        60_000),
      cachedFetch('OrdemProducao', () => base44.entities.OrdemProducao.list(), 30_000),
      cachedFetch('Produto',       () => base44.entities.Produto.list(),       120_000),
      cachedFetch('Expedicao',     () => base44.entities.Expedicao.list(),     60_000),
      cachedFetch('Etiqueta',      () => base44.entities.Etiqueta.list(),      60_000),
      cachedFetch('Cliente',       () => base44.entities.Cliente.list(),       120_000),
    ]);
    setRawData({ pedidos, ordens, produtos, expedicoes, etiquetas, clientes });
    setLoading(false);
  }

  const criarOPReposicao = async (produto) => {
    const jaTemOP = (rawData?.ordens || []).some(o => o.produto_id === produto.id && o.origem === 'estoque_minimo' && o.status !== 'finalizado');
    if (jaTemOP) { alert(`⚠️ Já existe uma OP de reposição ativa para "${produto.nome}".`); return; }
    setCriandoOP(p => ({ ...p, [produto.id]: true }));
    const qtd = Math.max((produto.estoque_minimo || 10) * 2 - (produto.estoque_atual || 0), produto.estoque_minimo || 10);
    const op = await base44.entities.OrdemProducao.create({
      numero: gerarNumero('OP'), produto_id: produto.id, produto_nome: produto.nome,
      quantidade: qtd, status: 'a_produzir', origem: 'estoque_minimo', lote: gerarLote(produto.id),
    });
    registrarLog('OrdemProducao', op.id, 'CRIACAO_REPOSICAO', `OP de reposição via Dashboard — ${produto.nome} — qtd ${qtd}`).catch(() => {});
    const cachedOrdens = cacheGet('OrdemProducao');
    if (cachedOrdens) cacheSet('OrdemProducao', [...cachedOrdens, op]);
    setRawData(d => ({ ...d, ordens: [...(d.ordens || []), op] }));
    setCriandoOP(p => ({ ...p, [produto.id]: false }));
  };

  return (
    <PullToRefresh onRefresh={() => load(true)}>
    <div className="space-y-4">
      <DashboardHeader onRefresh={() => load(true)} loading={loading} />

      {temCentralTarefas && <CentralTarefas />}

      {!somenteTarefas && (
      <>
      <PeriodFilter value={period} onChange={setPeriod} />

      <DashboardKpis
        rawData={rawData}
        loading={loading}
        period={resolvedPeriod}
        ocultarValores={ocultarValores}
      />

      <DashboardAlertas
        rawData={rawData}
        loading={loading}
        onCriarOP={criarOPReposicao}
        criandoOP={criandoOP}
      />

      {/* Abas */}
      <div className="flex gap-1 overflow-x-auto pb-1 flex-nowrap">
        {ABAS.map(a => (
          <button key={a.id} onClick={() => setAba(a.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              aba === a.id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}>
            {a.label}
          </button>
        ))}
      </div>

      {aba === 'geral' && (
        <DashboardComercial rawData={rawData} loading={loading} period={resolvedPeriod} ocultarValores={ocultarValores} geral />
      )}
      {aba === 'comercial' && (
        <DashboardComercial rawData={rawData} loading={loading} period={resolvedPeriod} ocultarValores={ocultarValores} />
      )}
      {aba === 'producao' && (
        <DashboardProducao rawData={rawData} loading={loading} period={resolvedPeriod} />
      )}
      {aba === 'logistica' && (
        <DashboardLogistica rawData={rawData} loading={loading} period={resolvedPeriod} />
      )}
      {aba === 'whitelabel' && (
        <DashboardWhiteLabel rawData={rawData} loading={loading} period={resolvedPeriod} ocultarValores={ocultarValores} />
      )}
      </>
      )}
    </div>
    </PullToRefresh>
  );
}