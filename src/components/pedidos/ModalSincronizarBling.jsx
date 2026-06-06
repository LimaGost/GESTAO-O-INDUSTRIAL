import { useState } from 'react';
import { X, Zap, Calendar } from 'lucide-react';

export default function ModalSincronizarBling({ onConfirmar, onClose, loading }) {
  const hoje = new Date().toISOString().split('T')[0];
  const [dataInicio, setDataInicio] = useState(hoje);
  const [dataFim, setDataFim] = useState(hoje);

  const handleConfirmar = () => {
    if (!dataInicio || !dataFim) return;
    onConfirmar({ dataInicio, dataFim });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center">
              <Zap size={16} className="text-orange-600" />
            </div>
            <div>
              <p className="font-bold text-sm text-foreground">Importar do Bling</p>
              <p className="text-xs text-muted-foreground">Selecione o período dos pedidos</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
            <X size={15} className="text-muted-foreground" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1 block">
                <Calendar size={11} /> Data início
              </label>
              <input
                type="date"
                value={dataInicio}
                onChange={e => setDataInicio(e.target.value)}
                max={dataFim}
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1 block">
                <Calendar size={11} /> Data fim
              </label>
              <input
                type="date"
                value={dataFim}
                onChange={e => setDataFim(e.target.value)}
                min={dataInicio}
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {dataInicio && dataFim && dataInicio === dataFim && (
            <p className="text-xs text-muted-foreground text-center">
              Importando pedidos do dia <strong>{new Date(dataInicio + 'T12:00:00').toLocaleDateString('pt-BR')}</strong>
            </p>
          )}
          {dataInicio && dataFim && dataInicio !== dataFim && (
            <p className="text-xs text-muted-foreground text-center">
              Importando de <strong>{new Date(dataInicio + 'T12:00:00').toLocaleDateString('pt-BR')}</strong> até <strong>{new Date(dataFim + 'T12:00:00').toLocaleDateString('pt-BR')}</strong>
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-border rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmar}
            disabled={loading || !dataInicio || !dataFim}
            className="flex-1 flex items-center justify-center gap-2 bg-orange-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-orange-600 disabled:opacity-50 transition-colors"
          >
            <Zap size={14} className={loading ? 'animate-pulse' : ''} />
            {loading ? 'Importando...' : 'Importar'}
          </button>
        </div>
      </div>
    </div>
  );
}