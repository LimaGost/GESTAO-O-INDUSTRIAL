import { useMemo } from 'react';
import { Tag, Users, Package, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import ExportableChart from '@/components/dashboard/ExportableChart';
import ExportButtons from '@/components/relatorios/ExportButtons';

const COLORS = ['#A855F7', '#3B82F6', '#22C55E', '#F97316', '#EC4899', '#14B8A6', '#F59E0B'];
const VALOR_OCULTO = '••••••';

function fmtR(v) { return `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`; }
function fmtRShort(v) {
  if (!v) return 'R$ 0';
  if (v >= 1000000) return `R$ ${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `R$ ${(v / 1000).toFixed(1)}k`;
  return fmtR(v);
}

function KpiCard({ label, value, sub, color = 'bg-purple-500' }) {
  return (
    <div className="bg-card border border-purple-200 rounded-2xl p-4">
      <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center mb-2`}>
        <Tag size={14} className="text-white" />
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs font-semibold text-foreground mt-0.5">{label}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

export default function TabWhiteLabelRel({ pedidos, ordens, ocultar }) {
  const { pedidosWL, ordensWL, porCliente, evolucao, stats } = useMemo(() => {
    const pedidosWL = pedidos.filter(p => p.white_label);
    const ordensWL = ordens.filter(o => o.white_label || pedidos.find(p => p.id === o.pedido_id)?.white_label);

    const clienteMap = {};
    for (const p of pedidosWL) {
      const k = p.white_label_marca || p.cliente_nome || 'Sem marca';
      if (!clienteMap[k]) clienteMap[k] = { nome: k, pedidos: 0, faturamento: 0, itens: 0 };
      clienteMap[k].pedidos += 1;
      clienteMap[k].faturamento += p.valor_total || 0;
      clienteMap[k].itens += (p.itens || []).reduce((s, i) => s + (i.quantidade || 0), 0);
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
    for (const p of pedidosWL) {
      const d = p.data_pedido || p.created_date;
      if (!d) continue;
      const dt = new Date(d);
      const k = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      if (mesesMap[k]) { mesesMap[k].pedidos += 1; mesesMap[k].faturamento += p.valor_total || 0; }
    }
    const evolucao = Object.values(mesesMap);

    const stats = {
      pedidos: pedidosWL.length,
      faturamento: pedidosWL.reduce((s, p) => s + (p.valor_total || 0), 0),
      clientes: new Set(pedidosWL.map(p => p.white_label_marca || p.cliente_nome).filter(Boolean)).size,
      qtdProduzida: ordensWL.filter(o => o.status === 'finalizado').reduce((s, o) => s + (o.quantidade || 0), 0),
    };

    return { pedidosWL, ordensWL, porCliente, evolucao, stats };
  }, [pedidos, ordens]);

  if (stats.pedidos === 0) {
    return (
      <div className="bg-card border border-purple-100 rounded-2xl p-16 text-center">
        <Tag size={40} className="text-purple-200 mx-auto mb-3" />
        <p className="text-sm font-bold text-muted-foreground">Nenhum pedido White Label no período selecionado</p>
        <p className="text-xs text-muted-foreground mt-1">Marque pedidos como White Label na tela de Pedidos para visualizá-los aqui.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Pedidos WL" value={stats.pedidos} sub="no período" color="bg-purple-500" />
        <KpiCard label="Faturamento WL" value={ocultar ? VALOR_OCULTO : fmtRShort(stats.faturamento)} sub="receita White Label" color="bg-indigo-500" />
        <KpiCard label="Clientes/Marcas WL" value={stats.clientes} sub="marcas ativas" color="bg-pink-500" />
        <KpiCard label="Unidades Produzidas" value={stats.qtdProduzida} sub="OPs finalizadas" color="bg-violet-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Por cliente */}
        <ExportableChart title="Faturamento WL por Cliente / Marca">
          {porCliente.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground/40"><p className="text-xs">Sem dados</p></div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={porCliente.slice(0, 8).map(c => ({ name: c.nome.slice(0, 18), faturamento: c.faturamento }))} layout="vertical" barSize={16}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => v >= 1000 ? `R$ ${(v/1000).toFixed(0)}k` : `R$ ${v}`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
                <Tooltip formatter={v => fmtR(v)} />
                <Bar dataKey="faturamento" name="Faturamento" radius={[0, 6, 6, 0]}>
                  {porCliente.slice(0, 8).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ExportableChart>

        {/* Evolução */}
        <ExportableChart title="Evolução Mensal — Pedidos White Label">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={evolucao} barSize={24}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} width={25} />
              <Tooltip />
              <Bar dataKey="pedidos" name="Pedidos WL" fill="#A855F7" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ExportableChart>
      </div>

      {/* Tabela de clientes WL */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-foreground">Detalhamento por Cliente / Marca</h3>
          <ExportButtons filename="white-label" title="White Label — Raio do Sol"
            columns={[
              { header: 'Cliente / Marca', key: 'nome', width: 60 },
              { header: 'Pedidos', key: 'pedidos', width: 25 },
              { header: 'Unidades', key: 'itens', width: 25 },
              { header: 'Faturamento', key: 'fat', width: 45 },
            ]}
            rows={porCliente.map(c => ({ nome: c.nome, pedidos: c.pedidos, itens: c.itens, fat: fmtR(c.faturamento) }))}
          />
        </div>
        <div className="space-y-2">
          {porCliente.map((c, i) => {
            const totalFat = porCliente.reduce((s, x) => s + x.faturamento, 0);
            const pct = totalFat > 0 ? Math.round((c.faturamento / totalFat) * 100) : 0;
            return (
              <div key={c.nome} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                      style={{ background: COLORS[i % COLORS.length] }}>
                      {i + 1}
                    </span>
                    <span className="font-medium text-foreground truncate">{c.nome}</span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                    <span className="text-muted-foreground">{c.pedidos} ped. · {c.itens} un</span>
                    <span className="font-bold text-purple-600">{ocultar ? VALOR_OCULTO : fmtR(c.faturamento)}</span>
                  </div>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}