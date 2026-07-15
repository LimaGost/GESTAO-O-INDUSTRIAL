import { Clock, CheckCircle, Package, FileText, XCircle, DollarSign } from 'lucide-react';

const fmtR = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

export default function FranqueadosKpis({ pedidos }) {
  const count = (s) => pedidos.filter(p => p.status === s).length;
  const valorTotal = pedidos.filter(p => p.status !== 'cancelado').reduce((s, p) => s + (p.valor_total || 0), 0);

  const kpis = [
    { label: 'Pendente',     valor: count('pendente'),     icon: Clock,       cor: '#F59E0B', bg: '#FFFBEB', border: '#FCD34D' },
    { label: 'Aprovado',     valor: count('aprovado'),     icon: CheckCircle, cor: '#22C55E', bg: '#F0FDF4', border: '#86EFAC' },
    { label: 'Em Expedição', valor: count('em_expedicao'), icon: Package,     cor: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE' },
    { label: 'Faturado',     valor: count('faturado'),     icon: FileText,    cor: '#A855F7', bg: '#FAF5FF', border: '#D8B4FE' },
    { label: 'Cancelado',    valor: count('cancelado'),    icon: XCircle,     cor: '#EF4444', bg: '#FFF5F5', border: '#FCA5A5' },
    { label: 'Valor Total',  valor: fmtR(valorTotal),      icon: DollarSign,  cor: '#0D3B45', bg: '#F0F9FF', border: '#BAE6FD' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
      {kpis.map(({ label, valor, icon: Icon, cor, bg, border }) => (
        <div key={label} className="rounded-xl px-3 py-2.5" style={{ background: bg, border: `1px solid ${border}` }}>
          <div className="flex items-center gap-1.5 mb-1">
            <Icon size={12} style={{ color: cor }} />
            <p className="text-[10px] font-bold uppercase tracking-wide truncate" style={{ color: cor }}>{label}</p>
          </div>
          <p className="text-lg font-bold leading-tight" style={{ color: cor }}>{valor}</p>
        </div>
      ))}
    </div>
  );
}