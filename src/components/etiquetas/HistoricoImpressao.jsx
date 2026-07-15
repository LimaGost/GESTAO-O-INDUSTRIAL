import { History, RotateCcw, Trash2 } from 'lucide-react';
import { useState } from 'react';

function lerHistorico() {
  try { return JSON.parse(localStorage.getItem('estudio_etiquetas_historico') || '[]'); } catch { return []; }
}

export default function HistoricoImpressao({ onReimprimir }) {
  const [historico, setHistorico] = useState(lerHistorico);

  const limpar = () => {
    localStorage.removeItem('estudio_etiquetas_historico');
    setHistorico([]);
  };

  if (historico.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <History size={12} /> Últimas impressões
        </p>
        <button onClick={limpar} className="text-muted-foreground hover:text-destructive transition-colors" title="Limpar histórico">
          <Trash2 size={13} />
        </button>
      </div>
      <div className="space-y-1.5 max-h-64 overflow-y-auto">
        {historico.map((item, i) => (
          <div key={i} className="flex items-center gap-2 border border-border rounded-xl px-3 py-2 bg-background">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{item.produto_nome}</p>
              <p className="text-[10px] text-muted-foreground">
                {item.quantidade} un · {item.lote ? `Lote ${item.lote} · ` : ''}
                {new Date(item.data_impressao).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <button onClick={() => onReimprimir(item)}
              title="Carregar no editor"
              className="flex items-center gap-1 text-[10px] font-semibold text-primary border border-primary/25 px-2 py-1 rounded-lg hover:bg-primary/10 transition-colors flex-shrink-0">
              <RotateCcw size={10} /> Reusar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}