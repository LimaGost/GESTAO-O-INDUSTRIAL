import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Plus, Trash2, Save, CheckSquare, ChevronDown,
  Settings2, GripVertical, Shield, Search,
  RefreshCw, User, Tag, Activity, AlertTriangle, Users, Factory, Paintbrush, Printer, Database
} from 'lucide-react';
import AbaUsuarios from '@/components/configuracoes/AbaUsuarios';
import AbaPersonalizacao from '@/components/configuracoes/AbaPersonalizacao';
import AbaEtiquetas from '@/components/configuracoes/AbaEtiquetas';
import { usePermissoes } from '@/lib/usePermissoes.jsx';

const ETAPAS_BASE = [
  { key: 'a_produzir', defaultLabel: 'A Produzir', badge: 'bg-slate-100 text-slate-600' },
  { key: 'em_producao', defaultLabel: 'Em Produção', badge: 'bg-sky-100 text-sky-700' },
  { key: 'produzido', defaultLabel: 'Produzido', badge: 'bg-green-100 text-green-700' },
  { key: 'em_embalagem', defaultLabel: 'Em Embalagem', badge: 'bg-amber-100 text-amber-700' },
];

function getKanbanLabels() {
  try { return JSON.parse(localStorage.getItem('kanban_labels') || '{}'); } catch { return {}; }
}

function buildEtapas() {
  const labels = getKanbanLabels();
  return ETAPAS_BASE.map(e => ({ ...e, label: labels[e.key] || e.defaultLabel }));
}

// ── ChecklistEditor ──────────────────────────────────────────────────────────

function ChecklistEditor({ itens, onAdd, onRemove, onSave, saving, inputValue, onInputChange, placeholder }) {
  return (
    <>
      {itens.length > 0 ? (
        <div className="space-y-1.5 mb-3">
          {itens.map((item, idx) => (
            <div key={idx} className="group flex items-center gap-2 px-3 py-2 bg-muted/40 rounded-xl">
              <GripVertical size={13} className="text-muted-foreground/40 flex-shrink-0" />
              <span className="text-sm text-foreground flex-1">{item}</span>
              <button onClick={() => onRemove(idx)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded-md transition-all">
                <Trash2 size={11} className="text-destructive" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic py-2 mb-3">Nenhuma verificação. Adicione abaixo.</p>
      )}
      <div className="flex gap-2">
        <input
          value={inputValue}
          onChange={e => onInputChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onAdd()}
          placeholder={placeholder}
          className="flex-1 border border-border rounded-xl px-3.5 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground/50"
        />
        <button onClick={onSave}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
          <Save size={13} /> {saving ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </div>
    </>
  );
}

function SubItem({ icon: Icon, iconBg, iconColor, title, badge, badgeClass, open, onToggle, children }) {
  return (
    <div className="border border-border rounded-2xl overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-muted/30 transition-colors">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          <Icon size={15} className={iconColor} />
        </div>
        <span className="flex-1 text-sm font-semibold text-foreground">{title}</span>
        {badge !== undefined && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeClass}`}>
            {badge} {badge === 1 ? 'item' : 'itens'}
          </span>
        )}
        <ChevronDown size={15} className={`text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-border pt-4">
          {children}
        </div>
      )}
    </div>
  );
}

// ── Aba: Checklists ──────────────────────────────────────────────────────────

function AbaChecklists() {
  const [configs, setConfigs] = useState({});
  const [saving, setSaving] = useState(null);
  const [newItem, setNewItem] = useState({});
  const [openEtapa, setOpenEtapa] = useState(null);
  const [etapas, setEtapas] = useState(buildEtapas);

  useEffect(() => {
    const onSettings = () => setEtapas(buildEtapas());
    window.addEventListener('settings:saved', onSettings);
    return () => window.removeEventListener('settings:saved', onSettings);
  }, []);

  useEffect(() => {
    base44.entities.ChecklistConfig.list().then(data => {
      const map = {};
      for (const d of data) map[d.etapa] = d;
      setConfigs(map);
    });
  }, []);

  const addItem = (etapa) => {
    const texto = (newItem[etapa] || '').trim();
    if (!texto) return;
    const config = configs[etapa] || { etapa, itens: [] };
    setConfigs(prev => ({ ...prev, [etapa]: { ...config, itens: [...(config.itens || []), texto] } }));
    setNewItem(prev => ({ ...prev, [etapa]: '' }));
  };

  const removeItem = (etapa, idx) => {
    const config = configs[etapa];
    if (!config) return;
    setConfigs(prev => ({ ...prev, [etapa]: { ...config, itens: config.itens.filter((_, i) => i !== idx) } }));
  };

  const save = async (etapa) => {
    setSaving(etapa);
    const config = configs[etapa] || { etapa, itens: [] };
    if (config.id) {
      await base44.entities.ChecklistConfig.update(config.id, { etapa, itens: config.itens });
    } else {
      const created = await base44.entities.ChecklistConfig.create({ etapa, itens: config.itens });
      setConfigs(prev => ({ ...prev, [etapa]: created }));
    }
    setSaving(null);
  };

  const totalItens = etapas.reduce((s, e) => s + (configs[e.key]?.itens?.length || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-green-100 flex items-center justify-center">
          <CheckSquare size={15} className="text-green-600" />
        </div>
        <div>
          <p className="font-semibold text-foreground">Checklist por Etapa do Kanban</p>
          <p className="text-xs text-muted-foreground">
            {totalItens} verificaç{totalItens === 1 ? 'ão' : 'ões'} configurada{totalItens === 1 ? '' : 's'} em {etapas.length} etapas
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {etapas.map(({ key, label, badge }) => {
          const itens = configs[key]?.itens || [];
          const isOpen = openEtapa === key;
          return (
            <SubItem key={key} icon={CheckSquare} iconBg="bg-green-100" iconColor="text-green-600"
              title={label} badge={itens.length} badgeClass={badge}
              open={isOpen} onToggle={() => setOpenEtapa(isOpen ? null : key)}>
              <ChecklistEditor
                itens={itens}
                onAdd={() => addItem(key)}
                onRemove={(idx) => removeItem(key, idx)}
                onSave={() => save(key)}
                saving={saving === key}
                inputValue={newItem[key] || ''}
                onInputChange={(v) => setNewItem(prev => ({ ...prev, [key]: v }))}
                placeholder={`Nova verificação para "${label}"...`}
              />
            </SubItem>
          );
        })}
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

const ABAS = [
  { key: 'personalizacao', label: 'Personalização', icon: Paintbrush },
  { key: 'checklists', label: 'Checklists', icon: CheckSquare },
  { key: 'etiquetas', label: 'Etiquetas', icon: Printer },
  { key: 'usuarios', label: 'Usuários', icon: Users },
];

export default function Configuracoes() {
  const { temAcesso } = usePermissoes();
  const [aba, setAba] = useState('personalizacao');

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center">
          <Settings2 size={19} className="text-slate-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Configurações</h2>
          <p className="text-xs text-muted-foreground">Gerencie o sistema</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-2xl overflow-x-auto flex-wrap md:flex-nowrap">
        {ABAS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setAba(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${aba === key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            <Icon size={13} />{label}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      {aba === 'personalizacao' && <AbaPersonalizacao />}
      {aba === 'checklists' && <AbaChecklists />}
      {aba === 'etiquetas' && <AbaEtiquetas />}
      {aba === 'usuarios' && <AbaUsuarios />}
    </div>
  );
}