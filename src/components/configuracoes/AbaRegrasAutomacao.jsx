import { useEffect, useState } from 'react';
import { Plus, Zap } from 'lucide-react';
import { loadConfig, saveConfig } from '@/lib/appConfig';
import { KANBANS, loadKanbanFluxo } from '@/lib/kanbanFluxo';
import RuleBuilder from './regras/RuleBuilder';
import RegraCard from './regras/RegraCard';

// Regras de Automação — construtor estilo Trello, salvo em AppConfig 'regras_automacao_v2'
export default function AbaRegrasAutomacao() {
  const [regras, setRegras] = useState([]);
  const [etapasPorKanban, setEtapasPorKanban] = useState({});
  const [loading, setLoading] = useState(true);
  const [builder, setBuilder] = useState(null); // null | { regra?, index? }

  useEffect(() => {
    (async () => {
      const [cfg, entries] = await Promise.all([
        loadConfig('regras_automacao_v2'),
        Promise.all(KANBANS.map(async k => [k.key, (await loadKanbanFluxo(k.key)).stages])),
      ]);
      setRegras(Array.isArray(cfg?.regras) ? cfg.regras : []);
      setEtapasPorKanban(Object.fromEntries(entries));
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
    </div>
  );
}