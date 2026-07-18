import { ShoppingCart, Factory, ClipboardCheck, Truck, CheckCircle, AlertTriangle, DollarSign, Package } from 'lucide-react';

function fmtR(v) {
  return `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

export default function DiretorKpis({ pedidos, ops }) {
  const hoje = new Date().toISOString().split('T')[0];
  const mesAtual = hoje.slice(0, 7);

  const pedidosValidos = pedidos.filter(p => p.status !== 'cancelado');
  const emAberto = pedidosValidos.filter(p => ['rascunho', 'aguardando_estoque'].includes(p.status)).length;
  const emSeparacao = pedidosValidos.filter(p => ['separacao', 'separado'].includes(p.status)).length;
  const emExpedicao = pedidosValidos.filter(p => p.status === 'expedido').length;
  const entregues = pedidosValidos.filter(p => p.status === 'entregue').length;
  const atrasados = pedidosValidos.filter(p =>
    p.data_entrega_prevista && p.data_entrega_prevista < hoje && !['entregue'].includes(p.status)).length;

  const opsAndamento = ops.filter(o => !['finalizado', 'producao_finalizada'].includes(o.status));
  const pedidosAtrasadosIds = new Set(pedidosValidos
    .filter(p => p.data_entrega_prevista && p.data_entrega_prevista < hoje && p.status !== 'entregue')
    .map(p => p.id));
  const opsAtrasadas = opsAndamento.filter(o => o.pedido_id && pedidosAtrasadosIds.has(o.pedido_id)).length;
  const emProducao = new Set(opsAndamento.map(o => o.pedido_id).filter(Boolean)).size;

  const fatDia = pedidosValidos.filter(p => p.data_pedido === hoje).reduce((s, p) => s + (p.valor_total || 0), 0);
  const fatMes = pedidosValidos.filter(p => (p.data_pedido || '').startsWith(mesAtual)).reduce((s, p) => s + (p.valor_total || 0), 0);

  const opsFinalizadas = ops.filter(o => ['finalizado', 'producao_finalizada'].includes(o.status));
  const qtdOp = (o) => o.itens?.length > 0 ? o.itens.reduce((s, i) => s + (i.quantidade || 0), 0) : (o.quantidade || 0);
  const prodDia = opsFinalizadas.filter(o => (o.data_finalizacao || o.data_fim_producao || '').startsWith(hoje)).reduce((s, o) => s + qtdOp(o), 0);
  const prodMes = opsFinalizadas.filter(o => (o.data_finalizacao || o.data_fim_producao || '').startsWith(mesAtual)).reduce((s, o) => s + qtdOp(o), 0);

  const kpis = [
    { label: 'Pedidos em Aberto', value: emAberto, icon: ShoppingCart, cor: 'text-sky-blue', bg: 'bg-sky-blue/10' },
    { label: 'Em Produção', value: emProducao, icon: Factory, cor: 'text-rainbow-purple', bg: 'bg-rainbow-purple/10' },
    { label: 'Em Separação', value: emSeparacao, icon: ClipboardCheck, cor: 'text-rainbow-orange', bg: 'bg-rainbow-orange/10' },
    { label: 'Em Expedição', value: emExpedicao, icon: Truck, cor: 'text-rainbow-indigo', bg: 'bg-rainbow-indigo/10' },
    { label: 'Entregues', value: entregues, icon: CheckCircle, cor: 'text-rainbow-green', bg: 'bg-rainbow-green/10' },
    { label: 'Pedidos Atrasados', value: atrasados, icon: AlertTriangle, cor: 'text-rainbow-red', bg: 'bg-rainbow-red/10' },
    { label: 'OPs em Andamento', value: opsAndamento.length, icon: Factory, cor: 'text-teal-dark', bg: 'bg-teal-dark/10' },
    { label: 'OPs Atrasadas', value: opsAtrasadas, icon: AlertTriangle, cor: 'text-rainbow-red', bg: 'bg-rainbow-red/10' },
  ];

  const financeiros = [
    { label: 'Faturamento do Dia', value: fmtR(fatDia), icon: DollarSign },
    { label: 'Faturamento do Mês', value: fmtR(fatMes), icon: DollarSign },
    { label: 'Produção do Dia', value: `${prodDia.toLocaleString('pt-BR')} un`, icon: Package },
    { label: 'Produção do Mês', value: `${prodMes.toLocaleString('pt-BR')} un`, icon: Package },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {financeiros.map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-teal-dark rounded-2xl p-4 flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <Icon size={14} className="text-sun-gold" />
              <p className="text-[11px] font-semibold text-white/60">{label}</p>
            </div>
            <p className="text-xl font-bold text-white truncate">{value}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map(({ label, value, icon: Icon, cor, bg }) => (
          <div key={label} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
              <Icon size={16} className={cor} />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold text-foreground leading-tight">{value}</p>
              <p className="text-[11px] text-muted-foreground leading-tight">{label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}