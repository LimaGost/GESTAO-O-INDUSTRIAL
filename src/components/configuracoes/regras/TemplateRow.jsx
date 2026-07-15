import { useState } from 'react';
import { Plus } from 'lucide-react';
import ParamInput from './ParamInput';

// Linha de template (frase montável) com botão "+" para adicionar — estilo Trello
export default function TemplateRow({ template, etapas, etapasPorKanban = {}, onAdd }) {
  const [params, setParams] = useState({});

  // Se o template tem seletor de kanban, as etapas exibidas seguem o kanban escolhido
  const etapasRow = params.kanban && etapasPorKanban[params.kanban] ? etapasPorKanban[params.kanban] : etapas;

  const adicionar = () => {
    // Preenche defaults dos parâmetros não tocados
    const completos = { ...params };
    for (const p of template.partes) {
      if (typeof p === 'object' && p.param && completos[p.param] === undefined && p.default !== undefined) {
        completos[p.param] = p.default;
      }
    }
    onAdd(completos);
    setParams({});
  };

  return (
    <div className="bg-muted/60 border border-border/60 rounded-xl px-4 py-3">
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-1.5 flex-wrap text-sm text-foreground">
          {template.partes.map((p, i) => {
            if (typeof p === 'string') return <span key={i}>{p}</span>;
            if (p.chip) return (
              <span key={i} className="bg-background border border-border rounded-md px-2 py-0.5 text-xs font-semibold text-foreground">
                {p.chip}
              </span>
            );
            return (
              <ParamInput key={i} def={p} etapas={etapasRow}
                value={params[p.param]}
                onChange={v => setParams(prev => ({ ...prev, [p.param]: v }))} />
            );
          })}
        </div>
        <button onClick={adicionar}
          className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors flex-shrink-0"
          title="Adicionar">
          <Plus size={16} />
        </button>
      </div>
      {template.descricao && (
        <p className="mt-1.5 text-[11px] text-muted-foreground">{template.descricao}</p>
      )}
    </div>
  );
}