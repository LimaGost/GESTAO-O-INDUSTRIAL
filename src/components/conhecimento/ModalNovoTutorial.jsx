import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Upload, Video, Loader2 } from 'lucide-react';

export const MODULOS_SISTEMA = [
  'Primeiros Passos', 'Dashboard', 'Pedidos', 'Kanban Produção', 'Separação',
  'Estoque', 'Etiquetas', 'Expedição', 'Clientes', 'Produtos', 'Relatórios', 'Configurações', 'Outros',
];

export default function ModalNovoTutorial({ tutorial, onSalvo, onClose }) {
  const [titulo, setTitulo] = useState(tutorial?.titulo || '');
  const [descricao, setDescricao] = useState(tutorial?.descricao || '');
  const [modulo, setModulo] = useState(tutorial?.modulo || 'Primeiros Passos');
  const [videoUrl, setVideoUrl] = useState(tutorial?.video_url || '');
  const [enviando, setEnviando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErro('');
    setEnviando(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setVideoUrl(file_url);
    } catch {
      setErro('Falha ao enviar o vídeo. Tente novamente.');
    }
    setEnviando(false);
  };

  const salvar = async () => {
    if (!titulo.trim() || !videoUrl) { setErro('Informe o título e envie o vídeo.'); return; }
    setSalvando(true);
    const dados = { titulo: titulo.trim(), descricao, modulo, video_url: videoUrl, ativo: true };
    if (tutorial?.id) await base44.entities.Tutorial.update(tutorial.id, dados);
    else await base44.entities.Tutorial.create(dados);
    setSalvando(false);
    onSalvo();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Video size={17} className="text-primary" />
            </div>
            <h3 className="font-bold text-foreground">{tutorial ? 'Editar Tutorial' : 'Novo Tutorial'}</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="field-label">Título *</label>
            <input value={titulo} onChange={e => setTitulo(e.target.value)}
              placeholder="Ex: Como criar um pedido" className="field-input" />
          </div>

          <div>
            <label className="field-label">Módulo</label>
            <select value={modulo} onChange={e => setModulo(e.target.value)} className="field-input">
              {MODULOS_SISTEMA.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div>
            <label className="field-label">Descrição</label>
            <textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={3}
              placeholder="O que este vídeo ensina?" className="field-input resize-none" />
          </div>

          <div>
            <label className="field-label">Vídeo (gravação de tela) *</label>
            {videoUrl ? (
              <div className="space-y-2">
                <video src={videoUrl} controls className="w-full rounded-xl border border-border max-h-56 bg-black" />
                <label className="inline-flex items-center gap-1.5 text-xs text-primary font-semibold cursor-pointer hover:underline">
                  <Upload size={12} /> Trocar vídeo
                  <input type="file" accept="video/*" className="hidden" onChange={handleUpload} />
                </label>
              </div>
            ) : (
              <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-2xl py-8 cursor-pointer transition-colors ${enviando ? 'border-primary/40 bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-muted/30'}`}>
                {enviando ? (
                  <>
                    <Loader2 size={22} className="text-primary animate-spin" />
                    <p className="text-sm text-muted-foreground">Enviando vídeo...</p>
                  </>
                ) : (
                  <>
                    <Upload size={22} className="text-muted-foreground" />
                    <p className="text-sm font-semibold text-foreground">Clique para enviar o vídeo</p>
                    <p className="text-xs text-muted-foreground">MP4, WebM ou MOV</p>
                  </>
                )}
                <input type="file" accept="video/*" className="hidden" onChange={handleUpload} disabled={enviando} />
              </label>
            )}
          </div>

          {erro && <p className="text-xs text-destructive font-semibold">{erro}</p>}
        </div>

        <div className="px-5 py-4 border-t border-border flex gap-3">
          <button onClick={onClose} className="border border-border px-4 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors">
            Cancelar
          </button>
          <button onClick={salvar} disabled={salvando || enviando}
            className="flex-1 btn-primary flex items-center justify-center gap-2">
            {salvando ? 'Salvando...' : tutorial ? 'Salvar alterações' : 'Publicar tutorial'}
          </button>
        </div>
      </div>
    </div>
  );
}