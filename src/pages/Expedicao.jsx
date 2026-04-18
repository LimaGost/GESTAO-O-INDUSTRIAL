import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Truck, Plus, CheckCircle, Clock } from 'lucide-react';
import { usePermissoes } from '@/lib/usePermissoes.jsx';

const STATUS_LABEL = {
  emitida: { label: 'Emitida', color: 'bg-blue-100 text-blue-700' },
  enviada: { label: 'Enviada', color: 'bg-amber-100 text-amber-700' },
  entregue: { label: 'Entregue', color: 'bg-green-100 text-green-700' },
};

export default function Expedicao() {
  const { somenteLeitura } = usePermissoes();
  const readonly = somenteLeitura('Expedicao');
  const [expedicoes, setExpedicoes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Expedicao.list('-created_date').then(e => {
      setExpedicoes(e);
      setLoading(false);
    });
  }, []);

  const avancarStatus = async (exp) => {
    if (readonly) return;
    const proximo = exp.status === 'emitida' ? 'enviada' : exp.status === 'enviada' ? 'entregue' : null;
    if (!proximo) return;
    await base44.entities.Expedicao.update(exp.id, { status: proximo });
    setExpedicoes(prev => prev.map(e => e.id === exp.id ? { ...e, status: proximo } : e));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-purple-100 flex items-center justify-center">
          <Truck size={19} className="text-purple-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Expedição</h2>
          <p className="text-xs text-muted-foreground">{expedicoes.length} expedição(ões)</p>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : expedicoes.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-4xl mb-3">🚚</p>
            <p className="text-sm">Nenhuma expedição encontrada.</p>
          </div>
        ) : expedicoes.map(exp => {
          const st = STATUS_LABEL[exp.status] || STATUS_LABEL.emitida;
          return (
            <div key={exp.id} className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-foreground">{exp.numero_nf || exp.id}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>{st.label}</span>
                </div>
                <p className="text-xs text-muted-foreground">{exp.cliente_nome} · {exp.data_emissao}</p>
              </div>
              {!readonly && exp.status !== 'entregue' && (
                <button onClick={() => avancarStatus(exp)}
                  className="text-xs bg-primary/10 text-primary border border-primary/30 px-3 py-1.5 rounded-lg font-semibold hover:bg-primary/20 transition-colors">
                  Avançar
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}