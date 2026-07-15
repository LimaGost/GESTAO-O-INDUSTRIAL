import { useEffect, useState } from 'react';
import { Save, Radio, Play } from 'lucide-react';
import { saveConfig } from '@/lib/appConfig';
import { loadRegrasConfig, getTriggersSistema, getAcoesAutoSistema } from '@/lib/kanbanFluxo';
import SecaoRegrasLista from './SecaoRegrasLista';

// Gerenciador central de regras de automação — gatilhos (Quando) e ações (Executar)
// Salvo em AppConfig 'regras_automacao_custom'
export default function AbaRegrasAutomacao() {
  const [triggers, setTriggers] = useState([]);
  const [acoes, setAcoes] = useState([]);
  const [triggerOverrides, setTriggerOverrides] = useState({});
  const [acaoOverrides, setAcaoOverrides] = useState({});
  const [triggerKanbans, setTriggerKanbans] = useState({});
  const [acaoKanbans, setAcaoKanbans] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadRegrasConfig().then(cfg => {
      setTriggers(cfg.triggers);
      setAcoes(cfg.acoes);
      setTriggerOverrides(cfg.trigger_overrides);
      setAcaoOverrides(cfg.acao_overrides);
      setTriggerKanbans(cfg.trigger_kanbans);
      setAcaoKanbans(cfg.acao_kanbans);
      setLoading(false);
    });
  }, []);

  // Remove overrides iguais ao padrão e atribuições de kanban idênticas ao default
  const limpar = (overrides, kanbansMap, sistema) => {
    const defaults = Object.fromEntries(sistema.map(a => [a.key, a.label]));
    const kanbansDefault = Object.fromEntries(sistema.map(a => [a.key, [...a.kanbans].sort().join(',')]));
    const ov = {};
    for (const [k, v] of Object.entries(overrides)) {
      const t = (v || '').trim();
      if (t && t !== defaults[k]) ov[k] = t;
    }
    const km = {};
    for (const [k, v] of Object.entries(kanbansMap)) {
      if (Array.isArray(v) && [...v].sort().join(',') !== kanbansDefault[k]) km[k] = v;
    }
    return { ov, km };
  };

  const salvar = async () => {
    setSaving(true);
    const triggersValidos = triggers.filter(t => (t.label || '').trim());
    const acoesValidas = acoes.filter(a => (a.label || '').trim());
    const t = limpar(triggerOverrides, triggerKanbans, getTriggersSistema());
    const a = limpar(acaoOverrides, acaoKanbans, getAcoesAutoSistema());
    await saveConfig('regras_automacao_custom', {
      triggers: triggersValidos,
      acoes: acoesValidas,
      trigger_overrides: t.ov,
      acao_overrides: a.ov,
      trigger_kanbans: t.km,
      acao_kanbans: a.km,
    });
    setTriggers(triggersValidos);
    setAcoes(acoesValidas);
    setTriggerOverrides(t.ov);
    setAcaoOverrides(a.ov);
    setTriggerKanbans(t.km);
    setAcaoKanbans(a.km);
    window.dispatchEvent(new Event('regras:saved'));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) return <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">Carregando regras...</div>;

  return (
    <div className="space-y-4">
      <SecaoRegrasLista
        titulo="Gatilhos (Quando)"
        subtitulo="Eventos que disparam uma regra de automação na Gestão de Fluxos."
        Icone={Radio}
        sistema={getTriggersSistema()}
        custom={triggers} setCustom={setTriggers}
        overrides={triggerOverrides} setOverrides={setTriggerOverrides}
        kanbansMap={triggerKanbans} setKanbansMap={setTriggerKanbans}
        placeholder="Nome do gatilho (ex: Pedido aprovado, Estoque baixo...)"
      />

      <SecaoRegrasLista
        titulo="Ações de Automação (Executar)"
        subtitulo="O que a regra executa quando o gatilho acontece."
        Icone={Play}
        sistema={getAcoesAutoSistema()}
        custom={acoes} setCustom={setAcoes}
        overrides={acaoOverrides} setOverrides={setAcaoOverrides}
        kanbansMap={acaoKanbans} setKanbansMap={setAcaoKanbans}
        placeholder="Nome da ação (ex: Avisar gerente, Gerar relatório...)"
      />

      <div className="bg-card border border-border rounded-2xl px-6 py-4 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Gatilhos e ações ficam disponíveis nas Regras de Automação de cada kanban na Gestão de Fluxos.</p>
        <button onClick={salvar} disabled={saving}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${saved ? 'bg-green-500 text-white' : 'bg-primary text-primary-foreground hover:opacity-90'} disabled:opacity-50`}>
          <Save size={14} /> {saved ? 'Salvo!' : saving ? 'Salvando...' : 'Salvar Regras'}
        </button>
      </div>
    </div>
  );
}