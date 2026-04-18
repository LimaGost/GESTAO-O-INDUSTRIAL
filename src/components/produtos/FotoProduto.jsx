import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Camera, Upload, X, Loader2, ImagePlus } from 'lucide-react';

export default function FotoProduto({ fotoUrl, onUpload, size = 'md', readOnly = false }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [expandida, setExpandida] = useState(false);
  const inputRef = useRef(null);

  const dim = size === 'sm'
    ? 'w-10 h-10 rounded-lg'
    : size === 'lg'
    ? 'w-full h-40 rounded-xl'
    : 'w-24 h-24 rounded-xl';

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Imagem muito grande. Máximo 5MB.');
      return;
    }
    setError('');
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onUpload?.(file_url);
    } catch {
      setError('Falha ao enviar. Tente novamente.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  if (readOnly) {
    return (
      <>
        {fotoUrl ? (
          <img
            src={fotoUrl}
            alt="Foto do produto"
            onClick={() => setExpandida(true)}
            className={`${dim} object-cover border border-border flex-shrink-0 cursor-zoom-in hover:opacity-80 transition-opacity`}
          />
        ) : (
          <div className={`${dim} bg-muted flex items-center justify-center flex-shrink-0 border border-border`}>
            <Camera size={size === 'sm' ? 12 : 18} className="text-muted-foreground/40" />
          </div>
        )}
        {expandida && fotoUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setExpandida(false)}>
            <img src={fotoUrl} alt="Foto" className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain" />
            <button onClick={() => setExpandida(false)} className="absolute top-4 right-4 w-9 h-9 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white">
              <X size={18} />
            </button>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="space-y-1.5">
      <div
        className={`${dim} relative cursor-pointer group border-2 border-dashed border-border hover:border-primary transition-colors overflow-hidden bg-muted/50 flex items-center justify-center`}
        onClick={() => !uploading && inputRef.current?.click()}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 size={22} className="animate-spin" />
            <span className="text-[10px]">Enviando...</span>
          </div>
        ) : fotoUrl ? (
          <>
            <img src={fotoUrl} alt="Foto" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
              <Upload size={18} className="text-white" />
              <span className="text-white text-[10px] font-medium">Alterar foto</span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground/60 p-3 text-center">
            <ImagePlus size={size === 'lg' ? 28 : 20} />
            <span className="text-[10px] leading-tight">Clique para adicionar foto</span>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
        >
          <Upload size={11} /> {fotoUrl ? 'Alterar' : 'Adicionar foto'}
        </button>
        {fotoUrl && (
          <button type="button" onClick={() => onUpload?.(null)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors">
            <X size={11} /> Remover
          </button>
        )}
      </div>

      {error && <p className="text-[10px] text-destructive">{error}</p>}

      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleFile} />
    </div>
  );
}