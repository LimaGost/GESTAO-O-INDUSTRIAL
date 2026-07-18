import { motion } from 'framer-motion';
import { X } from 'lucide-react';

// Vitrine animada do produto — usa a foto real com movimento suave (estilo showcase)
export default function VitrineProduto({ produto, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: 'linear-gradient(135deg, #0D3B45 0%, #14505c 55%, #0D3B45 100%)' }}
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose}
          className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/30 hover:bg-black/50 transition-colors">
          <X size={16} className="text-white" />
        </button>

        {/* Palco com a foto real animada */}
        <div className="relative flex items-center justify-center overflow-hidden" style={{ height: '420px' }}>
          {/* brilho dourado de fundo */}
          <motion.div
            className="absolute w-96 h-96 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(201,162,39,0.35) 0%, transparent 70%)' }}
            animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.img
            src={produto.foto_url}
            alt={produto.nome}
            className="relative max-h-80 max-w-[70%] object-contain rounded-xl"
            style={{ filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.45))' }}
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{
              scale: [1, 1.06, 1],
              opacity: 1,
              y: [0, -8, 0],
            }}
            transition={{
              opacity: { duration: 0.6 },
              scale: { duration: 6, repeat: Infinity, ease: 'easeInOut' },
              y: { duration: 6, repeat: Infinity, ease: 'easeInOut' },
            }}
          />
          {/* reflexo */}
          <div className="absolute bottom-0 left-0 right-0 h-16"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.35), transparent)' }} />
        </div>

        {/* Legenda */}
        <div className="px-6 py-4 flex items-center justify-between gap-3"
          style={{ borderTop: '1px solid rgba(201,162,39,0.3)' }}>
          <div className="min-w-0">
            <p className="font-bold text-base truncate" style={{ color: '#C9A227' }}>{produto.nome}</p>
            {produto.categoria && (
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>{produto.categoria}</p>
            )}
          </div>
          {produto.codigo && (
            <span className="text-xs font-mono px-2.5 py-1 rounded-full flex-shrink-0"
              style={{ background: 'rgba(201,162,39,0.15)', color: '#C9A227' }}>
              SKU {produto.codigo}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}