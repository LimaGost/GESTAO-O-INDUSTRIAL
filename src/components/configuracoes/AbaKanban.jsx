import { useState, useEffect } from 'react';
import { Save, Plus, Trash2, GripVertical, Columns } from 'lucide-react';
import { loadConfig, saveConfig } from '@/lib/appConfig';

export const COLUNAS_DEFAULT = [
  { key: 'a_produzir',   label: 'A Produzir',    cor: 0, icone: 'Clock',       acao: 'nenhuma' },
  { key: 'em_producao',  label: 'Em Produção',   cor: 1, icone: 'Factory',     acao: 'registrar_data_inicio' },
  { key: 'produzido',    label: 'Produzido',     cor: 2, icone: 'CheckCircle', acao: 'registrar_data_fim_producao' },
  { key: 'em_embalagem', label: 'Em Embalagem',  cor: 3, icone: 'Package',     acao: 'registrar_data_embalagem' },
  { key: 'em_separacao', label: 'Em Separação',  cor: 7, icone: 'Layers',      acao: 'saida_estoque' },
  { key: 'finalizado',   label: 'Finalizado',    cor: 4, icone: 'Flag',        acao: 'finalizar_expedicao' },
];

const CORES_OPCOES = [
  { label: 'Cinza',    valor: '#64748B' },
  { label: 'Azul',     valor: '#0EA5E9' },
  { label: 'Verde',    valor: '#22C55E' },
  { label: 'Amarelo',  valor: '#F59E0B' },
  { label: 'Roxo',     valor: '#A855F7' },
  { label: 'Vermelho', valor: '#EF4444' },
  { label: 'Laranja',  valor: '#F97316' },
  { label: 'Teal',     valor: '#14B8A6' },
];

const ACOES = [
  { key: 'nenhuma',                    label: 'Nenhuma' },
  { key: 'registrar_data_inicio',      label: 'Registrar Data Início' },
  { key: 'registrar_data_fim_producao',label: 'Registrar Data Fim Produção' },
  { key: 'registrar_data_embalagem',   label: 'Registrar Data Embalagem' },
  { key: 'saida_estoque',              label: 'Saída de Estoque' },
  { key: 'finalizar_expedicao',        label: 'Finalizar / Expedição' },
];

const ICONES = ['Clock','Factory','CheckCircle','Package','Flag','Layers','Archive','Truck'];

export default function AbaKanban() {
  const [colunas, setColunas] = useState(COLUNAS_DEFAULT);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfig('kanban_colunas').then(val => {
      if (val && Array.isArray(val.colunas) && val.colunas.length > 0) {
        setColunas(val.colunas);
      } else {
        const local = localStorage.getItem('kanban_colunas_config');
        if (local) {
          try { const parsed = JSON.parse(local); if (Array.isArray(parsed)) setColunas(parsed); } catch {}
        }
      }
      setLoading(false);
    });
  }, []);

  const salvar = async () => {
    setSaving(true);
    await saveConfig('kanban_colunas', { colunas });
    localStorage.setItem('kanban_colunas_config', JSON.stringify(colunas));
    window.dispatchEvent(new Event('settings:saved'));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const update = (idx, field, val) => setColunas(prev => prev.map((c, i) => i === idx ? { ...c, [field]: val } : c));

  if (loading) return <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">Carregando...</div>;

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Columns size={18} className="text-primary" />
          </div>
          <div>
            <p className="font-bold text-sm text-foreground">Colunas do Kanban de Produção</p>
            <p className="text-xs text-muted-foreground">Configure as etapas, cores e ações de cada coluna.</p>
          </div>
        </div>

        <div className="space-y-3">
          {colunas.map((col, idx) => (
            <div key={idx} className="flex items-center gap-3 bg-muted/30 rounded-xl px-3 py-3 flex-wrap">
              <GripVertical size={14} className="text-muted-foreground/40 flex-shrink-0" />

              <div className="flex-1 min-w-[140px]">
                <label className="text-[10px] text-muted-foreground mb-1 block">Nome</label>
                <input value={col.label} onChange={e => update(idx, 'label', e.target.value)}
                  className="w-full border border-border rounded-lg px-2.5 py-1.5 text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>

              <div className="w-28">
                <label className="text-[10px] text-muted-foreground mb-1 block">Cor</label>
                <select value={col.cor} onChange={e => update(idx, 'cor', Number(e.target.value))}
                  className="w-full border border-border rounded-lg px-2 py-1.5 text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                  {CORES_OPCOES.map((c, i) => (
                    <option key={i} value={i}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div className="w-44">
                <label className="text-[10px] text-muted-foreground mb-1 block">Ação ao entrar</label>
                <select value={col.acao} onChange={e => update(idx, 'acao', e.target.value)}
                  className="w-full border border-border rounded-lg px-2 py-1.5 text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                  {ACOES.map(a => <option key={a.key} value={a.key}>{a.label}</option>)}
                </select>
              </div>

              <div
                className="w-5 h-5 rounded-full flex-shrink-0 border border-border"
                style={{ background: CORES_OPCOES[col.cor]?.valor || '#64748B' }}
              />
            </div>
          ))}
        </div>

        <button onClick={salvar} disabled={saving}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${saved ? 'bg-green-500 text-white' : 'bg-primary text-primary-foreground hover:opacity-90'} disabled:opacity-50`}>
          <Save size={14} /> {saved ? 'Salvo!' : saving ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </div>
    </div>
  );
}