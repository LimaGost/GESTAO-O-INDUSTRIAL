import { Package } from 'lucide-react';

const OP_ATIVA = (s) => !['finalizado', 'producao_finalizada', 'cancelado'].includes(s);

// Soma quantidades por produto de uma lista de registros com .itens
function somaPorProduto(lista, filtro) {
  const m = {};
  for (const reg of lista) {
    if (filtro && !filtro(reg)) continue;
    for (const i of (reg.itens || [])) {
      const k = i.produto_id || i.produto_nome;
      m[k] = (m[k] || 0) + (i.quantidade || 0);
    }
  }
  return m;
}

export default function RastreioQuantidades({ pedido, ordens = [], separacoes = [], expedicoes = [] }) {
  const itens = pedido.itens || [];
  if (itens.length === 0) return null;

  const emProducao = somaPorProduto(ordens, o => OP_ATIVA(o.status));
  const emSeparacao = somaPorProduto(separacoes, s => s.status !== 'liberado_expedicao');
  const liberado = somaPorProduto(separacoes, s => s.status === 'liberado_expedicao');
  const expedido = somaPorProduto(expedicoes, e => e.status !== 'entregue');
  const entregue = somaPorProduto(expedicoes, e => e.status === 'entregue');

  const cols = [
    { key: 'producao', label: 'Produção', map: emProducao, color: 'text-amber-600' },
    { key: 'separacao', label: 'Separação', map: emSeparacao, color: 'text-sky-600' },
    { key: 'liberado', label: 'Liberado', map: liberado, color: 'text-teal-600' },
    { key: 'expedido', label: 'Expedido', map: expedido, color: 'text-orange-600' },
    { key: 'entregue', label: 'Entregue', map: entregue, color: 'text-green-600' },
  ];

  return (
    <div className="bg-muted/30 border border-border rounded-xl p-3">
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
        <Package size={11} /> Quantidades por Etapa
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="text-muted-foreground">
              <th className="text-left font-semibold pb-1.5 pr-2">Produto</th>
              <th className="text-center font-semibold pb-1.5 px-1">Total</th>
              {cols.map(c => (
                <th key={c.key} className="text-center font-semibold pb-1.5 px-1">{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {itens.map((item, idx) => {
              const k = item.produto_id || item.produto_nome;
              return (
                <tr key={idx} className="border-t border-border/60">
                  <td className="py-1.5 pr-2 text-foreground font-medium truncate max-w-[120px]">{item.produto_nome}</td>
                  <td className="py-1.5 px-1 text-center font-bold text-foreground">{item.quantidade || 0}</td>
                  {cols.map(c => (
                    <td key={c.key} className={`py-1.5 px-1 text-center font-semibold ${c.map[k] ? c.color : 'text-muted-foreground/40'}`}>
                      {c.map[k] || 0}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}