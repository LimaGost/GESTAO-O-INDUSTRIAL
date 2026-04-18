import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { BarChart2, TrendingUp, Package, ShoppingCart } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import ExportButtons from '@/components/ExportButtons';

export default function Relatorios() {
  const [pedidos, setPedidos] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [ordens, setOrdens] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Pedido.list(),
      base44.entities.Produto.list(),
      base44.entities.OrdemProducao.list(),
    ]).then(([p, pr, o]) => {
      setPedidos(p);
      setProdutos(pr);
      setOrdens(o);
      setLoading(false);
    });
  }, []);

  const faturamentoTotal = pedidos.filter(p => p.status === 'expedido').reduce((s, p) => s + (p.valor_total || 0), 0);
  const pedidosAtivos = pedidos.filter(p => !['expedido','cancelado'].includes(p.status)).length;
  const ordensFinalizadas = ordens.filter(o => o.status === 'finalizado').length;
  const alertasEstoque = produtos.filter(p => (p.estoque_atual || 0) <= (p.estoque_minimo || 0)).length;

  const top5 = [...produtos].sort((a, b) => (b.estoque_atual || 0) - (a.estoque_atual || 0)).slice(0, 5)
    .map(p => ({ name: p.nome.length > 15 ? p.nome.slice(0, 15) + '…' : p.nome, estoque: p.estoque_atual || 0 }));

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center">
          <BarChart2 size={19} className="text-indigo-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Relatórios</h2>
          <p className="text-xs text-muted-foreground">Visão geral do sistema</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Faturamento Expedido', value: `R$ ${faturamentoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: TrendingUp, color: 'bg-green-100 text-green-600' },
          { label: 'Pedidos Ativos', value: pedidosAtivos, icon: ShoppingCart, color: 'bg-blue-100 text-blue-600' },
          { label: 'OPs Finalizadas', value: ordensFinalizadas, icon: Package, color: 'bg-amber-100 text-amber-600' },
          { label: 'Alertas Estoque', value: alertasEstoque, icon: BarChart2, color: 'bg-red-100 text-red-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-card border border-border rounded-2xl p-5">
            <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
              <Icon size={18} />
            </div>
            <p className="text-2xl font-bold text-foreground">{loading ? '—' : value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Exportar Pedidos */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">Pedidos</h3>
          <ExportButtons
            filename="pedidos"
            title="Relatório de Pedidos — Raio do Sol"
            columns={[
              { header: 'Número', key: 'numero', width: 30 },
              { header: 'Cliente', key: 'cliente_nome', width: 60 },
              { header: 'Status', key: 'status', width: 35 },
              { header: 'Data', key: 'data_pedido', width: 30 },
              { header: 'Entrega Prevista', key: 'data_entrega_prevista', width: 35 },
              { header: 'Total (R$)', key: 'valor_total_fmt', width: 30 },
            ]}
            rows={pedidos.map(p => ({
              ...p,
              valor_total_fmt: (p.valor_total || 0).toFixed(2),
              data_entrega_prevista: p.data_entrega_prevista || '—',
            }))}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                {['Número', 'Cliente', 'Status', 'Data', 'Total'].map(h => (
                  <th key={h} className="text-left py-2 pr-4 text-muted-foreground font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pedidos.slice(0, 10).map(p => (
                <tr key={p.id} className="border-b border-border/50">
                  <td className="py-2 pr-4 font-medium text-foreground">{p.numero}</td>
                  <td className="py-2 pr-4 text-foreground">{p.cliente_nome}</td>
                  <td className="py-2 pr-4 text-muted-foreground capitalize">{p.status?.replace(/_/g, ' ')}</td>
                  <td className="py-2 pr-4 text-muted-foreground">{p.data_pedido}</td>
                  <td className="py-2 pr-4 font-semibold text-foreground">R$ {(p.valor_total || 0).toFixed(2)}</td>
                </tr>
              ))}
              {pedidos.length === 0 && !loading && (
                <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">Nenhum pedido.</td></tr>
              )}
            </tbody>
          </table>
          {pedidos.length > 10 && <p className="text-xs text-muted-foreground mt-2">Mostrando 10 de {pedidos.length}. Exporte para ver todos.</p>}
        </div>
      </div>

      {/* Exportar Produtos / Estoque */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">Estoque de Produtos</h3>
          <ExportButtons
            filename="estoque"
            title="Relatório de Estoque — Raio do Sol"
            columns={[
              { header: 'Produto', key: 'nome', width: 80 },
              { header: 'Categoria', key: 'categoria', width: 50 },
              { header: 'Estoque Atual', key: 'estoque_atual', width: 35 },
              { header: 'Estoque Mínimo', key: 'estoque_minimo', width: 35 },
              { header: 'Preço (R$)', key: 'preco_fmt', width: 30 },
              { header: 'Situação', key: 'situacao', width: 35 },
            ]}
            rows={produtos.map(p => ({
              ...p,
              preco_fmt: (p.preco || 0).toFixed(2),
              situacao: (p.estoque_atual || 0) <= (p.estoque_minimo || 0) ? 'Abaixo do mínimo' : 'OK',
            }))}
          />
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="font-semibold text-foreground mb-4">Top 5 Produtos em Estoque</h3>
        {loading ? (
          <div className="h-40 animate-pulse bg-muted rounded-xl" />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={top5} layout="vertical" barSize={16}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={110} />
              <Tooltip />
              <Bar dataKey="estoque" name="Estoque" fill="#F59E0B" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}