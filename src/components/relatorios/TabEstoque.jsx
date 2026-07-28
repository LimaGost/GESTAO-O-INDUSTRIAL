import { useMemo, useState } from 'react';
import { Package, AlertTriangle, Search } from 'lucide-react';
import ExportButtons from '@/components/relatorios/ExportButtons';
import FiltroCategorias from '@/components/common/FiltroCategorias';
import TabelaEstoquePlanilha from '@/components/relatorios/TabelaEstoquePlanilha';
import ExportableChart from '@/components/dashboard/ExportableChart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const COLORS = ['#F59E0B', '#3B82F6', '#EF4444', '#22C55E', '#A855F7', '#F97316', '#14B8A6', '#64748B'];
const fmtR = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

function KpiCard({ label, value, sub, color = 'bg-primary', icon: Icon }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-2">
      <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center`}>
        <Icon size={16} className="text-white" />
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export default function TabEstoque({ produtos: produtosTodos }) {
  const [busca, setBusca] = useState('');
  const [subTab, setSubTab] = useState('planilha');
  const [ordenar, setOrdenar] = useState('nome');
  const [filtroCategoria, setFiltroCategoria] = useState('todas');

  const categorias = useMemo(
    () => [...new Set(produtosTodos.map(p => p.categoria).filter(Boolean))].sort(),
    [produtosTodos]
  );
  const produtos = useMemo(
    () => filtroCategoria === 'todas' ? produtosTodos : produtosTodos.filter(p => p.categoria === filtroCategoria),
    [produtosTodos, filtroCategoria]
  );

  const criticos = produtos.filter(p => (p.estoque_atual || 0) <= (p.estoque_minimo || 0) && p.ativo !== false);
  const zerados = produtos.filter(p => (p.estoque_atual || 0) === 0 && p.ativo !== false);
  const semMovimento = produtos.filter(p => !p.estoque_atual && !p.estoque_minimo && p.ativo !== false);
  const valorTotalEstoque = produtos.reduce((s, p) => s + (p.estoque_atual || 0) * (p.preco_custo || p.preco_unitario || 0), 0);

  const produtosFiltrados = useMemo(() => {
    let list = [...produtos.filter(p => p.ativo !== false)];
    if (busca) {
      const b = busca.toLowerCase();
      list = list.filter(p => p.nome?.toLowerCase().includes(b) || p.codigo?.toLowerCase().includes(b) || p.categoria?.toLowerCase().includes(b));
    }
    list.sort((a, b) => {
      if (ordenar === 'estoque_asc') return (a.estoque_atual || 0) - (b.estoque_atual || 0);
      if (ordenar === 'estoque_desc') return (b.estoque_atual || 0) - (a.estoque_atual || 0);
      if (ordenar === 'valor') return ((b.estoque_atual || 0) * (b.preco_custo || 0)) - ((a.estoque_atual || 0) * (a.preco_custo || 0));
      return (a.nome || '').localeCompare(b.nome || '');
    });
    return list;
  }, [produtos, busca, ordenar]);

  // Top 10 por valor em estoque
  const topValor = useMemo(() =>
    [...produtos].sort((a, b) => ((b.estoque_atual || 0) * (b.preco_custo || 0)) - ((a.estoque_atual || 0) * (a.preco_custo || 0))).slice(0, 10)
      .map(p => ({ name: p.nome?.slice(0, 20) || '—', valor: (p.estoque_atual || 0) * (p.preco_custo || 0) })),
    [produtos]
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total de Produtos" value={produtos.filter(p => p.ativo !== false).length} icon={Package} color="bg-sky-500" />
        <KpiCard label="Valor em Estoque" value={`R$ ${(valorTotalEstoque / 1000).toFixed(1)}k`} sub="custo total" icon={Package} color="bg-green-500" />
        <KpiCard label="Estoque Crítico" value={criticos.length} sub="abaixo do mínimo" icon={AlertTriangle} color={criticos.length > 0 ? 'bg-red-500' : 'bg-green-500'} />
        <KpiCard label="Sem Estoque" value={zerados.length} sub="estoque zerado" icon={AlertTriangle} color={zerados.length > 0 ? 'bg-orange-500' : 'bg-green-500'} />
      </div>

      <div className="bg-card border border-border rounded-2xl p-4">
        <FiltroCategorias categorias={categorias} valor={filtroCategoria} onChange={setFiltroCategoria} />
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { k: 'planilha', l: '📋 Planilha Completa' },
          { k: 'criticos', l: `⚠️ Críticos (${criticos.length})` },
          { k: 'grafico', l: '📊 Gráfico por Valor' },
        ].map(s => (
          <button key={s.k} onClick={() => setSubTab(s.k)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${subTab === s.k ? 'bg-primary text-primary-foreground shadow' : 'bg-card border border-border text-muted-foreground hover:bg-muted'}`}>
            {s.l}
          </button>
        ))}
      </div>

      {subTab === 'planilha' && <TabelaEstoquePlanilha produtos={produtos} />}

      {subTab === 'grafico' && (
        <ExportableChart title="Top 10 Produtos por Valor em Estoque">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={topValor} layout="vertical" barSize={16}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => v >= 1000 ? `R$ ${(v/1000).toFixed(0)}k` : `R$ ${v}`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={140} />
              <Tooltip formatter={v => fmtR(v)} />
              <Bar dataKey="valor" name="Valor" radius={[0, 6, 6, 0]}>
                {topValor.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ExportableChart>
      )}

      {subTab === 'criticos' && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="font-bold text-foreground">Produtos com Estoque Crítico</h3>
            <ExportButtons filename="estoque-critico" title="Estoque Crítico — Raio do Sol"
              columns={[
                { header: 'Produto', key: 'nome', width: 60 },
                { header: 'Código', key: 'codigo', width: 25 },
                { header: 'Estoque Atual', key: 'atual', width: 30 },
                { header: 'Estoque Mínimo', key: 'minimo', width: 30 },
                { header: 'Estoque Máximo', key: 'maximo', width: 30 },
                { header: 'Situação', key: 'situacao', width: 30 },
              ]}
              rows={criticos.map(p => ({
                nome: p.nome, codigo: p.codigo || '—',
                atual: p.estoque_atual || 0, minimo: p.estoque_minimo || 0, maximo: p.estoque_maximo || 0,
                situacao: (p.estoque_atual || 0) === 0 ? 'Zerado' : 'Abaixo do mínimo',
              }))}
            />
          </div>

          <div className="relative mb-3">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar produto..."
              className="w-full border border-border rounded-xl pl-8 pr-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>

          {criticos.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-muted-foreground">
              <Package size={32} className="mb-2 opacity-20" />
              <p className="text-sm">Nenhum produto crítico — estoque saudável!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border">
                  {['Produto', 'Código', 'Categoria', 'Atual', 'Mínimo', 'Máximo', 'Situação'].map(h => (
                    <th key={h} className="text-left py-2 pr-4 text-xs text-muted-foreground font-semibold">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {criticos.filter(p => !busca || p.nome?.toLowerCase().includes(busca.toLowerCase())).map(p => {
                    const zerado = (p.estoque_atual || 0) === 0;
                    const pct = p.estoque_minimo > 0 ? Math.min(100, Math.round(((p.estoque_atual || 0) / p.estoque_minimo) * 100)) : 0;
                    return (
                      <tr key={p.id} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="py-2 pr-4 font-medium text-foreground">{p.nome}</td>
                        <td className="py-2 pr-4 font-mono text-xs text-muted-foreground">{p.codigo || '—'}</td>
                        <td className="py-2 pr-4 text-xs text-muted-foreground">{p.categoria || '—'}</td>
                        <td className="py-2 pr-4 font-bold text-foreground">{p.estoque_atual || 0}</td>
                        <td className="py-2 pr-4 text-muted-foreground">{p.estoque_minimo || 0}</td>
                        <td className="py-2 pr-4 text-muted-foreground">{p.estoque_maximo || 0}</td>
                        <td className="py-2 pr-4">
                          <div className="flex items-center gap-2">
                            <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: zerado ? '#EF4444' : '#F97316' }} />
                            </div>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${zerado ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                              {zerado ? 'Zerado' : 'Crítico'}
                            </span>
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
      )}
    </div>
  );
}