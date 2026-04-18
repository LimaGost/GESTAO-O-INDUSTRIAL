import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Camera, Upload, X, Loader2 } from 'lucide-react';

export default function FotoProduto({ fotoUrl, onUpload, size = 'md', readOnly = false }) {
  const [uploading, setUploading] = useState(false);
  const [expandida, setExpandida] = useState(false);
  const inputRef = useRef(null);

  const dim = size === 'sm' ? 'w-10 h-10 rounded-lg' : 'w-20 h-20 rounded-xl';

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
        {fotoUrl
          ? <img src={fotoUrl} alt="Foto" onClick={() => setExpandida(true)} className={`${dim} object-cover border border-border flex-shrink-0 cursor-zoom-in hover:opacity-80 transition-opacity`} />
          : <div className={`${dim} bg-muted flex items-center justify-center flex-shrink-0`}><Camera size={size === 'sm' ? 12 : 18} className="text-muted-foreground" /></div>
        }
        {expandida && fotoUrl && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4" onClick={() => setExpandida(false)}>
            <img src={fotoUrl} alt="Foto" className="max-w-full max-h-full rounded-xl object-contain" />
            <button onClick={() => setExpandida(false)} className="absolute top-4 right-4 w-9 h-9 bg-black/50 rounded-full flex items-center justify-center text-white">
              <X size={16} />
            </button>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="space-y-2">
      <button onClick={() => !uploading && inputRef.current?.click()}
        className={`${dim} border-2 border-dashed border-border flex items-center justify-center flex-shrink-0 hover:bg-muted/30 transition-colors overflow-hidden`}>
        {uploading
          ? <Loader2 size={18} className="animate-spin text-muted-foreground" />
          : fotoUrl
          ? <img src={fotoUrl} alt="Foto" className="w-full h-full object-cover" />
          : <div className="flex flex-col items-center gap-0.5"><Upload size={14} className="text-muted-foreground" />{size !== 'sm' && <span className="text-[9px] text-muted-foreground">Foto</span>}</div>
        }
      </button>
      {fotoUrl && !uploading && (
        <button onClick={() => onUpload?.(null)} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive transition-colors">
          <X size={10} /> Remover
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}