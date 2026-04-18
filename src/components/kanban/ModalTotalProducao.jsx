import { useState, useMemo } from 'react';
import { X, BarChart2, CheckSquare, Square } from 'lucide-react';

export default function ModalTotalProducao({ ordens, checklistOk = {}, onClose }) {
  const PRODUCAO_SEMANAL = parseInt(localStorage.getItem('producao_capacidade_semanal') || '1000', 10);

  const ordensAtivas = useMemo(() =>
    ordens.filter(o => o.status === 'a_produzir' || o.status === 'em_producao'),
    [ordens]
  );

  const produtosMap = useMemo(() => {
    const map = {};
    for (const o of ordensAtivas) {
      if (o.itens && o.itens.length > 0) {
        for (const item of o.itens) {
          const key = item.produto_nome || 'Sem nome';
          if (!map[key]) map[key] = { nome: key, ordens: [] };
          map[key].ordens.push({ ...o, _itemQtd: item.quantidade || 0, _isSingleItem: false });
        }
      } else {
        const key = o.produto_nome || 'Sem nome';
        if (!map[key]) map[key] = { nome: key, ordens: [] };
        map[key].ordens.push({ ...o, _isSingleItem: true });
      }
    }
    return map;
  }, [ordensAtivas]);

  const todosProdutos = Object.keys(produtosMap).sort();
  const [selecionados, setSelecionados] = useState(() => new Set(todosProdutos));

  const toggle = (nome) => setSelecionados(prev => {
    const next = new Set(prev);
    if (next.has(nome)) next.delete(nome);
    else next.add(nome);
    return next;
  });

  const toggleTodos = () => {
    if (selecionados.size === todosProdutos.length) setSelecionados(new Set());
    else setSelecionados(new Set(todosProdutos));
  };

  const totaisPorProduto = useMemo(() => {
    const result = {};
    for (const nome of selecionados) {
      const grupo = produtosMap[nome];
      if (!grupo) continue;
      let total = 0, totalSemChecklist = 0;
      for (const o of grupo.ordens) {
        const checkKey = `${o.id}_${o.status}`;
        const checklistFeito = checklistOk[checkKey];
        const qtd = o._isSingleItem ? (o.quantidade || 0) : (o._itemQtd || 0);
        total += qtd;
        if (!checklistFeito) totalSemChecklist += qtd;
      }
      result[nome] = { total, totalSemChecklist, descartado: total - totalSemChecklist };
    }
    return result;
  }, [selecionados, produtosMap, checklistOk]);

  const totalGeral = Object.values(totaisPorProduto).reduce((s, v) => s + v.totalSemChecklist, 0);
  const semanasNecessarias = Math.ceil(totalGeral / PRODUCAO_SEMANAL);

  let classificacao = { label: '—', color: 'text-muted-foreground', bg: 'bg-muted/40', desc: '' };
  if (totalGeral > 0) {
    if (totalGeral <= PRODUCAO_SEMANAL) {
      classificacao = { label: '✅ Dentro da capacidade semanal', color: 'text-green-600', bg: 'bg-green-50', desc: `Cabe em 1 semana (cap. ${PRODUCAO_SEMANAL.toLocaleString('pt-BR')}/sem)` };
    } else if (totalGeral <= PRODUCAO_SEMANAL * 2) {
      classificacao = { label: '🟡 2 semanas de produção', color: 'text-amber-600', bg: 'bg-amber-50', desc: 'Organizar fila interna' };
    } else if (totalGeral <= PRODUCAO_SEMANAL * 5) {
      classificacao = { label: '🟠 Organizar produção integral', color: 'text-orange-600', bg: 'bg-orange-50', desc: `${semanasNecessarias} semanas` };
    } else {
      classificacao = { label: '🔴 Capacidade crítica', color: 'text-red-600', bg: 'bg-red-50', desc: `${semanasNecessarias} semanas — revisar OPs` };
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <BarChart2 size={16} className="text-primary" />
            <div>
              <h3 className="font-bold text-foreground">Total em Produção</h3>
              <p className="text-xs text-muted-foreground">A Produzir + Em Produção</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg"><X size={16} className="text-muted-foreground" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground">Selecione os produtos</p>
            <button onClick={toggleTodos} className="text-xs text-primary hover:underline">
              {selecionados.size === todosProdutos.length ? 'Desmarcar todos' : 'Selecionar todos'}
            </button>
          </div>

          {todosProdutos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BarChart2 size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhuma OP ativa.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todosProdutos.map(nome => {
                const grupo = produtosMap[nome];
                const sel = selecionados.has(nome);
                const qtdTotal = grupo.ordens.reduce((s, o) => {
                  const checkKey = `${o.id}_${o.status}`;
                  const qtd = o._isSingleItem ? (o.quantidade || 0) : (o._itemQtd || 0);
                  return s + (checklistOk[checkKey] ? 0 : qtd);
                }, 0);
                const qtdBruto = grupo.ordens.reduce((s, o) => s + (o._isSingleItem ? (o.quantidade || 0) : (o._itemQtd || 0)), 0);
                const descartado = qtdBruto - qtdTotal;
                const aProduzir = grupo.ordens.filter(o => o.status === 'a_produzir').length;
                const emProducao = grupo.ordens.filter(o => o.status === 'em_producao').length;

                return (
                  <button key={nome} onClick={() => toggle(nome)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${sel ? 'border-primary/40 bg-primary/5' : 'border-border bg-card hover:bg-muted/30'}`}>
                    {sel ? <CheckSquare size={15} className="text-primary flex-shrink-0" /> : <Square size={15} className="text-muted-foreground flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{nome}</p>
                      <div className="flex gap-2 text-[10px] text-muted-foreground mt-0.5">
                        {aProduzir > 0 && <span>{aProduzir} OP a produzir</span>}
                        {emProducao > 0 && <span>{emProducao} OP em produção</span>}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold text-foreground">{qtdTotal.toLocaleString('pt-BR')}</p>
                      {descartado > 0 && <p className="text-[10px] text-muted-foreground line-through">{qtdBruto.toLocaleString('pt-BR')}</p>}
                      <p className="text-[10px] text-muted-foreground">un</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-5 py-4 space-y-3 flex-shrink-0">
          {totalGeral > 0 && (
            <div className={`rounded-xl px-4 py-3 ${classificacao.bg}`}>
              <p className={`text-sm font-semibold ${classificacao.color}`}>{classificacao.label}</p>
              {classificacao.desc && <p className="text-xs text-muted-foreground mt-0.5">{classificacao.desc}</p>}
            </div>
          )}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">{selecionados.size} produto{selecionados.size !== 1 ? 's' : ''} selecionado{selecionados.size !== 1 ? 's' : ''}</p>
              <p className="text-[10px] text-muted-foreground/60">Checklist concluído não contabiliza</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-foreground">{totalGeral.toLocaleString('pt-BR')}</p>
              <p className="text-xs text-muted-foreground">unidades pendentes</p>
            </div>
          </div>
          {totalGeral > 0 && (
            <div className="text-xs text-muted-foreground flex justify-between">
              <span>Capacidade semanal: {PRODUCAO_SEMANAL.toLocaleString('pt-BR')} un</span>
              <span className="font-medium text-foreground">{semanasNecessarias} semana{semanasNecessarias !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}