import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Tag, Printer, CheckCircle } from 'lucide-react';
import { usePermissoes } from '@/lib/usePermissoes.jsx';

export default function Etiquetas() {
  const { somenteLeitura } = usePermissoes();
  const readonly = somenteLeitura('Etiquetas');
  const [etiquetas, setEtiquetas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Etiqueta.list('-created_date').then(e => {
      setEtiquetas(e);
      setLoading(false);
    });
  }, []);

  const marcarImpresso = async (id) => {
    if (readonly) return;
    await base44.entities.Etiqueta.update(id, { impresso: true });
    setEtiquetas(prev => prev.map(e => e.id === id ? { ...e, impresso: true } : e));
  };

  const pendentes = etiquetas.filter(e => !e.impresso);
  const impressas = etiquetas.filter(e => e.impresso);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-blue-100 flex items-center justify-center">
          <Tag size={19} className="text-blue-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Etiquetas</h2>
          <p className="text-xs text-muted-foreground">{pendentes.length} pendente(s) · {impressas.length} impressa(s)</p>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : etiquetas.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-4xl mb-3">🏷️</p>
            <p className="text-sm">Nenhuma etiqueta gerada.</p>
          </div>
        ) : etiquetas.map(e => (
          <div key={e.id} className={`bg-card border rounded-2xl p-4 flex items-center justify-between ${e.impresso ? 'border-border opacity-60' : 'border-blue-200'}`}>
            <div>
              <p className="font-semibold text-foreground text-sm">{e.produto_nome}</p>
              <p className="text-xs text-muted-foreground">Lote: {e.lote} · {e.quantidade} un · {e.data_producao}</p>
            </div>
            {!e.impresso && !readonly ? (
              <button onClick={() => marcarImpresso(e.id)}
                className="flex items-center gap-2 bg-blue-100 text-blue-700 border border-blue-300 px-3 py-2 rounded-xl text-sm font-semibold hover:bg-blue-200 transition-colors">
                <Printer size={14} /> Imprimir
              </button>
            ) : (
              <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                <CheckCircle size={13} /> Impresso
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}