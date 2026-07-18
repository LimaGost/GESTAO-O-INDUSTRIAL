import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

function diasDesde(iso) {
  if (!iso) return 0;
  return (Date.now() - new Date(iso).getTime()) / 86400000;
}
function fmtDias(d) {
  if (d < 1) return `${Math.round(d * 24)}h`;
  return `${d.toFixed(1)}d`;
}

export default function DiretorOperacao({ pedidos, ops, separacoes, sepsGalpao, expedicoes }) {
  const [aberto, setAberto] = useState(null); // 'kanban|etapa'

  const kanbans = [
    {
      nome: '🛒 Pedidos',
      etapas: [
        ['rascunho', 'Rascunho'], ['aguardando_estoque', 'Aguard. Estoque'], ['separacao', 'Separação'],
        ['separado', 'Separado'], ['expedido', 'Expedido'], ['entregue', 'Entregue'],
      ],
      itens: pedidos.filter(p => p.status !== 'cancelado'),
      getStatus: p => p.status,
      render: p => ({ titulo: `#${p.numero || '—'} · ${p.cliente_nome}`, dias: diasDesde(p.updated_date) }),
    },
    {
      nome: '🏭 Produção (OPs)',
      etapas: [
        ['a_produzir', 'A Produzir'], ['em_producao', 'Em Produção'], ['producao_finalizada', 'Prod. Finalizada'],
        ['em_embalagem', 'Embalagem'], ['finalizado', 'Finalizado'],
      ],
      itens: ops,
      getStatus: o => o.status,
      render: o => ({ titulo: `${o.numero || 'OP'} · ${o.produto_nome}`, dias: diasDesde(o.updated_date) }),
    },
    {
      nome: '📋 Separação (Industria + Galpão)',
      etapas: [
        ['aguardando_producao', 'Aguard. Produção'], ['aguardando_separacao', 'Aguardando'], ['em_separacao', 'Em Separação'],
        ['separado', 'Separado'], ['em_conferencia', 'Conferência'], ['conferido', 'Conferido'], ['liberado_expedicao', 'Liberado'],
      ],
      itens: [...separacoes, ...sepsGalpao],
      getStatus: s => s.status,
      render: s => ({ titulo: `${s.numero} · ${s.cliente_nome || s.grupo_cliente_nome || '—'}`, dias: diasDesde(s.updated_date) }),
    },
    {
      nome: '🚛 Expedição',
      etapas: [['emitida', 'NF Emitida'], ['enviada', 'Em Trânsito'], ['entregue', 'Entregue']],
      itens: expedicoes,
      getStatus: e => e.status,
      render: e => ({ titulo: `NF ${e.numero_nf} · ${e.cliente_nome}`, dias: diasDesde(e.updated_date) }),
    },
  ];

  return (
    <div className="space-y-4">
      {kanbans.map(k => {
        // Calcula por etapa: quantidade + tempo médio parado
        const stats = k.etapas.map(([key, label]) => {
          const cards = k.itens.filter(i => k.getStatus(i) === key);
          const avg = cards.length > 0 ? cards.reduce((s, c) => s + diasDesde(c.updated_date), 0) / cards.length : 0;
          return { key, label, cards, avg };
        });
        const etapasAtivas = stats.filter(s => !['entregue', 'finalizado', 'liberado_expedicao', 'expedido'].includes(s.key) && s.cards.length > 0);
        const gargalo = etapasAtivas.length > 0 ? etapasAtivas.reduce((a, b) => (b.avg > a.avg ? b : a)) : null;

        return (
          <div key={k.nome} className="bg-card border border-border rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm font-bold text-foreground">{k.nome}</h3>
              {gargalo && gargalo.avg >= 1 && (
                <span className="text-[10px] bg-red-100 text-red-700 px-2 py-1 rounded-full font-bold">
                  ⚠️ Gargalo: {gargalo.label} ({fmtDias(gargalo.avg)} em média)
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(110px, 1fr))` }}>
              {stats.map(s => {
                const id = `${k.nome}|${s.key}`;
                const isGargalo = gargalo?.key === s.key && gargalo.avg >= 1;
                return (
                  <button key={s.key} onClick={() => setAberto(aberto === id ? null : id)}
                    className={`text-left rounded-xl border px-3 py-2.5 transition-all ${aberto === id ? 'border-primary bg-primary/5' : isGargalo ? 'border-red-300 bg-red-50' : 'border-border bg-muted/30 hover:bg-muted/60'}`}>
                    <p className="text-lg font-bold text-foreground leading-tight">{s.cards.length}</p>
                    <p className="text-[10px] font-semibold text-muted-foreground truncate">{s.label}</p>
                    <p className={`text-[10px] ${isGargalo ? 'text-red-600 font-bold' : 'text-muted-foreground'}`}>
                      {s.cards.length > 0 ? `⌀ ${fmtDias(s.avg)} na etapa` : '—'}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Lista da etapa clicada */}
            {stats.map(s => {
              const id = `${k.nome}|${s.key}`;
              if (aberto !== id) return null;
              return (
                <div key={id} className="border border-primary/20 bg-primary/5 rounded-xl p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-foreground">{s.label} — {s.cards.length} item(ns)</p>
                    <button onClick={() => setAberto(null)}><ChevronDown size={14} className="text-muted-foreground rotate-180" /></button>
                  </div>
                  {s.cards.length === 0 && <p className="text-xs text-muted-foreground">Nenhum item nesta etapa.</p>}
                  <div className="max-h-52 overflow-y-auto divide-y divide-border/50">
                    {s.cards
                      .slice()
                      .sort((a, b) => new Date(a.updated_date) - new Date(b.updated_date))
                      .map((c, i) => {
                        const info = k.render(c);
                        const atrasado = info.dias >= 2;
                        return (
                          <div key={c.id || i} className="flex items-center justify-between py-1.5 gap-2">
                            <p className="text-xs text-foreground truncate">{info.titulo}</p>
                            <span className={`text-[10px] font-bold flex-shrink-0 ${atrasado ? 'text-red-600' : 'text-muted-foreground'}`}>
                              {fmtDias(info.dias)} parado
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}