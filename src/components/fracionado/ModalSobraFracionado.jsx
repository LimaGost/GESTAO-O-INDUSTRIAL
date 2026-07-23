import { useState } from 'react';
import { X, PackagePlus, Check } from 'lucide-react';
import { adicionarFracionado } from '@/lib/estoqueFracionado';

/**
 * Modal para a produção/separação enviar sobras (pacotes/unidades avulsas)
 * para o Estoque Fracionado.
 */
export default function ModalSobraFracionado({ itens = [], produtos = [], origem = '', onClose, onEnviado }) {
  const [quantidades, setQuantidades] = useState({});
  const [loading, setLoading] = useState(false);

  const setQtd = (produto_id, v) => setQuantidades(prev => ({ ...prev, [produto_id]: Math.max(0, Number(v) || 0) }));

  const totalEnvio = Object.values(quantidades).reduce((s, q) => s + q, 0);

  const enviar = async () => {
    if (totalEnvio <= 0) return alert('Informe a quantidade de sobra de ao menos um item.');
    setLoading(true);
    for (const item of itens) {
      const q = quantidades[item.produto_id] || 0;
      if (q <= 0) continue;
      const prod = produtos.find(p => p.id === item.produto_id);
      await adicionarFracionado({
        produto_id: item.produto_id,
        produto_nome: item.produto_nome,
        produto_codigo: prod?.codigo || '',
        quantidade: q,
        origem,
      });
    }
    setLoading(false);
    onEnviado?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <PackagePlus size={16} className="text-primary" />
            <h3 className="font-bold text-foreground text-sm">Enviar Sobra p/ Estoque Fracionado</h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg">
            <X size={15} className="text-muted-foreground" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-xs text-muted-foreground">
            Informe quantas unidades avulsas sobraram de cada item. Elas entrarão no Estoque Fracionado para serem usadas antes de abrir caixas novas.
          </p>
          <div className="border border-border rounded-xl divide-y divide-border/50 max-h-64 overflow-y-auto">
            {itens.map(item => (
              <div key={item.produto_id || item.produto_nome} className="flex items-center gap-3 px-3 py-2.5">
                <span className="text-xs text-foreground flex-1 truncate">{item.produto_nome}</span>
                <input
                  type="number" min="0" value={quantidades[item.produto_id] ?? ''}
                  onChange={e => setQtd(item.produto_id, e.target.value)}
                  placeholder="0"
                  className="w-20 border border-border rounded-lg px-2 py-1.5 text-sm bg-background text-center focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            ))}
            {itens.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Sem itens</p>}
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={enviar} disabled={loading || totalEnvio <= 0}
              className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity">
              <Check size={14} /> {loading ? 'Enviando...' : `Enviar ${totalEnvio} un`}
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