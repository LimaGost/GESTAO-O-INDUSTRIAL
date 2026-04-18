import { useState, useRef } from 'react';
import { X, Camera, Upload, PenLine, CheckCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function ModalConfirmacaoRecebimento({ expedicao, onClose, onConfirmed }) {
  const [nomeRecebedor, setNomeRecebedor] = useState('');
  const [cpfRecebedor, setCpfRecebedor] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [fotoPreview, setFotoPreview] = useState(null);
  const [fotoFile, setFotoFile] = useState(null);
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

  const confirmar = async () => {
    if (!nomeRecebedor.trim()) return alert('Informe o nome do recebedor.');
    setConfirmando(true);
    try {
      let foto_url = null;
      if (fotoFile) {
        const res = await base44.integrations.Core.UploadFile({ file: fotoFile });
        foto_url = res.file_url;
      }
      await base44.entities.Expedicao.update(expedicao.id, {
        confirmado_pelo_cliente: true,
        data_confirmacao_cliente: new Date().toISOString(),
        nome_recebedor: nomeRecebedor,
        cpf_recebedor: cpfRecebedor,
        observacoes_cliente: observacoes,
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
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h3 className="font-bold text-foreground">Confirmar Recebimento</h3>
            <p className="text-xs text-muted-foreground">Pedido {expedicao.pedido_numero}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        <div className="p-6 space-y-4">
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
                className="w-full border-2 border-dashed border-border rounded-xl py-4 text-sm text-muted-foreground flex items-center justify-center gap-2 hover:bg-muted/30 transition-colors">
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
            <button onClick={confirmar} disabled={confirmando}
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