import { Tag, Pencil, Copy, Trash2 } from 'lucide-react';
import { KANBANS } from '@/lib/kanbanFluxo';
import { gatilhoByKey, acaoByKey, montarFrase } from './regrasCatalogo';

// Card de regra salva — estilo Trello/Pluglead: nome, frase completa e toggle de ativação
export default function RegraCard({ regra, etapas, etapasPorKanban = {}, onEditar, onDuplicar, onExcluir, onToggle }) {
  const fraseGatilho = montarFrase(gatilhoByKey(regra.gatilho?.key), regra.gatilho?.params, etapas);
  const frasesAcoes = (regra.acoes || []).map(a => montarFrase(acaoByKey(a.key), a.params, etapas, etapasPorKanban));
  const frase = `${fraseGatilho}, ${frasesAcoes.join(', e ')}`;
  const kanbanInfo = KANBANS.find(k => k.key === regra.kanban);

  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Tag size={14} className="text-muted-foreground flex-shrink-0" />
        <p className="font-bold text-sm text-foreground truncate flex-1">{regra.nome}</p>
        <button onClick={onEditar} title="Editar"
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">
          <Pencil size={14} />
        </button>
        <button onClick={onDuplicar} title="Duplicar"
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">
          <Copy size={14} />
        </button>
        <button onClick={onExcluir} title="Excluir"
          className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
          <Trash2 size={14} />
        </button>
      </div>

      <div className="bg-muted/60 border border-border/60 rounded-lg px-4 py-3 text-xs font-mono text-foreground leading-relaxed">
        {frase}
      </div>

      <div className="flex items-center justify-between">
        <button onClick={onToggle} className="flex items-center gap-2 group">
          <span className={`w-9 h-5 rounded-full relative transition-colors ${regra.ativo ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`}>
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${regra.ativo ? 'left-[18px]' : 'left-0.5'}`} />
          </span>
          <span className="text-xs text-muted-foreground group-hover:text-foreground">Habilitar neste kanban</span>
        </button>
        {kanbanInfo && (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold text-white" style={{ background: kanbanInfo.cor }}>
            {kanbanInfo.label.replace('Kanban de ', '')}
          </span>
        )}
      </div>
    </div>
  );
}