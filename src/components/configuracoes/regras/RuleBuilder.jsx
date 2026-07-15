import { useState } from 'react';
import { Check, ChevronRight, Trash2, Plus } from 'lucide-react';
import { KANBANS } from '@/lib/kanbanFluxo';
import {
  CATEGORIAS_GATILHO, CATEGORIAS_ACAO, GATILHOS, ACOES,
  gatilhoByKey, acaoByKey, montarFrase,
} from './regrasCatalogo';
import TemplateRow from './TemplateRow';

// Construtor de Regras em etapas (estilo Trello): 1. Gatilho → 2. Ação → 3. Revisar
export default function RuleBuilder({ regraInicial, etapasPorKanban, onSave, onCancel }) {
  const [nome, setNome] = useState(regraInicial?.nome || '');
  const [kanban, setKanban] = useState(regraInicial?.kanban || 'producao');
  const [gatilho, setGatilho] = useState(regraInicial?.gatilho || null);   // { key, params }
  const [acoes, setAcoes] = useState(regraInicial?.acoes || []);           // [{ key, params }]
  const [step, setStep] = useState(regraInicial?.gatilho ? (regraInicial?.acoes?.length ? 3 : 2) : 1);
  const [catG, setCatG] = useState('movimentacao');
  const [catA, setCatA] = useState('movimentacao');

  const etapas = etapasPorKanban[kanban] || [];
  const podeSalvar = !!gatilho && acoes.length > 0;

  const salvar = () => {
    if (!podeSalvar) return;
    const fraseAuto = montarFrase(gatilhoByKey(gatilho.key), gatilho.params, etapas);
    onSave({
      id: regraInicial?.id || `regra_${Date.now().toString(36)}`,
      nome: nome.trim() || fraseAuto,
      kanban,
      gatilho,
      acoes,
      ativo: regraInicial?.ativo ?? true,
    });
  };

  const STEPS = [
    { n: 1, label: 'Selecionar gatilho', done: !!gatilho },
    { n: 2, label: 'Selecionar ação', done: acoes.length > 0 },
    { n: 3, label: 'Revisar e salvar', done: false },
  ];

  const caixaSelecionada = (frase, onRemove, removivel = true) => (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-muted/60 border border-border rounded-lg px-4 py-2.5 text-sm text-foreground">
        {frase}
      </div>
      <button onClick={onRemove} disabled={!removivel}
        className="p-2.5 bg-muted border border-border rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-40 transition-colors">
        <Trash2 size={14} />
      </button>
    </div>
  );

  const abas = (categorias, ativa, setAtiva) => (
    <div className="flex gap-2 flex-wrap">
      {categorias.map(({ key, label, Icon }) => (
        <button key={key} onClick={() => setAtiva(key)}
          className={`flex flex-col items-center gap-1 px-4 py-2.5 rounded-lg border text-xs font-semibold transition-all min-w-[90px] ${
            ativa === key ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-border bg-card text-muted-foreground hover:bg-muted'
          }`}>
          <Icon size={16} /> {label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h3 className="font-bold text-lg text-foreground">{regraInicial ? 'Editar Regra' : 'Criar uma Regra'}</h3>
        <div className="flex items-center gap-2">
          <button onClick={salvar} disabled={!podeSalvar}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 transition-colors">
            Salvar
          </button>
          <button onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors">
            Cancelar
          </button>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-center gap-3 px-6 py-4 border-b border-border flex-wrap">
        {STEPS.map((s, i) => (
          <div key={s.n} className="flex items-center gap-3">
            <button onClick={() => s.n < step && setStep(s.n)}
              className={`flex items-center gap-2 ${s.n <= step ? 'cursor-pointer' : 'cursor-default'}`}>
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                s.done ? 'bg-emerald-100 text-emerald-600' : step === s.n ? 'bg-slate-700 text-white' : 'bg-muted text-muted-foreground'
              }`}>
                {s.done ? <Check size={14} /> : s.n}
              </span>
              <span className={`text-sm font-semibold ${step === s.n ? 'text-foreground' : 'text-muted-foreground'}`}>{s.label}</span>
            </button>
            {i < STEPS.length - 1 && <ChevronRight size={16} className="text-blue-500" />}
          </div>
        ))}
      </div>

      <div className="p-6 space-y-5">
        {/* Kanban alvo */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">Kanban:</span>
          <select value={kanban}
            onChange={e => { setKanban(e.target.value); }}
            className="border border-border rounded-lg px-3 py-1.5 text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
            {KANBANS.map(k => <option key={k.key} value={k.key}>{k.label}</option>)}
          </select>
        </div>

        {/* ETAPA 1: Selecionar gatilho */}
        {step === 1 && (
          <div className="space-y-3">
            <p className="font-bold text-sm text-foreground">Selecionar Gatilho</p>
            {abas(CATEGORIAS_GATILHO, catG, setCatG)}
            <div className="space-y-2">
              {GATILHOS.filter(g => g.categoria === catG).map(g => (
                <TemplateRow key={g.key} template={g} etapas={etapas}
                  onAdd={(params) => { setGatilho({ key: g.key, params }); setStep(2); }} />
              ))}
            </div>
          </div>
        )}

        {/* Gatilho selecionado (etapas 2 e 3) */}
        {step >= 2 && gatilho && (
          <div className="space-y-2">
            <p className="font-bold text-sm text-foreground">Gatilho</p>
            {caixaSelecionada(
              montarFrase(gatilhoByKey(gatilho.key), gatilho.params, etapas),
              () => { setGatilho(null); setStep(1); }
            )}
          </div>
        )}

        {/* ETAPA 2: Selecionar ação */}
        {step === 2 && (
          <div className="space-y-3">
            <p className="font-bold text-sm text-foreground">Selecionar Ação</p>
            {abas(CATEGORIAS_ACAO, catA, setCatA)}
            <div className="space-y-2">
              {ACOES.filter(a => a.categoria === catA).map(a => (
                <TemplateRow key={a.key} template={a} etapas={etapas}
                  onAdd={(params) => { setAcoes(prev => [...prev, { key: a.key, params }]); setStep(3); }} />
              ))}
            </div>
          </div>
        )}

        {/* ETAPA 3: Revisar e salvar */}
        {step === 3 && (
          <>
            <div className="space-y-2">
              <p className="font-bold text-sm text-foreground">Ação</p>
              {acoes.map((a, i) => (
                <div key={i}>
                  {caixaSelecionada(
                    montarFrase(acaoByKey(a.key), a.params, etapas),
                    () => {
                      const novas = acoes.filter((_, j) => j !== i);
                      setAcoes(novas);
                      if (novas.length === 0) setStep(2);
                    },
                    acoes.length > 0
                  )}
                </div>
              ))}
              <div className="flex justify-center pt-1">
                <button onClick={() => setStep(2)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-muted border border-border text-sm font-semibold text-foreground hover:bg-muted/70 transition-colors">
                  <Plus size={14} /> Adicionar outra ação
                </button>
              </div>
            </div>

            <div className="space-y-1.5 border-t border-border pt-4">
              <label className="text-sm font-bold text-foreground block">Nome da regra <span className="font-normal text-muted-foreground text-xs">(opcional)</span></label>
              <input value={nome} onChange={e => setNome(e.target.value)}
                placeholder="Ex: Pedido Recebido, Fábrica - Etapa 2..."
                className="w-full max-w-md border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}