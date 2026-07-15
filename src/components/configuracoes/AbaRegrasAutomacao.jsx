import { useEffect, useState } from 'react';
import { Plus, Zap, ArrowRight, History } from 'lucide-react';
import { loadConfig, saveConfig } from '@/lib/appConfig';
import { KANBANS, loadKanbanFluxo, getTriggersSistema, getAcoesAutoSistema } from '@/lib/kanbanFluxo';
import RuleBuilder from './regras/RuleBuilder';
import RegraCard from './regras/RegraCard';

// Regras de Automação — construtor estilo Trello, salvo em AppConfig 'regras_automacao_v2'
export default function AbaRegrasAutomacao() {
  const [regras, setRegras] = useState([]);
  const [regrasLegado, setRegrasLegado] = useState([]);
  const [etapasPorKanban, setEtapasPorKanban] = useState({});
  const [loading, setLoading] = useState(true);
  const [builder, setBuilder] = useState(null); // null | { regra?, index? }

  useEffect(() => {
    (async () => {
      const [cfg, fluxos] = await Promise.all([
        loadConfig('regras_automacao_v2'),
        Promise.all(KANBANS.map(async k => [k.key, await loadKanbanFluxo(k.key)])),
      ]);
      setRegras(Array.isArray(cfg?.regras) ? cfg.regras : []);
      setEtapasPorKanban(Object.fromEntries(fluxos.map(([key, f]) => [key, f.stages])));
      // Regras já existentes, salvas dentro de cada Kanban (Gestão de Fluxos)
      const legado = [];
      for (const [key, f] of fluxos) {
        for (const a of (f.automacoes || [])) legado.push({ kanban: key, ...a });
      }
      setRegrasLegado(legado);
      setLoading(false);
    })();
  }, []);

  const persistir = async (novas) => {
    setRegras(novas);
    await saveConfig('regras_automacao_v2', { regras: novas });
    window.dispatchEvent(new Event('regras:saved'));
  };

  const salvarRegra = (regra) => {
    const novas = builder?.index !== undefined && builder.index !== null
      ? regras.map((r, i) => i === builder.index ? regra : r)
      : [...regras, regra];
    persistir(novas);
    setBuilder(null);
  };

  const duplicar = (idx) => {
    const orig = regras[idx];
    persistir([...regras, { ...orig, id: `regra_${Date.now().toString(36)}`, nome: `${orig.nome} (cópia)` }]);
  };

  const excluir = (idx) => {
    if (!confirm(`Excluir a regra "${regras[idx].nome}"?`)) return;
    persistir(regras.filter((_, i) => i !== idx));
  };

  const toggle = (idx) => {
    persistir(regras.map((r, i) => i === idx ? { ...r, ativo: !r.ativo } : r));
  };

  if (loading) return <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">Carregando regras...</div>;

  if (builder) {
    return (
      <RuleBuilder
        regraInicial={builder.regra || null}
        etapasPorKanban={etapasPorKanban}
        onSave={salvarRegra}
        onCancel={() => setBuilder(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg text-foreground">Regras</h3>
        <button onClick={() => setBuilder({})}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors">
          <Plus size={14} /> Criar automação
        </button>
      </div>

      {regras.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl flex flex-col items-center py-14 text-center px-6">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
            <Zap size={22} className="text-primary" />
          </div>
          <p className="font-bold text-foreground mb-1">Nenhuma regra criada</p>
          <p className="text-xs text-muted-foreground max-w-sm mb-4">
            Crie regras do tipo "quando isso acontecer, faça aquilo" — igual às automações do Trello. Ex: quando um card for movido para "Em Produção", enviar WhatsApp para o cliente.
          </p>
          <button onClick={() => setBuilder({})}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors">
            <Plus size={14} /> Criar automação
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {regras.map((regra, idx) => (
            <RegraCard
              key={regra.id}
              regra={regra}
              etapas={etapasPorKanban[regra.kanban] || []}
              onEditar={() => setBuilder({ regra, index: idx })}
              onDuplicar={() => duplicar(idx)}
              onExcluir={() => excluir(idx)}
              onToggle={() => toggle(idx)}
            />
          ))}
        </div>
      )}

      {/* Regras já existentes nos Kanbans (Gestão de Fluxos) */}
      {regrasLegado.length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
            <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
              <History size={16} className="text-muted-foreground" />
            </div>
            <div>
              <p className="font-bold text-sm text-foreground">Regras existentes dos Kanbans</p>
              <p className="text-xs text-muted-foreground">Automações já configuradas em Gestão de Fluxos — edite-as por lá.</p>
            </div>
          </div>
          <div className="px-5 py-4 space-y-2">
            {regrasLegado.map((r, i) => {
              const kanbanInfo = KANBANS.find(k => k.key === r.kanban);
              const triggerLabel = (getTriggersSistema().find(t => t.key === r.trigger) || {}).label || r.trigger;
              const acaoLabel = (getAcoesAutoSistema().find(a => a.key === r.acao) || {}).label || r.acao;
              return (
                <div key={i} className="flex items-center gap-2 flex-wrap bg-muted/50 border border-border/60 rounded-xl px-4 py-2.5 text-sm">
                  {kanbanInfo && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold text-white flex-shrink-0" style={{ background: kanbanInfo.cor }}>
                      {kanbanInfo.label.replace('Kanban de ', '')}
                    </span>
                  )}
                  <span className="text-muted-foreground text-xs font-bold uppercase">Quando</span>
                  <span className="text-foreground font-medium">{triggerLabel}</span>
                  <ArrowRight size={13} className="text-muted-foreground/50" />
                  <span className="text-muted-foreground text-xs font-bold uppercase">Executar</span>
                  <span className="text-foreground font-medium">{acaoLabel}</span>
                  <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-semibold ${r.ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>
                    {r.ativo ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}