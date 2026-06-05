import { useState, useEffect } from 'react';
import { Save, Truck, GripVertical } from 'lucide-react';
import { loadConfig, saveConfig } from '@/lib/appConfig';

export const COLUNAS_DEFAULT = [
  { key: 'a_expedir', label: 'A Expedir',   cor: 4, desc: 'OPs prontas para NF',  fixo: true },
  { key: 'emitida',   label: 'NF Emitida',  cor: 1, desc: 'Aguardando envio',      fixo: true },
  { key: 'enviada',   label: 'Em Trânsito', cor: 3, desc: 'Em rota de entrega',    fixo: true },
  { key: 'entregue',  label: 'Entregue',    cor: 2, desc: 'Entrega confirmada',    fixo: true },
];

const CORES_OPCOES = [
  { label: 'Cinza',    valor: '#64748B' },
  { label: 'Azul',     valor: '#3B82F6' },
  { label: 'Verde',    valor: '#22C55E' },
  { label: 'Amarelo',  valor: '#F59E0B' },
  { label: 'Roxo',     valor: '#A855F7' },
  { label: 'Vermelho', valor: '#EF4444' },
  { label: 'Laranja',  valor: '#F97316' },
  { label: 'Teal',     valor: '#14B8A6' },
];

export default function AbaExpedicao() {
  const [colunas, setColunas] = useState(COLUNAS_DEFAULT);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfig('expedicao_colunas').then(val => {
      if (val && Array.isArray(val.colunas) && val.colunas.length > 0) {
        setColunas(val.colunas);
      } else {
        const local = localStorage.getItem('expedicao_colunas_config');
        if (local) try { const p = JSON.parse(local); if (Array.isArray(p)) setColunas(p); } catch {}
      }
      setLoading(false);
    });
  }, []);

  const salvar = async () => {
    setSaving(true);
    await saveConfig('expedicao_colunas', { colunas });
    localStorage.setItem('expedicao_colunas_config', JSON.stringify(colunas));
    window.dispatchEvent(new CustomEvent('expedicao:settings:saved'));
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
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
            <Truck size={18} className="text-purple-600" />
          </div>
          <div>
            <p className="font-bold text-sm text-foreground">Colunas do Kanban de Expedição</p>
            <p className="text-xs text-muted-foreground">Configure os nomes e cores das etapas de expedição.</p>
          </div>
        </div>

        <div className="space-y-3">
          {colunas.map((col, idx) => (
            <div key={col.key} className="flex items-center gap-3 bg-muted/30 rounded-xl px-3 py-3 flex-wrap">
              <GripVertical size={14} className="text-muted-foreground/40 flex-shrink-0" />

              <div className="flex-1 min-w-[140px]">
                <label className="text-[10px] text-muted-foreground mb-1 block">Nome</label>
                <input value={col.label} onChange={e => update(idx, 'label', e.target.value)}
                  disabled={col.fixo}
                  className="w-full border border-border rounded-lg px-2.5 py-1.5 text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed" />
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

              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Descrição</label>
                <input value={col.desc || ''} onChange={e => update(idx, 'desc', e.target.value)}
                  className="w-full border border-border rounded-lg px-2.5 py-1.5 text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>

              <div
                className="w-5 h-5 rounded-full flex-shrink-0 border border-border mt-4"
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