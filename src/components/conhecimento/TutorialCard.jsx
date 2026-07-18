import { Pencil, Trash2 } from 'lucide-react';

export default function TutorialCard({ tutorial, podeEditar, onEditar, onExcluir }) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <video src={tutorial.video_url} controls preload="metadata"
        className="w-full aspect-video bg-black" />
      <div className="p-4 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-primary uppercase tracking-wide">{tutorial.modulo || 'Geral'}</span>
            <h3 className="text-sm font-bold text-foreground leading-tight">{tutorial.titulo}</h3>
          </div>
          {podeEditar && (
            <div className="flex gap-1 flex-shrink-0">
              <button onClick={() => onEditar(tutorial)} title="Editar"
                className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                <Pencil size={13} />
              </button>
              <button onClick={() => onExcluir(tutorial)} title="Excluir"
                className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-destructive">
                <Trash2 size={13} />
              </button>
            </div>
          )}
        </div>
        {tutorial.descricao && (
          <p className="text-xs text-muted-foreground leading-snug">{tutorial.descricao}</p>
        )}
      </div>
    </div>
  );
}