import { RefreshCw } from 'lucide-react';

export default function DashboardHeader({ onRefresh, loading }) {
  return (
    <div className="rounded-2xl px-6 py-4 flex items-center justify-between flex-wrap gap-3" style={{ background: '#0D3B45' }}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">☀️</span>
        <div>
          <p className="text-sm font-bold text-white">Raio do Sol — Gestão Industrial</p>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>Painel Executivo</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <p className="text-xs hidden sm:block" style={{ color: 'rgba(255,255,255,0.35)' }}>
          {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
        </p>
        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors"
          style={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.2)' }}
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Atualizar
        </button>
      </div>
    </div>
  );
}