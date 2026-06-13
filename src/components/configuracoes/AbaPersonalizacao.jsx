import { useState, useEffect, useRef } from 'react';
import { Save, Paintbrush, Upload, Building2, Phone, Mail, Globe, MapPin, FileText, CreditCard, RefreshCw } from 'lucide-react';
import { loadConfig, saveConfig } from '@/lib/appConfig';
import { base44 } from '@/api/base44Client';

const CAMPOS = [
  { key: 'nome',          label: 'Razão Social',         placeholder: 'Ex: Raio do Sol Indústria Ltda', icon: Building2 },
  { key: 'nome_fantasia', label: 'Nome Fantasia',         placeholder: 'Ex: Raio do Sol',               icon: Building2 },
  { key: 'cnpj',          label: 'CNPJ',                  placeholder: '00.000.000/0001-00',             icon: CreditCard },
  { key: 'ie',            label: 'Insc. Estadual',        placeholder: '000.000.000.000',               icon: FileText },
  { key: 'im',            label: 'Insc. Municipal',       placeholder: '000000',                        icon: FileText },
  { key: 'telefone',      label: 'Telefone / WhatsApp',   placeholder: '(61) 99999-9999',               icon: Phone },
  { key: 'email',         label: 'E-mail',                placeholder: 'contato@empresa.com.br',        icon: Mail },
  { key: 'site',          label: 'Site',                  placeholder: 'www.empresa.com.br',            icon: Globe },
];

const ENDERECOS = [
  { key: 'endereco',      label: 'Logradouro',            placeholder: 'Rua / Av., Nº',                 icon: MapPin },
  { key: 'bairro',        label: 'Bairro',                placeholder: 'Centro',                        icon: MapPin },
  { key: 'cidade',        label: 'Cidade / UF',           placeholder: 'Brasília – DF',                 icon: MapPin },
  { key: 'cep',           label: 'CEP',                   placeholder: '70000-000',                     icon: MapPin },
];

const DEFAULT_LOGO = 'https://media.base44.com/images/public/69ece9d5634df8be56451712/43d0f422a_454646495_1576721726386277_6990662151677958976_n.jpg';

