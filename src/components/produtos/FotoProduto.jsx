import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Camera, Upload, X, Loader2 } from 'lucide-react';

/**
 * Componente de upload e exibição de foto do produto.
 * Props:
 *   fotoUrl    - URL atual da foto
 *   onUpload   - callback(url) quando uma nova foto é feita upload
 *   size       - 'sm' | 'md' (padrão md)
 *   readOnly   - boolean, só exibe a foto
 */
export default function FotoProduto({ fotoUrl, onUpload, size = 'md', readOnly = false }) {
  const [uploading, setUploading] = useState(false);
  const [expandida, setExpandida] = useState(false);
  const inputRef = useRef(null);

  const dim = size === 'sm'
    ? 'w-10 h-10 rounded-lg text-[10px]'
    : 'w-20 h-20 rounded-xl text-xs';

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setUploading(false);
    onUpload?.(file_url);
    e.target.value = '';
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
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setExpandida(false)}
          >
            <img
              src={fotoUrl}
              alt="Foto do produto"
              className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain"
            />
            <button
              onClick={() => setExpandida(false)}
              className="absolute top-4 right-4 w-9 h-9 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`${dim} relative cursor-pointer group border-2 border-dashed border-border hover:border-primary transition-colors overflow-hidden bg-muted flex items-center justify-center`}
        onClick={() => !uploading && inputRef.current?.click()}
      >
        {uploading ? (
          <Loader2 size={20} className="animate-spin text-muted-foreground" />
        ) : fotoUrl ? (
          <>
            <img src={fotoUrl} alt="Foto" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Upload size={16} className="text-white" />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground/60 p-2 text-center">
            <Camera size={size === 'sm' ? 14 : 20} />
            {size !== 'sm' && <span className="text-[10px] leading-tight">Foto</span>}
          </div>
        )}
      </div>

      {fotoUrl && !uploading && (
        <button
          type="button"
          onClick={() => onUpload?.(null)}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive transition-colors"
        >
          <X size={10} /> Remover
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}