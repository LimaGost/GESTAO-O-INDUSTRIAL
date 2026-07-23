import { useEffect, useState } from 'react';
import { AlertTriangle, Check, Minus, Plus } from 'lucide-react';
import { listarFracionado, retirarFracionado } from '@/lib/estoqueFracionado';

/**
 * Alerta ao separador: mostra saldo de unidades avulsas (Estoque Fracionado)
 * para os itens da separação e permite dar baixa na hora da retirada.
 */
export default function AlertaFracionado({ itens = [], contexto = '' }) {
  const [saldos, setSaldos] = useState({});
  const [retirando, setRetirando] = useState(null); // produto_id em retirada
  const [qtd, setQtd] = useState(1);
  const [loading, setLoading] = useState(false);
  const [baixados, setBaixados] = useState({});

  const load = async () => {
    const all = await listarFracionado().catch(() => []);
    const map = {};
    for (const r of all) map[r.produto_id] = (r.quantidade || 0);
    setSaldos(map);
  };

  useEffect(() => { load(); }, []);

  const itensComSaldo = itens.filter(i => i.produto_id && (saldos[i.produto_id] || 0) > 0);
  if (itensComSaldo.length === 0) return null;

  const confirmarRetirada = async (item) => {
    setLoading(true);
    try {
      await retirarFracionado({
        produto_id: item.produto_id,
        produto_nome: item.produto_nome,
        quantidade: qtd,
        motivo: contexto || 'Retirada na separação',
      });
      setBaixados(prev => ({ ...prev, [item.produto_id]: (prev[item.produto_id] || 0) + qtd }));
      setRetirando(null);
      setQtd(1);
      await load();
    } catch (e) {
      alert(`❌ ${e.message}`);
    }
    setLoading(false);
  };

  return (
    <div className="border border-amber-300 bg-amber-50 rounded-xl overflow-hidden">
      <div className="px-3 py-2.5 flex items-start gap-2 border-b border-amber-200">
        <AlertTriangle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs font-semibold text-amber-800 leading-snug">
          Existem unidades avulsas no <strong>Estoque Fracionado</strong> para itens desta separação.
          Use-as antes de abrir uma caixa nova e dê baixa ao retirar.
        </p>
      </div>
      <div className="divide-y divide-amber-200/60">
        {itensComSaldo.map(item => {
          const saldo = saldos[item.produto_id] || 0;
          const emRetirada = retirando === item.produto_id;
          return (
            <div key={item.produto_id} className="px-3 py-2.5 bg-white/60">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{item.produto_nome}</p>
                  <p className="text-[10px] text-amber-700">
                    {saldo} un avulsas disponíveis
                    {baixados[item.produto_id] ? ` · ✓ ${baixados[item.produto_id]} un já retiradas` : ''}
                  </p>
                </div>
                {!emRetirada && (
                  <button
                    onClick={() => { setRetirando(item.produto_id); setQtd(Math.min(saldo, item.quantidade || saldo)); }}
                    className="flex-shrink-0 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors">
                    Retirar do Fracionado
                  </button>
                )}
              </div>
              {emRetirada && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center gap-1.5 border border-amber-300 rounded-xl px-2 py-1.5 bg-white">
                    <button onClick={() => setQtd(q => Math.max(1, q - 1))}
                      className="w-6 h-6 rounded flex items-center justify-center hover:bg-amber-50"><Minus size={11} /></button>
                    <span className="text-sm font-bold w-8 text-center">{qtd}</span>
                    <button onClick={() => setQtd(q => Math.min(saldo, q + 1))}
                      className="w-6 h-6 rounded flex items-center justify-center hover:bg-amber-50"><Plus size={11} /></button>
                  </div>
                  <button onClick={() => confirmarRetirada(item)} disabled={loading}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold bg-green-600 text-white hover:opacity-90 disabled:opacity-50 transition-opacity">
                    <Check size={12} /> {loading ? 'Baixando...' : `Confirmar baixa de ${qtd} un`}
                  </button>
                  <button onClick={() => setRetirando(null)}
                    className="px-3 py-2 rounded-xl text-xs text-muted-foreground border border-border hover:bg-muted">
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}