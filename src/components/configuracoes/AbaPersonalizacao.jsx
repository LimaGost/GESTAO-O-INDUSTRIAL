import { useState, useRef } from 'react';
import { Save, Check, Building2 } from 'lucide-react';

function getEmpresa() {
  try { return JSON.parse(localStorage.getItem('empresa_config') || '{}'); } catch { return {}; }
}

function Section({ icon: Icon, title, desc, children }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-3">
        {Icon && <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center"><Icon size={16} className="text-primary" /></div>}
        <div>
          <p className="font-semibold text-foreground">{title}</p>
          {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function SaveButton({ onClick, saved, saving }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${saved ? 'bg-green-500 text-white' : 'bg-primary text-primary-foreground hover:opacity-90'}`}>
      {saved ? <><Check size={14} /> Salvo!</> : saving ? 'Salvando...' : <><Save size={14} /> Salvar</>}
    </button>
  );
}

function SecaoEmpresa() {
  const [form, setForm] = useState(() => ({
    nome: 'Raio do Sol',
    subtitulo: 'Artigos de Umbanda e Candomblé',
    cnpj: '',
    endereco: '',
    telefone: '',
    email: '',
    logo_url: '',
    ...getEmpresa(),
  }));
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const salvar = () => {
    localStorage.setItem('empresa_config', JSON.stringify(form));
    window.dispatchEvent(new Event('settings:saved'));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLogo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { base44 } = await import('@/api/base44Client');
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(prev => ({ ...prev, logo_url: file_url }));
    setUploading(false);
  };

  const textFields = [
    { key: 'nome', label: 'Nome da empresa' },
    { key: 'subtitulo', label: 'Subtítulo / ramo' },
    { key: 'cnpj', label: 'CNPJ' },
    { key: 'endereco', label: 'Endereço completo' },
    { key: 'telefone', label: 'Telefone' },
    { key: 'email', label: 'E-mail' },
  ];

  return (
    <Section icon={Building2} title="Dados da Empresa" desc="Informações usadas em relatórios e documentos">
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogo} />
      <div className="flex items-center gap-4 mb-2">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center overflow-hidden border border-border">
          {form.logo_url ? <img src={form.logo_url} alt="Logo" className="w-full h-full object-contain" /> : <span className="text-2xl">🏢</span>}
        </div>
        <div>
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="flex items-center gap-2 border border-border rounded-xl px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors disabled:opacity-50">
            {uploading ? 'Enviando...' : 'Escolher imagem'}
          </button>
          {form.logo_url && (
            <button onClick={() => setForm(prev => ({ ...prev, logo_url: '' }))} className="text-xs text-destructive hover:underline block mt-1">
              Remover logo
            </button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {textFields.map(({ key, label }) => (
          <div key={key}>
            <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
            <input value={form[key] || ''} onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
              className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
        ))}
      </div>
      <div className="bg-muted/30 rounded-xl px-4 py-3 flex items-center gap-3">
        {form.logo_url ? <img src={form.logo_url} alt="Logo" className="w-8 h-8 rounded-lg object-contain" /> : <span className="text-xl">🏢</span>}
        <span className="text-sm text-muted-foreground">Preview: <strong className="text-foreground">{form.nome}</strong> — {form.subtitulo}</span>
      </div>
      <SaveButton onClick={salvar} saved={saved} saving={false} />
    </Section>
  );
}

export default function AbaPersonalizacao() {
  return (
    <div className="space-y-5">
      <SecaoEmpresa />
    </div>
  );
}