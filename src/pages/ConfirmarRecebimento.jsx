import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle, Package } from 'lucide-react';

export default function ConfirmarRecebimento() {
  const [expedicao, setExpedicao] = useState(null);
  const [confirmado, setConfirmado] = useState(false);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) { setErro('Link inválido.'); setLoading(false); return; }
    base44.entities.Expedicao.filter({ id }).then(res => {
      if (res?.length > 0) {
        setExpedicao(res[0]);
        setConfirmado(res[0].confirmado_pelo_cliente || false);
      } else {
        setErro('Expedição não encontrada.');
      }
      setLoading(false);
    }).catch(() => { setErro('Erro ao carregar.'); setLoading(false); });
  }, []);

  const confirmar = async () => {
    if (!expedicao) return;
    await base44.entities.Expedicao.update(expedicao.id, {
      confirmado_pelo_cliente: true,
      status: 'entregue',
      data_confirmacao: new Date().toISOString(),
    });
    setConfirmado(true);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
    </div>
  );

  if (erro) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md w-full">
        <p className="text-4xl mb-4">❌</p>
        <h2 className="text-xl font-bold text-foreground mb-2">Erro</h2>
        <p className="text-muted-foreground text-sm">{erro}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'hsl(35,40%,96%)' }}>
      <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md w-full space-y-5">
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
          <span className="text-3xl">☀️</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Raio do Sol</h2>
          <p className="text-sm text-muted-foreground">Confirmação de Recebimento</p>
        </div>

        {expedicao && (
          <div className="bg-muted/30 rounded-xl p-4 text-left space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">NF:</span>
              <span className="font-medium">{expedicao.numero_nf || expedicao.id}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Cliente:</span>
              <span className="font-medium">{expedicao.cliente_nome}</span>
            </div>
          </div>
        )}

        {confirmado ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <CheckCircle size={40} className="text-green-500" />
            <p className="font-bold text-foreground">Recebimento Confirmado!</p>
            <p className="text-sm text-muted-foreground">Obrigado por confirmar o recebimento.</p>
          </div>
        ) : (
          <button onClick={confirmar}
            className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
            <CheckCircle size={18} /> Confirmar Recebimento
          </button>
        )}
      </div>
    </div>
  );
}