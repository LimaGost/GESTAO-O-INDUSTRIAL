import { useState, useEffect } from 'react';
import { Save, Printer } from 'lucide-react';
import { loadConfig, saveConfig } from '@/lib/appConfig';

const TAMANHOS = [
  { key: '30x15_3col', label: '30 × 15 mm — 3 colunas (Elgin L42 Pro)' },
  { key: '100x50',  label: '100 × 50 mm' },
  { key: '100x75',  label: '100 × 75 mm' },
  { key: '100x100', label: '100 × 100 mm' },
  { key: 'custom',  label: 'Personalizado' },
];

const LINGUAGENS = [
  { key: 'html',  label: 'Impressão HTML (padrão)' },
  { key: 'pplb',  label: 'PPLB (Elgin L42 Pro / Bematech / Argox)' },
  { key: 'zpl',   label: 'ZPL (Zebra)' },
  { key: 'tspl',  label: 'TSPL (TSC)' },
  { key: 'epl',   label: 'EPL (Zebra legado)' },
];

export default function AbaEtiquetas() {
  const [cfg, setCfg] = useState({
    linguagem: 'html',
    tamanho: '100x50',
    largura_custom: '',
    altura_custom: '',
    ip_impressora: '',
    porta_impressora: '9100',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfig('etiqueta_impressora').then(val => {
      if (val) setCfg(prev => ({ ...prev, ...val }));
      else {
        const local = localStorage.getItem('etiqueta_impressora_config');
        if (local) try { setCfg(prev => ({ ...prev, ...JSON.parse(local) })); } catch {}
      }
      setLoading(false);
    });
  }, []);

  const salvar = async () => {
    setSaving(true);
    await saveConfig('etiqueta_impressora', cfg);
    localStorage.setItem('etiqueta_impressora_config', JSON.stringify(cfg));
    window.dispatchEvent(new Event('settings:saved'));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) return <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">Carregando...</div>;

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Printer size={18} className="text-primary" />
          </div>
          <div>
            <p className="font-bold text-sm text-foreground">Configuração de Etiquetas</p>
            <p className="text-xs text-muted-foreground">Defina o protocolo e tamanho da impressora de etiquetas.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Linguagem da Impressora</label>
            <select value={cfg.linguagem} onChange={e => setCfg(p => ({ ...p, linguagem: e.target.value }))}
              className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
              {LINGUAGENS.map(l => <option key={l.key} value={l.key}>{l.label}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Tamanho da Etiqueta</label>
            <select value={cfg.tamanho} onChange={e => setCfg(p => ({ ...p, tamanho: e.target.value }))}
              className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
              {TAMANHOS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
            {cfg.tamanho === '30x15_3col' && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
                🖨️ Bobina de 3 colunas (30×15mm cada, ~97mm de largura total). Para a Elgin/Bematech L42 Pro,
                selecione a linguagem <strong>PPLB</strong> acima e envie o arquivo .prn gerado direto para a impressora
                (ou use Impressão HTML pelo driver do Windows com página de 97×15mm).
              </p>
            )}
          </div>

          {cfg.tamanho === 'custom' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Largura (mm)</label>
                <input type="number" value={cfg.largura_custom} onChange={e => setCfg(p => ({ ...p, largura_custom: e.target.value }))}
                  placeholder="100"
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Altura (mm)</label>
                <input type="number" value={cfg.altura_custom} onChange={e => setCfg(p => ({ ...p, altura_custom: e.target.value }))}
                  placeholder="50"
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
          )}

          {cfg.linguagem !== 'html' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block font-medium">IP da Impressora</label>
                <input value={cfg.ip_impressora} onChange={e => setCfg(p => ({ ...p, ip_impressora: e.target.value }))}
                  placeholder="192.168.1.100"
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Porta</label>
                <input value={cfg.porta_impressora} onChange={e => setCfg(p => ({ ...p, porta_impressora: e.target.value }))}
                  placeholder="9100"
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
          )}
        </div>

        <button onClick={salvar} disabled={saving}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${saved ? 'bg-green-500 text-white' : 'bg-primary text-primary-foreground hover:opacity-90'} disabled:opacity-50`}>
          <Save size={14} /> {saved ? 'Salvo!' : saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </div>
  );
}