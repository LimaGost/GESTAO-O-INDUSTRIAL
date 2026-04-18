import { useEffect, useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle, Package, MapPin, Truck, AlertTriangle, Camera, Upload, X, PenLine } from 'lucide-react';
import AssinaturaCanvas from '@/components/confirmacao/AssinaturaCanvas';

export default function ConfirmarRecebimento() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');

  const [expedicao, setExpedicao] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [nomeRecebedor, setNomeRecebedor] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [confirmando, setConfirmando] = useState(false);
  const [confirmado, setConfirmado] = useState(false);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [fotoFile, setFotoFile] = useState(null);
  const [usandoCamera, setUsandoCamera] = useState(false);
  const [assinaturaDataURL, setAssinaturaDataURL] = useState(null);
  const [mostrarAssinatura, setMostrarAssinatura] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!token) { setErro('Link inválido.'); setLoading(false); return; }
    base44.entities.Expedicao.filter({ token_confirmacao: token })
      .then(results => {
        if (!results || results.length === 0) { setErro('Expedição não encontrada.'); return; }
        const exp = results[0];
        setExpedicao(exp);
        if (exp.confirmado_pelo_cliente) setConfirmado(true);
      })
      .catch(() => setErro('Erro ao carregar os dados.'))
      .finally(() => setLoading(false));
  }, [token]);

  const abrirCamera = async () => {
    setUsandoCamera(true);
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
    streamRef.current = stream;
    setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = stream; }, 100);
  };

  const tirarFoto = () => {
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      setFotoFile(blob);
      setFotoPreview(canvas.toDataURL('image/jpeg'));
    }, 'image/jpeg', 0.8);
    fecharCamera();
  };

  const fecharCamera = () => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    setUsandoCamera(false);
  };

  const selecionarArquivo = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFotoFile(file);
    setFotoPreview(URL.createObjectURL(file));
  };

  const removerFoto = () => { setFotoFile(null); setFotoPreview(null); };

  const confirmar = async () => {
    if (!nomeRecebedor.trim()) return alert('Por favor, informe o nome do recebedor.');
    setConfirmando(true);

    try {
      let foto_url = null;
      if (fotoFile) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: fotoFile });
        foto_url = file_url;
      }

      let assinatura_url = null;
      if (assinaturaDataURL) {
        const img = new Image();
        img.src = assinaturaDataURL;
        await new Promise(resolve => img.onload = resolve);
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext('2d').drawImage(img, 0, 0);
        assinatura_url = await new Promise(resolve => {
          canvas.toBlob(async blob => {
            const { file_url } = await base44.integrations.Core.UploadFile({ file: blob });
            resolve(file_url);
          }, 'image/png');
        });
      }

      const res = await base44.functions.invoke('confirmarRecebimento', {
        token,
        nome_recebedor: nomeRecebedor,
        observacoes_cliente: observacoes,
        foto_url,
        assinatura_url,
      });

      if (res.data?.success) {
        setConfirmado(true);
      } else {
        alert('Erro: ' + (res.data?.error || 'Falha ao confirmar recebimento'));
      }
    } catch (err) {
      console.error('Erro ao confirmar:', err);
      alert('Erro ao confirmar: ' + err.message);
    }
    setConfirmando(false);
  };

  if (loading) return (
    <div className="min-h-screen bg-amber-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (erro) return (
    <div className="min-h-screen bg-amber-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
        <AlertTriangle size={48} className="mx-auto mb-4 text-red-400" />
        <h2 className="font-bold text-gray-800 text-lg mb-2">Link inválido</h2>
        <p className="text-gray-500 text-sm">{erro}</p>
      </div>
    </div>
  );

  if (confirmado) return (
    <div className="min-h-screen bg-amber-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={40} className="text-green-500" />
        </div>
        <h2 className="font-bold text-gray-800 text-xl mb-2">Recebimento Confirmado!</h2>
        <p className="text-gray-500 text-sm mb-4">
          Obrigado, <strong>{expedicao?.nome_recebedor || nomeRecebedor}</strong>! O recebimento do pedido <strong>{expedicao?.pedido_numero}</strong> foi registrado com sucesso.
        </p>
        <div className="bg-amber-50 rounded-xl p-3 text-xs text-amber-700">
          ☀️ Raio do Sol — Artigos de Umbanda e Candomblé
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-amber-50 p-4 flex items-start justify-center pt-10">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="bg-amber-400 px-6 py-5 text-white">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl">☀️</span>
            <div>
              <p className="font-bold text-lg leading-tight">Raio do Sol</p>
              <p className="text-amber-100 text-xs">Artigos de Umbanda e Candomblé</p>
            </div>
          </div>
          <div className="mt-3 bg-amber-500/50 rounded-xl px-4 py-2 flex items-center gap-2">
            <Truck size={16} />
            <p className="text-sm font-medium">Confirmação de Recebimento</p>
          </div>
        </div>

        {/* Dados da entrega */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Package size={16} className="text-amber-500" />
            <h3 className="font-semibold text-gray-800 text-sm">Detalhes do Pedido</h3>
          </div>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Pedido</span>
              <span className="font-semibold text-gray-800">{expedicao.pedido_numero}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">NF</span>
              <span className="font-semibold text-gray-800">{expedicao.numero_nf}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Cliente</span>
              <span className="font-semibold text-gray-800">{expedicao.cliente_nome}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Valor Total</span>
              <span className="font-bold text-amber-600">R$ {(expedicao.valor_total || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Itens */}
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800 text-sm mb-2">Itens entregues</h3>
          <div className="space-y-1">
            {(expedicao.itens || []).map((item, i) => (
              <div key={i} className="flex justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                <span className="text-gray-700">{item.produto_nome}</span>
                <span className="font-semibold text-gray-900">{item.quantidade} un</span>
              </div>
            ))}
          </div>
        </div>

        {/* Endereço */}
        {expedicao.cliente_endereco && (
          <div className="px-6 py-3 border-b border-gray-100">
            <div className="flex items-start gap-2 text-sm text-gray-500">
              <MapPin size={14} className="mt-0.5 text-amber-500 flex-shrink-0" />
              <span>{expedicao.cliente_endereco}</span>
            </div>
          </div>
        )}

        {/* Formulário de confirmação */}
        <div className="px-6 py-5">
          <h3 className="font-semibold text-gray-800 text-sm mb-4">Confirmar recebimento</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Nome de quem recebeu *</label>
              <input
                value={nomeRecebedor}
                onChange={e => setNomeRecebedor(e.target.value)}
                placeholder="Digite seu nome completo..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            {/* Foto do recebedor */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Foto de quem recebeu (opcional)</label>
              {usandoCamera ? (
                <div className="space-y-2">
                  <video ref={videoRef} autoPlay playsInline className="w-full rounded-xl bg-black" style={{ maxHeight: 240 }} />
                  <div className="flex gap-2">
                    <button onClick={tirarFoto} className="flex-1 bg-amber-400 text-white py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
                      <Camera size={15} /> Tirar Foto
                    </button>
                    <button onClick={fecharCamera} className="px-4 border border-gray-200 rounded-xl text-sm text-gray-500">
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : fotoPreview ? (
                <div className="relative">
                  <img src={fotoPreview} alt="Foto do recebedor" className="w-full rounded-xl object-cover" style={{ maxHeight: 200 }} />
                  <button onClick={removerFoto} className="absolute top-2 right-2 bg-white rounded-full p-1 shadow">
                    <X size={14} className="text-gray-500" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button onClick={abrirCamera} className="flex-1 border-2 border-dashed border-amber-300 rounded-xl py-3 text-sm text-amber-600 font-medium flex items-center justify-center gap-2 hover:bg-amber-50 transition-colors">
                    <Camera size={16} /> Usar câmera
                  </button>
                  <button onClick={() => fileInputRef.current?.click()} className="flex-1 border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm text-gray-500 flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors">
                    <Upload size={16} /> Galeria
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={selecionarArquivo} />
                </div>
              )}
            </div>

            {/* Assinatura digital */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Assinatura digital (opcional)</label>
              {assinaturaDataURL ? (
                <div className="relative border border-green-200 rounded-xl overflow-hidden bg-white p-2">
                  <img src={assinaturaDataURL} alt="Assinatura" className="h-16 object-contain mx-auto" />
                  <button
                    onClick={() => { setAssinaturaDataURL(null); setMostrarAssinatura(false); }}
                    className="absolute top-2 right-2 bg-white rounded-full p-1 shadow"
                  >
                    <X size={14} className="text-gray-500" />
                  </button>
                  <p className="text-center text-xs text-green-600 font-medium mt-1">✓ Assinatura capturada</p>
                </div>
              ) : mostrarAssinatura ? (
                <AssinaturaCanvas onSave={(dataURL) => { setAssinaturaDataURL(dataURL); setMostrarAssinatura(false); }} />
              ) : (
                <button
                  type="button"
                  onClick={() => setMostrarAssinatura(true)}
                  className="w-full border-2 border-dashed border-amber-300 rounded-xl py-3 text-sm text-amber-600 font-medium flex items-center justify-center gap-2 hover:bg-amber-50 transition-colors"
                >
                  <PenLine size={16} /> Assinar com o dedo / caneta
                </button>
              )}
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">Observações (opcional)</label>
              <textarea
                value={observacoes}
                onChange={e => setObservacoes(e.target.value)}
                placeholder="Alguma observação sobre a entrega?"
                rows={2}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
              />
            </div>

            <button
              onClick={confirmar}
              disabled={confirmando}
              className="w-full bg-amber-400 hover:bg-amber-500 text-white font-bold py-3 rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <CheckCircle size={16} />
              {confirmando ? 'Confirmando...' : 'Confirmar Recebimento'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}