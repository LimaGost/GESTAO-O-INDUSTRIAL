import { RefreshCw, ArrowRight, Trash2 } from 'lucide-react';

const PRIORIDADE = {
  baixa:  { label: 'Baixa',  cls: 'bg-slate-100 text-slate-600' },
  normal: { label: 'Normal', cls: 'bg-blue-100 text-blue-700' },
  alta:   { label: 'Alta',   cls: 'bg-red-100 text-red-700' },
};

export default function GalpaoCard({ sep, onAvancar, onExcluir, loading, labelBotao, readonly }) {
  const pri = PRIORIDADE[sep.prioridade] || PRIORIDADE.normal;
  const totalUn = (sep.itens || []).reduce((s, i) => s + (i.quantidade || 0), 0);

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <div className="px-3.5 pt-3.5 pb-2.5 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">{sep.numero}</p>
            <p className="text-sm font-bold text-foreground leading-tight truncate">{sep.cliente_nome || 'Sem cliente'}</p>
          </div>
          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0 ${pri.cls}`}>{pri.label}</span>
        </div>
        {sep.data_prevista && (
          <p className="text-xs text-muted-foreground">🗓 Previsto: {new Date(sep.data_prevista + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
        )}
        {(sep.itens || []).length > 0 && (
          <div className="bg-muted/30 rounded-lg px-2.5 py-1.5">
            {sep.itens.slice(0, 3).map((item, i) => (
              <p key={i} className="text-xs text-foreground truncate">{item.produto_nome} × {item.quantidade}</p>
            ))}
            {sep.itens.length > 3 && <p className="text-xs text-muted-foreground">+{sep.itens.length - 3} mais...</p>}
            <p className="text-[10px] text-muted-foreground mt-0.5">{totalUn} un no total</p>
          </div>
        )}
        {sep.observacoes && (
          <p className="text-xs text-muted-foreground italic line-clamp-2">💬 {sep.observacoes}</p>
        )}
      </div>

      {!readonly && (
        <div className="border-t border-border px-3.5 py-2.5 flex gap-1.5">
          {labelBotao && (
            <button onClick={() => onAvancar(sep)} disabled={loading}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg text-white bg-primary hover:opacity-90 transition-all disabled:opacity-50">
              {loading ? <RefreshCw size={11} className="animate-spin" /> : <ArrowRight size={11} />}
              {labelBotao}
            </button>
          )}
          <button onClick={() => onExcluir(sep)} disabled={loading}
            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50">
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </div>
  );
}