export default function AbaPersonalizacao() {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    Promise.all([
      loadConfig('empresa_config'),
      loadConfig('empresa_info'),
    ]).then(([novo, antigo]) => {
      if (novo && Object.keys(novo).length > 0) {
        setForm(novo);
      } else if (antigo) {
        // migra dados antigos para o novo schema
        setForm({
          nome: antigo.nome_empresa || '',
          nome_fantasia: antigo.nome_empresa || '',
          logo_url: antigo.logo_url || '',
          cnpj: antigo.cnpj_endereco || '',
        });
      }
      setLoading(false);
    });
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const salvar = async () => {
    setSaving(true);
    // salva no novo key
    await saveConfig('empresa_config', form);
    // mantém compatibilidade com o key antigo (empresa_info) usado em outros lugares
    await saveConfig('empresa_info', {
      nome_empresa: form.nome || form.nome_fantasia || '',
      logo_url: form.logo_url || '',
      cnpj_endereco: form.cnpj || '',
    });
    localStorage.setItem('empresa_config', JSON.stringify(form));
    window.dispatchEvent(new Event('settings:saved'));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set('logo_url', file_url);
    setUploading(false);
  };

  if (loading) return <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">Carregando...</div>;

  return (
    <div className="space-y-4 max-w-2xl">

      {/* Logo */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Paintbrush size={16} className="text-primary" />
          </div>
          <div>
            <p className="font-bold text-sm text-foreground">Logo da Empresa</p>
            <p className="text-xs text-muted-foreground">Aparece em etiquetas, NF e documentos de transporte.</p>
          </div>
        </div>

        <div className="flex items-center gap-5 flex-wrap">
          <div className="w-24 h-24 rounded-2xl border-2 border-border overflow-hidden flex items-center justify-center bg-muted/30 flex-shrink-0">
            <img
              src={form.logo_url || DEFAULT_LOGO}
              alt="Logo"
              className="w-full h-full object-contain"
              onError={e => { e.target.src = DEFAULT_LOGO; }}
            />
          </div>
          <div className="flex flex-col gap-2 flex-1 min-w-0">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-primary/40 rounded-xl text-sm font-semibold text-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
            >
              {uploading ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
              {uploading ? 'Enviando...' : 'Fazer upload do meu dispositivo'}
            </button>
            <input
              value={form.logo_url || ''}
              onChange={e => set('logo_url', e.target.value)}
              placeholder="Ou cole uma URL de imagem aqui..."
              className="w-full border border-border rounded-xl px-3 py-2 text-xs bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            <p className="text-[10px] text-muted-foreground">PNG, JPG ou SVG. Fundo transparente recomendado.</p>
          </div>
        </div>
      </div>

      {/* Dados da empresa */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-sky-500/10 flex items-center justify-center">
            <Building2 size={16} className="text-sky-600" />
          </div>
          <div>
            <p className="font-bold text-sm text-foreground">Dados da Empresa</p>
            <p className="text-xs text-muted-foreground">Usados em NF, documentos de transporte e etiquetas.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CAMPOS.map(({ key, label, placeholder, icon: Icon }) => (
            <div key={key} className={key === 'nome' || key === 'nome_fantasia' ? 'sm:col-span-2' : ''}>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5 block">
                <Icon size={11} /> {label}
              </label>
              <input
                value={form[key] || ''}
                onChange={e => set(key, e.target.value)}
                placeholder={placeholder}
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Endereço */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-green-500/10 flex items-center justify-center">
            <MapPin size={16} className="text-green-600" />
          </div>
          <div>
            <p className="font-bold text-sm text-foreground">Endereço</p>
            <p className="text-xs text-muted-foreground">Endereço completo para documentos fiscais.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ENDERECOS.map(({ key, label, placeholder, icon: Icon }) => (
            <div key={key} className={key === 'endereco' ? 'sm:col-span-2' : ''}>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5 block">
                <Icon size={11} /> {label}
              </label>
              <input
                value={form[key] || ''}
                onChange={e => set(key, e.target.value)}
                placeholder={placeholder}
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Preview */}
      {(form.nome || form.cnpj) && (
        <div className="bg-muted/30 border border-border rounded-2xl p-5">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Preview — como aparece nos documentos</p>
          <div className="flex items-center gap-4 bg-white border border-border rounded-xl px-4 py-3">
            {form.logo_url && (
              <img src={form.logo_url} alt="Logo" className="w-12 h-12 object-contain flex-shrink-0" />
            )}
            <div className="min-w-0">
              <p className="font-bold text-sm text-foreground">{form.nome || form.nome_fantasia || '—'}</p>
              {form.nome_fantasia && form.nome && <p className="text-xs text-muted-foreground">{form.nome_fantasia}</p>}
              {form.cnpj && <p className="text-xs text-muted-foreground">CNPJ: {form.cnpj}</p>}
              {(form.endereco || form.cidade) && <p className="text-xs text-muted-foreground">{[form.endereco, form.bairro, form.cidade, form.cep].filter(Boolean).join(' — ')}</p>}
              {(form.telefone || form.email) && <p className="text-xs text-muted-foreground">{[form.telefone, form.email].filter(Boolean).join(' · ')}</p>}
            </div>
          </div>
        </div>
      )}

      <button
        onClick={salvar}
        disabled={saving}
        className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all shadow-sm ${saved ? 'bg-green-500 text-white' : 'bg-primary text-primary-foreground hover:opacity-90'} disabled:opacity-50`}
      >
        <Save size={14} /> {saved ? '✓ Salvo com sucesso!' : saving ? 'Salvando...' : 'Salvar Informações'}
      </button>
    </div>
  );
}