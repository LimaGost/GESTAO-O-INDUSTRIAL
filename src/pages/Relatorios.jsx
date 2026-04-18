import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { BarChart2, TrendingUp, Package, ShoppingCart } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

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