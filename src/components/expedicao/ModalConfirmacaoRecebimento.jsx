import { useState, useRef } from 'react';
import { X, Upload, CheckCircle, PenLine, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

function AssinaturaCanvas({ onSalvar, onLimpar }) {
  const canvasRef = useRef(null);
  const [desenhando, setDesenhando] = useState(false);
  const [temTraco, setTemTraco] = useState(false);

  const initCtx = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#1C1917';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    return ctx;
  };

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const src = e.touches ? e.touches[0] : e;
    return { x: (src.clientX - rect.left) * scaleX, y: (src.clientY - rect.top) * scaleY };
  };

  const iniciar = (e) => {
    e.preventDefault();
    const ctx = initCtx();
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setDesenhando(true);
    setTemTraco(true);
  };

  const desenhar = (e) => {
    e.preventDefault();
    if (!desenhando) return;
    const ctx = initCtx();
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const parar = (e) => { e?.preventDefault(); setDesenhando(false); };

  const limpar = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setTemTraco(false);
    onLimpar?.();
  };

  const salvar = () => {
    if (!temTraco) return;
    const dataURL = canvasRef.current.toDataURL('image/png');
    onSalvar(dataURL);
  };

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={600}
        height={160}
        className="w-full rounded-xl border-2 border-primary/40 bg-white touch-none cursor-crosshair"
        style={{ maxHeight: 160 }}
        onMouseDown={iniciar} onMouseMove={desenhar} onMouseUp={parar} onMouseLeave={parar}
        onTouchStart={iniciar} onTouchMove={desenhar} onTouchEnd={parar}
      />
      <p className="text-xs text-muted-foreground text-center">Assine dentro do campo acima</p>
      <div className="flex gap-2">
        <button type="button" onClick={limpar}
          className="flex-1 border border-border rounded-xl py-2 text-sm text-muted-foreground flex items-center justify-center gap-1.5 hover:bg-muted transition-colors">
          <Trash2 size={13} /> Limpar
        </button>
        <button type="button" onClick={salvar} disabled={!temTraco}
          className="flex-1 bg-primary text-primary-foreground rounded-xl py-2 text-sm font-semibold flex items-center justify-center gap-1.5 hover:opacity-90 disabled:opacity-40 transition-opacity">
          <CheckCircle size={13} /> Salvar Assinatura
        </button>
      </div>
    </div>
  );
}

export default function ModalConfirmacaoRecebimento({ expedicao, onClose, onConfirmed }) {
  const [nomeRecebedor, setNomeRecebedor] = useState('');
  const [cpfRecebedor, setCpfRecebedor] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [fotoPreview, setFotoPreview] = useState(null);
  const [fotoFile, setFotoFile] = useState(null);
  const [assinaturaDataUrl, setAssinaturaDataUrl] = useState(null);
  const [confirmando, setConfirmando] = useState(false);
  const fileInputRef = useRef(null);

  const selecionarArquivo = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFotoFile(file);
    setFotoPreview(URL.createObjectURL(file));
  };

  const formatCPF = (v) => {
    const d = v.replace(/\D/g, '').slice(0, 11);
    return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  // Converte dataURL para File
  const dataURLtoFile = (dataurl, filename) => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new File([u8arr], filename, { type: mime });
  };

  const confirmar = async () => {
    if (!nomeRecebedor.trim()) return alert('Informe o nome do recebedor.');
    if (!assinaturaDataUrl) return alert('É necessário assinar para confirmar o recebimento.');
    setConfirmando(true);
    try {
      let foto_url = null;
      if (fotoFile) {
        const res = await base44.integrations.Core.UploadFile({ file: fotoFile });
        foto_url = res.file_url;
      }

      // Faz upload da assinatura
      const assinaturaFile = dataURLtoFile(assinaturaDataUrl, 'assinatura.png');
      const resAssinatura = await base44.integrations.Core.UploadFile({ file: assinaturaFile });

      await base44.entities.Expedicao.update(expedicao.id, {
        confirmado_pelo_cliente: true,
        data_confirmacao_cliente: new Date().toISOString(),
        nome_recebedor: nomeRecebedor,
        cpf_recebedor: cpfRecebedor,
        observacoes_cliente: observacoes,
        assinatura_url: resAssinatura.file_url,
        status: 'entregue',
        ...(foto_url && { foto_recebedor_url: foto_url }),
      });
      onConfirmed();
    } catch (err) {
      alert('Erro ao confirmar: ' + err.message);
    }
    setConfirmando(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <h3 className="font-bold text-foreground">Confirmar Recebimento</h3>
            <p className="text-xs text-muted-foreground">Pedido {expedicao.pedido_numero}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Nome de quem recebeu *</label>
            <input value={nomeRecebedor} onChange={e => setNomeRecebedor(e.target.value)}
              placeholder="Nome completo..."
              className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">CPF (opcional)</label>
            <input value={cpfRecebedor} onChange={e => setCpfRecebedor(formatCPF(e.target.value))}
              placeholder="000.000.000-00" inputMode="numeric"
              className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>

          {/* Assinatura */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5 block">
              <PenLine size={12} /> Assinatura do recebedor *
            </label>
            {assinaturaDataUrl ? (
              <div className="relative">
                <img src={assinaturaDataUrl} alt="Assinatura" className="w-full rounded-xl border border-border bg-white" style={{ maxHeight: 120, objectFit: 'contain' }} />
                <button onClick={() => setAssinaturaDataUrl(null)}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center text-white">
                  <X size={12} />
                </button>
                <p className="text-xs text-green-600 font-semibold mt-1.5 flex items-center gap-1">
                  <CheckCircle size={11} /> Assinatura capturada
                </p>
              </div>
            ) : (
              <AssinaturaCanvas
                onSalvar={(dataUrl) => setAssinaturaDataUrl(dataUrl)}
                onLimpar={() => setAssinaturaDataUrl(null)}
              />
            )}
          </div>

          {/* Foto opcional */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Foto (opcional)</label>
            {fotoPreview ? (
              <div className="relative">
                <img src={fotoPreview} alt="Foto" className="w-full h-32 object-cover rounded-xl" />
                <button onClick={() => { setFotoFile(null); setFotoPreview(null); }}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center text-white">
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-border rounded-xl py-3 text-sm text-muted-foreground flex items-center justify-center gap-2 hover:bg-muted/30 transition-colors">
                <Upload size={16} /> Selecionar foto
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={selecionarArquivo} />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Observações (opcional)</label>
            <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} rows={2}
              className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={confirmar} disabled={confirmando || !assinaturaDataUrl || !nomeRecebedor.trim()}
              className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity">
              <CheckCircle size={16} /> {confirmando ? 'Confirmando...' : 'Confirmar Recebimento'}
            </button>
            <button onClick={onClose} className="px-4 border border-border rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}