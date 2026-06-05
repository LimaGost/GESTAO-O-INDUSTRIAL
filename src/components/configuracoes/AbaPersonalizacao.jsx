import { useState, useEffect } from 'react';
import { Save, Paintbrush } from 'lucide-react';
import { loadConfig, saveConfig } from '@/lib/appConfig';

export default function AbaPersonalizacao() {
  const [form, setForm] = useState({ nome_empresa: '', logo_url: '', cor_primaria: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfig('empresa_info').then(val => {
      if (val) setForm(f => ({ ...f, ...val }));
      setLoading(false);
    });
  }, []);

  const salvar = async () => {
    setSaving(true);
    await saveConfig('empresa_info', form);
    localStorage.setItem('empresa_info', JSON.stringify(form));
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
            <Paintbrush size={18} className="text-primary" />
          </div>
          <div>
            <p className="font-bold text-sm text-foreground">Informações da Empresa</p>
            <p className="text-xs text-muted-foreground">Personalize o nome e identidade visual do sistema.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Nome da Empresa</label>
            <input
              value={form.nome_empresa}
              onChange={e => setForm(f => ({ ...f, nome_empresa: e.target.value }))}
              placeholder="Ex: Raio do Sol"
              className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block font-medium">URL do Logo</label>
            <input
              value={form.logo_url}
              onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))}
              placeholder="https://..."
              className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {form.logo_url && (
              <div className="mt-2 w-16 h-16 border border-border rounded-xl overflow-hidden">
                <img src={form.logo_url} alt="Logo" className="w-full h-full object-contain" />
              </div>
            )}
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block font-medium">CNPJ / Endereço (para NF)</label>
            <input
              value={form.cnpj_endereco || ''}
              onChange={e => setForm(f => ({ ...f, cnpj_endereco: e.target.value }))}
              placeholder="CNPJ: 00.000.000/0001-00 — Rua..."
              className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <button
          onClick={salvar}
          disabled={saving}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${saved ? 'bg-green-500 text-white' : 'bg-primary text-primary-foreground hover:opacity-90'} disabled:opacity-50`}
        >
          <Save size={14} /> {saved ? 'Salvo!' : saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </div>
  );
}