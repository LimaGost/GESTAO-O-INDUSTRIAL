import { useState } from 'react';
import { X, Check, Loader2, Building2, Upload } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function ModalClienteWL({ cliente, onSalvar, onClose }) {
  const [form, setForm] = useState({
    razao_social: cliente?.razao_social || '',
    nome_fantasia: cliente?.nome_fantasia || '',
    cnpj: cliente?.cnpj || '',
    responsavel: cliente?.responsavel || '',
    telefone: cliente?.telefone || '',
    email: cliente?.email || '',
    endereco: cliente?.endereco || '',
    logotipo_url: cliente?.logotipo_url || '',
    manual_identidade_url: cliente?.manual_identidade_url || '',
    observacoes: cliente?.observacoes || '',
    ativo: cliente?.ativo !== false,
  });
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleUploadLogo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set('logotipo_url', file_url);
    setUploadingLogo(false);
  };

  const handleSalvar = async () => {
    if (!form.razao_social.trim()) { alert('Razão Social é obrigatória.'); return; }
    setLoading(true);
    await onSalvar(form);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center">
              <Building2 size={15} className="text-purple-600" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">{cliente ? 'Editar Cliente WL' : 'Novo Cliente White Label'}</h3>
              <p className="text-xs text-muted-foreground">{cliente?.nome_fantasia || 'Preencha os dados abaixo'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Logotipo */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Logotipo da Marca</p>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/30">
                {form.logotipo_url
                  ? <img src={form.logotipo_url} alt="logo" className="w-full h-full object-contain p-1" />
                  : <Building2 size={24} className="text-muted-foreground/40" />
                }
              </div>
              <div className="flex-1">
                <label className="flex items-center gap-2 cursor-pointer border border-border rounded-xl px-4 py-2.5 text-sm text-muted-foreground hover:bg-muted transition-colors w-fit">
                  {uploadingLogo ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  {uploadingLogo ? 'Enviando...' : 'Enviar Logotipo'}
                  <input type="file" accept="image/*" className="hidden" onChange={handleUploadLogo} disabled={uploadingLogo} />
                </label>
                {form.logotipo_url && (
                  <button onClick={() => set('logotipo_url', '')} className="mt-1.5 text-xs text-red-500 hover:underline">Remover</button>
                )}
              </div>
            </div>
          </div>

          {/* Dados da empresa */}
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Dados da Empresa</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground mb-1 block">Razão Social *</label>
                <input value={form.razao_social} onChange={e => set('razao_social', e.target.value)}
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground mb-1 block">Nome Fantasia</label>
                <input value={form.nome_fantasia} onChange={e => set('nome_fantasia', e.target.value)}
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">CNPJ</label>
                <input value={form.cnpj} onChange={e => set('cnpj', e.target.value)}
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Responsável</label>
                <input value={form.responsavel} onChange={e => set('responsavel', e.target.value)}
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Telefone</label>
                <input value={form.telefone} onChange={e => set('telefone', e.target.value)}
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">E-mail</label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground mb-1 block">Endereço</label>
                <input value={form.endereco} onChange={e => set('endereco', e.target.value)}
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Observações</label>
            <textarea rows={3} value={form.observacoes} onChange={e => set('observacoes', e.target.value)}
              className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
          </div>

          {/* Ações */}
          <div className="flex gap-3 pt-1">
            <button onClick={handleSalvar} disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 bg-purple-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity">
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
              {loading ? 'Salvando...' : 'Salvar Cliente'}
            </button>
            <button onClick={onClose} className="px-5 border border-border rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}