import { useRef, useState, useEffect } from 'react';
import { Check, Trash2 } from 'lucide-react';

export default function AssinaturaCanvas({ onSave }) {
  const canvasRef = useRef(null);
  const [desenhando, setDesenhando] = useState(false);
  const [temTraco, setTemTraco] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#1C1917';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const src = e.touches ? e.touches[0] : e;
    return {
      x: (src.clientX - rect.left) * scaleX,
      y: (src.clientY - rect.top) * scaleY,
    };
  };

  const iniciar = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setDesenhando(true);
    setTemTraco(true);
  };

  const desenhar = (e) => {
    e.preventDefault();
    if (!desenhando) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const parar = (e) => {
    e?.preventDefault();
    setDesenhando(false);
  };

  const limpar = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setTemTraco(false);
  };

  const salvar = () => {
    if (!temTraco) return alert('Por favor, assine antes de confirmar.');
    const dataURL = canvasRef.current.toDataURL('image/png');
    onSave(dataURL);
  };

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={600}
        height={180}
        className="w-full rounded-xl border-2 border-amber-300 bg-white touch-none cursor-crosshair"
        style={{ maxHeight: 180 }}
        onMouseDown={iniciar}
        onMouseMove={desenhar}
        onMouseUp={parar}
        onMouseLeave={parar}
        onTouchStart={iniciar}
        onTouchMove={desenhar}
        onTouchEnd={parar}
      />
      <p className="text-xs text-gray-400 text-center">Assine dentro do campo acima</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={limpar}
          className="flex-1 border border-gray-200 rounded-xl py-2 text-sm text-gray-500 flex items-center justify-center gap-1.5 hover:bg-gray-50 transition-colors"
        >
          <Trash2 size={13} /> Limpar
        </button>
        <button
          type="button"
          onClick={salvar}
          className="flex-1 bg-amber-400 text-white rounded-xl py-2 text-sm font-semibold flex items-center justify-center gap-1.5 hover:bg-amber-500 transition-colors"
        >
          <Check size={13} /> Confirmar assinatura
        </button>
      </div>
    </div>
  );
}