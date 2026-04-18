import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Package, CheckCircle, Clock } from 'lucide-react';
import { usePermissoes } from '@/lib/usePermissoes.jsx';

export default function Embalagem() {
  const { somenteLeitura } = usePermissoes();
  const readonly = somenteLeitura('Embalagem');
  const [ordens, setOrdens] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.OrdemProducao.filter({ status: 'em_embalagem' }).then(o => {
      setOrdens(o);
      setLoading(false);
    });
  }, []);

  const finalizar = async (ordem) => {
    if (readonly) return;
    await base44.entities.OrdemProducao.update(ordem.id, { status: 'finalizado', data_finalizacao: new Date().toISOString() });
    setOrdens(prev => prev.filter(o => o.id !== ordem.id));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center">
          <Package size={19} className="text-amber-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Embalagem</h2>
          <p className="text-xs text-muted-foreground">{ordens.length} ordem(s) em embalagem</p>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : ordens.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-4xl mb-3">📦</p>
            <p className="text-sm">Nenhuma ordem em embalagem.</p>
          </div>
        ) : ordens.map(o => (
          <div key={o.id} className="bg-card border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-foreground">{o.numero}</p>
              <p className="text-sm text-muted-foreground">{o.produto_nome} · {o.quantidade} un</p>
            </div>
            {!readonly && (
              <button onClick={() => finalizar(o)}
                className="flex items-center gap-2 bg-green-100 text-green-700 border border-green-300 px-3 py-2 rounded-xl text-sm font-semibold hover:bg-green-200 transition-colors">
                <CheckCircle size={15} /> Finalizar
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}