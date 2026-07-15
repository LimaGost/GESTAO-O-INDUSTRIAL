import { useEffect, useState } from 'react';
import {
  Save, Plus, Trash2, ChevronUp, ChevronDown, GripVertical, Zap,
  ArrowRight, Settings2, Users,
} from 'lucide-react';
import {
  KANBANS, CORES, ROLES,
  getIcon, loadKanbanFluxo, saveKanbanFluxo, DEFAULTS,
  loadAcoesConfig, getAcoesEtapa,
  loadRegrasConfig, getTriggersKanban, getAcoesAutomacao,
} from '@/lib/kanbanFluxo';
import IconPicker from './IconPicker';

export default function AbaGestaoFluxos() {
  const [kanbanAtivo, setKanbanAtivo] = useState('pedidos');
  const [configs, setConfigs] = useState({}); // { [kanbanKey]: { stages, automacoes } }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [acoesCfg, setAcoesCfg] = useState({ acoes: [], overrides: {}, sistema_kanbans: {} });
  const [regrasCfg, setRegrasCfg] = useState({ triggers: [], acoes: [], trigger_overrides: {}, acao_overrides: {}, trigger_kanbans: {}, acao_kanbans: {} });

  // Carrega todos os kanbans uma vez
  useEffect(() => {
    (async () => {
      const [entries, cfg, regras] = await Promise.all([
        Promise.all(KANBANS.map(async k => [k.key, await loadKanbanFluxo(k.key)])),
        loadAcoesConfig(),
        loadRegrasConfig(),
      ]);
      setConfigs(Object.fromEntries(entries));
      setAcoesCfg(cfg);
      setRegrasCfg(regras);
      setLoading(false);
    })();
  }, []);

  // Atualiza as listas quando ações/regras são editadas em Configurações
  useEffect(() => {
    const onAcoes = () => loadAcoesConfig().then(setAcoesCfg);
    const onRegras = () => loadRegrasConfig().then(setRegrasCfg);
    window.addEventListener('acoes:saved', onAcoes);
    window.addEventListener('regras:saved', onRegras);
    return () => {
      window.removeEventListener('acoes:saved', onAcoes);
      window.removeEventListener('regras:saved', onRegras);
    };
  }, []);

  const cfg = configs[kanbanAtivo] || DEFAULTS[kanbanAtivo];
  const setCfg = (updater) => setConfigs(prev => ({ ...prev, [kanbanAtivo]: updater(prev[kanbanAtivo]) }));

  // ── Stages ──
  const updateStage = (idx, field, val) =>
    setCfg(c => ({ ...c, stages: c.stages.map((s, i) => i === idx ? { ...s, [field]: val } : s) }));

  // Múltiplas ações por etapa — mantém `acao` (primeira) para compatibilidade
  const setStageAcoes = (idx, acoes) =>
    setCfg(c => ({ ...c, stages: c.stages.map((s, i) => i === idx ? { ...s, acoes, acao: acoes[0] || 'nenhuma' } : s) }));

  const addStage = () => {
    const novaKey = `etapa_${Date.now().toString(36)}`;
    setCfg(c => ({
      ...c,
      stages: [...c.stages, { key: novaKey, label: 'Nova Etapa', cor: c.stages.length % 8, icone: 'Clock', responsaveis: [], acao: 'nenhuma' }],
    }));
  };

  const removeStage = (idx) => {
    setCfg(c => ({ ...c, stages: c.stages.filter((_, i) => i !== idx) }));
  };

  const moverStage = (idx, dir) => {
    const novo = idx + dir;
    if (novo < 0 || novo >= cfg.stages.length) return;
    setCfg(c => {
      const arr = [...c.stages];
      [arr[idx], arr[novo]] = [arr[novo], arr[idx]];
      return { ...c, stages: arr };
    });
  };

  const toggleResponsavel = (idx, role) =>
    setCfg(c => ({ ...c, stages: c.stages.map((s, i) => {
      if (i !== idx) return s;
      const set = new Set(s.responsaveis || []);
      set.has(role) ? set.delete(role) : set.add(role);
      return { ...s, responsaveis: [...set] };
    }) }));

  // ── Automações ──
  const updateAuto = (idx, field, val) =>
    setCfg(c => ({ ...c, automacoes: c.automacoes.map((a, i) => i === idx ? { ...a, [field]: val } : a) }));

  const addAuto = () => {
    const ts = getTriggersKanban(kanbanAtivo, regrasCfg);
    const as = getAcoesAutomacao(kanbanAtivo, regrasCfg);
    setCfg(c => ({ ...c, automacoes: [...c.automacoes, { trigger: (ts[0] || {}).key, acao: (as[0] || {}).key, ativo: true }] }));
  };

  const removeAuto = (idx) =>
    setCfg(c => ({ ...c, automacoes: c.automacoes.filter((_, i) => i !== idx) }));

  const salvar = async () => {
    setSaving(true);
    await saveKanbanFluxo(kanbanAtivo, cfg);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) return <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">Carregando configurações...</div>;

  const kanbanInfo = KANBANS.find(k => k.key === kanbanAtivo);

  return (
    <div className="space-y-4">
      {/* Visão geral do fluxo */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={15} className="text-primary" />
          <p className="font-bold text-sm text-foreground">Fluxo Operacional Integrado</p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          {KANBANS.map((k, i) => {
            const Icon = getIcon(k.icon);
            const ativo = k.key === kanbanAtivo;
            return (
              <div key={k.key} className="flex items-center gap-1.5">
                <button onClick={() => setKanbanAtivo(k.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold border transition-all ${ativo ? 'border-primary text-primary bg-primary/5' : 'border-border text-muted-foreground hover:bg-muted'}`}
                  style={ativo ? { borderColor: k.cor, color: k.cor } : {}}>
                  <Icon size={13} /> {k.label.replace('Kanban de ', '')}
                </button>
                {i < KANBANS.length - 1 && <ArrowRight size={12} className="text-muted-foreground/40" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Seletor de Kanban (mobile) */}
      <div className="sm:hidden flex gap-1.5 overflow-x-auto pb-1">
        {KANBANS.map(k => {
          const Icon = getIcon(k.icon);
          const ativo = k.key === kanbanAtivo;
          return (
            <button key={k.key} onClick={() => setKanbanAtivo(k.key)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border whitespace-nowrap"
              style={ativo ? { borderColor: k.cor, color: k.cor, background: `${k.cor}11` } : {}}>
              <Icon size={13} /> {k.label.replace('Kanban de ', '')}
            </button>
          );
        })}
      </div>

      {/* Card de configuração do kanban ativo */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-3" style={{ background: `${kanbanInfo.cor}0D` }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${kanbanInfo.cor}1A` }}>
            {(() => { const I = getIcon(kanbanInfo.icon); return <I size={18} style={{ color: kanbanInfo.cor }} />; })()}
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm text-foreground">{kanbanInfo.label}</p>
            <p className="text-xs text-muted-foreground">Entidade: {kanbanInfo.entidade} · {cfg.stages.length} etapas · {cfg.automacoes.length} automação(ões)</p>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* ETAPAS */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Settings2 size={14} className="text-primary" />
                <p className="font-bold text-sm text-foreground">Etapas</p>
                <span className="text-xs text-muted-foreground">— ordem = fluxo de execução</span>
              </div>
              <button onClick={addStage} className="flex items-center gap-1.5 text-xs font-semibold text-primary border border-primary/30 bg-primary/5 px-3 py-1.5 rounded-lg hover:bg-primary/10 transition-colors">
                <Plus size={13} /> Adicionar etapa
              </button>
            </div>

            <div className="space-y-2">
              {cfg.stages.map((stage, idx) => {
                const cor = CORES[stage.cor] || CORES[0];
                const Icon = getIcon(stage.icone);
                return (
                  <div key={stage.key} className="bg-muted/30 rounded-xl p-3 border border-border/60">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Reordenação */}
                      <div className="flex flex-col">
                        <button onClick={() => moverStage(idx, -1)} disabled={idx === 0}
                          className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20"><ChevronUp size={14} /></button>
                        <button onClick={() => moverStage(idx, 1)} disabled={idx === cfg.stages.length - 1}
                          className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20"><ChevronDown size={14} /></button>
                      </div>
                      <GripVertical size={14} className="text-muted-foreground/30" />

                      {/* Cor + ícone */}
                      <div className="flex items-center gap-1.5">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: cor.bg, border: `1px solid ${cor.border}` }}>
                          <Icon size={14} style={{ color: cor.accent }} />
                        </div>
                      </div>

                      {/* Nome */}
                      <div className="flex-1 min-w-[140px]">
                        <input value={stage.label} onChange={e => updateStage(idx, 'label', e.target.value)}
                          className="w-full border border-border rounded-lg px-2.5 py-1.5 text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                      </div>

                      {/* Cor */}
                      <select value={stage.cor} onChange={e => updateStage(idx, 'cor', Number(e.target.value))}
                        className="border border-border rounded-lg px-2 py-1.5 text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                        {CORES.map((c, i) => <option key={i} value={i}>{c.label}</option>)}
                      </select>

                      {/* Ícone */}
                      <IconPicker value={stage.icone} onChange={name => updateStage(idx, 'icone', name)} />

                      {/* Excluir */}
                      <button onClick={() => removeStage(idx)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* Ações automáticas da etapa (múltiplas) */}
                    {(() => {
                      const opcoes = getAcoesEtapa(kanbanAtivo, acoesCfg).filter(a => a.key !== 'nenhuma');
                      const selecionadas = Array.isArray(stage.acoes) && stage.acoes.length > 0
                        ? stage.acoes
                        : (stage.acao && stage.acao !== 'nenhuma' ? [stage.acao] : []);
                      const disponiveis = opcoes.filter(o => !selecionadas.includes(o.key));
                      return (
                        <div className="mt-2.5 pl-1 flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Zap size={10} /> Ações ao entrar:</span>
                          {selecionadas.length === 0 && <span className="text-[10px] text-muted-foreground/50 italic">Nenhuma</span>}
                          {selecionadas.map(k => (
                            <span key={k} className="inline-flex items-center gap-1 text-[10px] bg-primary/10 text-primary border border-primary/25 px-2 py-0.5 rounded-full font-medium">
                              <Zap size={9} /> {opcoes.find(o => o.key === k)?.label || k}
                              <button onClick={() => setStageAcoes(idx, selecionadas.filter(x => x !== k))}
                                className="hover:text-destructive font-bold leading-none">×</button>
                            </span>
                          ))}
                          {disponiveis.length > 0 && (
                            <select value="" onChange={e => e.target.value && setStageAcoes(idx, [...selecionadas, e.target.value])}
                              className="border border-dashed border-border rounded-lg px-2 py-1 text-[11px] bg-background text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                              <option value="">+ Adicionar ação</option>
                              {disponiveis.map(a => <option key={a.key} value={a.key}>{a.label}</option>)}
                            </select>
                          )}
                        </div>
                      );
                    })()}

                    {/* Responsáveis */}
                    <div className="mt-2.5 pl-1 flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Users size={10} /> Responsáveis:</span>
                      {ROLES.map(r => {
                        const on = (stage.responsaveis || []).includes(r.key);
                        return (
                          <button key={r.key} onClick={() => toggleResponsavel(idx, r.key)}
                            className={`text-[10px] px-2 py-0.5 rounded-full border font-medium transition-all ${on ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:bg-muted'}`}>
                            {r.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {cfg.stages.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6 bg-muted/20 rounded-xl">Nenhuma etapa. Clique em "Adicionar etapa".</p>
              )}
            </div>
          </div>

          {/* AUTOMAÇÕES */}
          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-primary" />
                <p className="font-bold text-sm text-foreground">Regras de Automação</p>
              </div>
              <button onClick={addAuto} className="flex items-center gap-1.5 text-xs font-semibold text-primary border border-primary/30 bg-primary/5 px-3 py-1.5 rounded-lg hover:bg-primary/10 transition-colors">
                <Plus size={13} /> Nova regra
              </button>
            </div>

            <div className="space-y-2">
              {cfg.automacoes.map((auto, idx) => (
                <div key={idx} className="bg-muted/30 rounded-xl p-3 border border-border/60 flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Quando</span>
                  <select value={auto.trigger} onChange={e => updateAuto(idx, 'trigger', e.target.value)}
                    className="border border-border rounded-lg px-2.5 py-1.5 text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                    {getTriggersKanban(kanbanAtivo, regrasCfg).map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                  </select>
                  <ArrowRight size={13} className="text-muted-foreground/50" />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Executar</span>
                  <select value={auto.acao} onChange={e => updateAuto(idx, 'acao', e.target.value)}
                    className="border border-border rounded-lg px-2.5 py-1.5 text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary flex-1 min-w-[180px]">
                    {getAcoesAutomacao(kanbanAtivo, regrasCfg).map(a => <option key={a.key} value={a.key}>{a.label}</option>)}
                  </select>
                  <button onClick={() => updateAuto(idx, 'ativo', !auto.ativo)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${auto.ativo ? 'bg-green-100 text-green-700 border-green-300' : 'bg-muted text-muted-foreground border-border'}`}>
                    {auto.ativo ? 'Ativa' : 'Inativa'}
                  </button>
                  <button onClick={() => removeAuto(idx)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {cfg.automacoes.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6 bg-muted/20 rounded-xl">Nenhuma automação configurada.</p>
              )}
            </div>
          </div>

          {/* Salvar */}
          <div className="border-t border-border pt-4 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Alterações salvam no banco e aplicam-se imediatamente nos Kanbans.</p>
            <button onClick={salvar} disabled={saving}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${saved ? 'bg-green-500 text-white' : 'bg-primary text-primary-foreground hover:opacity-90'} disabled:opacity-50`}>
              <Save size={14} /> {saved ? 'Salvo!' : saving ? 'Salvando...' : 'Salvar Configurações'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}