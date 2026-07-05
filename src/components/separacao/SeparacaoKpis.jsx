import { Clock, Package, CheckCircle, ClipboardCheck, Timer, AlertTriangle } from 'lucide-react';

function tempoMedioSeparacao(separacoes) {
  const concluidas = separacoes.filter(s => s.data_inicio_separacao && s.data_separado);
  if (concluidas.length === 0) return '—';
  const totalMs = concluidas.reduce((s, sep) => {
    return s + (new Date(sep.data_separado) - new Date(sep.data_inicio_separacao));
  }, 0);
  const mediaMs = totalMs / concluidas.length;
  const horas = mediaMs / 3600000;
  if (horas >= 24) return `${(horas / 24).toFixed(1)}d`;
  if (horas >= 1) return `${horas.toFixed(1)}h`;
  return `${Math.round(mediaMs / 60000)}min`;
}

export default function SeparacaoKpis({ separacoes }) {
  const aguardando = separacoes.filter(s => s.status === 'aguardando_separacao').length;
  const emSeparacao = separacoes.filter(s => s.status === 'em_separacao').length;
  const separados = separacoes.filter(s => s.status === 'separado').length;
  const emConferencia = separacoes.filter(s => s.status === 'em_conferencia').length;
  const tempoMedio = tempoMedioSeparacao(separacoes);
  const hoje = new Date(new Date().toDateString());
  const atrasadas = separacoes.filter(s =>
    s.data_prevista && s.status !== 'liberado_expedicao' && new Date(s.data_prevista) < hoje
  ).length;

  const kpis = [
    { label: 'Aguardando Separação', value: aguardando, icon: Clock, color: '#64748B', bg: '#F8FAFC' },
    { label: 'Em Separação', value: emSeparacao, icon: Package, color: '#0EA5E9', bg: '#F0F9FF' },
    { label: 'Separados', value: separados, icon: CheckCircle, color: '#22C55E', bg: '#F0FDF4' },
    { label: 'Em Conferência', value: emConferencia, icon: ClipboardCheck, color: '#F59E0B', bg: '#FFFBEB' },
    { label: 'Tempo Médio Sep.', value: tempoMedio, icon: Timer, color: '#A855F7', bg: '#FAF5FF' },
    { label: 'Atrasadas', value: atrasadas, icon: AlertTriangle, color: '#EF4444', bg: '#FFF5F5' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
      {kpis.map(({ label, value, icon: Icon, color, bg }) => (
        <div key={label} className="rounded-xl p-3 border" style={{ background: bg, borderColor: `${color}30` }}>
          <div className="flex items-center gap-2 mb-1">
            <Icon size={14} style={{ color }} />
            <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color }}>{label}</p>
          </div>
          <p className="text-xl font-bold" style={{ color }}>{value}</p>
        </div>
      ))}
    </div>
  );
}