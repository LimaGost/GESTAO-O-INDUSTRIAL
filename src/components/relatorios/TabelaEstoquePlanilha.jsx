import { useMemo } from 'react';
import { FileSpreadsheet, AlertTriangle, CheckCircle, TrendingDown } from 'lucide-react';

/**
 * Gera e exporta o estoque no modelo da planilha:
 * Linhas = produtos agrupados por categoria
 * Colunas = categorias distintas (cada categoria vira um grupo de colunas)
 * Ou, se o produto tiver variações, cada variação vira uma coluna.
 *
 * Neste sistema: cada produto tem estoque_atual. A planilha modelo
 * usa "categorias de produto" como agrupamento de linhas e mostra
 * o estoque atual de cada SKU.
 */

function exportarExcel(produtos) {
  const hoje = new Date().toLocaleDateString('pt-BR');

  // Agrupa por categoria
  const porCategoria = {};
  for (const p of produtos) {
    const cat = p.categoria || 'Sem Categoria';
    if (!porCategoria[cat]) porCategoria[cat] = [];
    porCategoria[cat].push(p);
  }

  // Monta linhas para CSV/Excel
  const linhas = [];

  // Cabeçalho geral
  linhas.push(['RAIO DO SOL — CONTROLE DE ESTOQUE DE PRODUTO ACABADO', '', '', '', '', '']);
  linhas.push([`Gerado em: ${hoje}`, '', '', '', '', '']);
  linhas.push(['', '', '', '', '', '']);

  const totalGeral = { atual: 0, minimo: 0 };

  for (const [cat, prods] of Object.entries(porCategoria)) {
    // Cabeçalho da categoria
    linhas.push([cat.toUpperCase(), 'ESTOQUE ATUAL', 'ESTOQUE MÍNIMO', 'ESTOQUE MÁXIMO', 'SITUAÇÃO', 'ANOTAÇÕES']);

    let subtotalAtual = 0;
    let subtotalMin = 0;

    for (const p of prods) {
      const atual = p.estoque_atual || 0;
      const minimo = p.estoque_minimo || 0;
      const situacao = atual === 0 ? 'ZERADO' : atual <= minimo ? 'ABAIXO DO MÍNIMO' : 'OK';
      linhas.push([p.nome, atual, minimo, p.estoque_maximo || 0, situacao, '']);
      subtotalAtual += atual;
      subtotalMin += minimo;
    }

    linhas.push([`SUBTOTAL ${cat.toUpperCase()}`, subtotalAtual, subtotalMin, '', '', '']);
    linhas.push(['', '', '', '', '', '']);

    totalGeral.atual += subtotalAtual;
    totalGeral.minimo += subtotalMin;
  }

  linhas.push(['TOTAL GERAL', totalGeral.atual, totalGeral.minimo, '', '', '']);

  // Converte para CSV com BOM para Excel reconhecer UTF-8
  const bom = '\uFEFF';
  const csv = linhas.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';')).join('\n');
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `estoque_produto_acabado_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function TabelaEstoquePlanilha({ produtos }) {
  const porCategoria = useMemo(() => {
    const map = {};
    for (const p of produtos) {
      const cat = p.categoria || 'Sem Categoria';
      if (!map[cat]) map[cat] = [];
      map[cat].push(p);
    }
    return map;
  }, [produtos]);

  const totalGeral = useMemo(() => ({
    atual: produtos.reduce((s, p) => s + (p.estoque_atual || 0), 0),
    alerta: produtos.filter(p => (p.estoque_atual || 0) <= (p.estoque_minimo || 0)).length,
    zerado: produtos.filter(p => (p.estoque_atual || 0) === 0).length,
    ok: produtos.filter(p => (p.estoque_atual || 0) > (p.estoque_minimo || 0)).length,
  }), [produtos]);

  return (
    <div className="space-y-4">
      {/* Header com export */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-bold text-foreground">Controle de Estoque — Produto Acabado</h3>
          <p className="text-xs text-muted-foreground">Visão completa por produto e categoria, no modelo da planilha</p>
        </div>
        <button
          onClick={() => exportarExcel(produtos)}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors shadow-sm"
        >
          <FileSpreadsheet size={16} /> Exportar Excel
        </button>
      </div>

      {/* KPIs resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total em Estoque', value: totalGeral.atual, color: 'text-foreground', bg: 'bg-muted/40' },
          { label: '✓ OK', value: totalGeral.ok, color: 'text-green-600', bg: 'bg-green-50 border border-green-200' },
          { label: '▲ Abaixo do mínimo', value: totalGeral.alerta, color: 'text-amber-600', bg: 'bg-amber-50 border border-amber-200' },
          { label: '● Zerado', value: totalGeral.zerado, color: 'text-red-600', bg: 'bg-red-50 border border-red-200' },
        ].map(k => (
          <div key={k.label} className={`rounded-xl p-3 text-center ${k.bg}`}>
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
            <p className="text-xs text-muted-foreground">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Tabela por categoria */}
      <div className="space-y-4">
        {Object.entries(porCategoria).map(([cat, prods]) => {
          const subtotalAtual = prods.reduce((s, p) => s + (p.estoque_atual || 0), 0);
          return (
            <div key={cat} className="bg-card border border-border rounded-2xl overflow-hidden">
              {/* Header categoria */}
              <div className="bg-primary/10 border-b border-border px-4 py-2.5 flex items-center justify-between">
                <span className="font-bold text-foreground text-sm">{cat.toUpperCase()}</span>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{prods.length} SKUs</span>
                  <span className="font-bold text-foreground">Total: {subtotalAtual} un</span>
                </div>
              </div>

              {/* Tabela de produtos */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/30 border-b border-border">
                      <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground w-64">PRODUTO</th>
                      <th className="text-center px-3 py-2 text-xs font-semibold text-muted-foreground">ESTOQUE ATUAL</th>
                      <th className="text-center px-3 py-2 text-xs font-semibold text-muted-foreground">MÍNIMO</th>
                      <th className="text-center px-3 py-2 text-xs font-semibold text-muted-foreground">MÁXIMO</th>
                      <th className="text-center px-3 py-2 text-xs font-semibold text-muted-foreground">SITUAÇÃO</th>
                      <th className="px-3 py-2 w-40">
                        <div className="text-xs font-semibold text-muted-foreground text-center">PROGRESSO</div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {prods.map((p, i) => {
                      const atual = p.estoque_atual || 0;
                      const minimo = p.estoque_minimo || 0;
                      const maximo = p.estoque_maximo || 0;
                      const zerado = atual === 0;
                      const alerta = !zerado && atual <= minimo;
                      const ok = atual > minimo;
                      const pct = minimo > 0 ? Math.min(100, Math.round((atual / (minimo * 2)) * 100)) : atual > 0 ? 100 : 0;

                      return (
                        <tr key={p.id}
                          className={`border-b border-border/50 last:border-0 transition-colors ${zerado ? 'bg-red-50/40' : alerta ? 'bg-amber-50/40' : ''}`}>
                          <td className="px-4 py-2.5">
                            <div>
                              <p className="font-medium text-foreground leading-tight">{p.nome}</p>
                              {p.codigo && <p className="text-[10px] text-muted-foreground font-mono">{p.codigo}</p>}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className={`text-lg font-bold ${zerado ? 'text-red-600' : alerta ? 'text-amber-600' : 'text-foreground'}`}>
                              {atual}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-center text-sm text-muted-foreground">{minimo}</td>
                          <td className="px-3 py-2.5 text-center text-sm text-muted-foreground">{maximo || '—'}</td>
                          <td className="px-3 py-2.5 text-center">
                            {zerado ? (
                              <span className="inline-flex items-center gap-1 text-[10px] bg-red-100 text-red-700 px-2 py-1 rounded-full font-bold">
                                <TrendingDown size={9} /> ZERADO
                              </span>
                            ) : alerta ? (
                              <span className="inline-flex items-center gap-1 text-[10px] bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-bold">
                                <AlertTriangle size={9} /> ALERTA
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">
                                <CheckCircle size={9} /> OK
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${zerado ? 'bg-red-500' : alerta ? 'bg-amber-400' : 'bg-green-500'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <p className="text-[9px] text-muted-foreground text-center mt-0.5">{pct}%</p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {/* Subtotal da categoria */}
                  <tfoot>
                    <tr className="bg-muted/50 border-t-2 border-border">
                      <td className="px-4 py-2 text-xs font-bold text-foreground">SUBTOTAL {cat.toUpperCase()}</td>
                      <td className="px-3 py-2 text-center text-sm font-bold text-foreground">{subtotalAtual}</td>
                      <td colSpan={4} className="px-3 py-2 text-xs text-muted-foreground">
                        ✓ {prods.filter(p => (p.estoque_atual||0) > (p.estoque_minimo||0)).length} ok ·
                        ▲ {prods.filter(p => (p.estoque_atual||0) > 0 && (p.estoque_atual||0) <= (p.estoque_minimo||0)).length} alerta ·
                        ● {prods.filter(p => (p.estoque_atual||0) === 0).length} zerado
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      {/* Total Geral */}
      <div className="bg-primary/5 border border-primary/20 rounded-2xl px-5 py-4 flex items-center justify-between flex-wrap gap-3">
        <span className="font-bold text-foreground text-base">TOTAL GERAL DE ESTOQUE</span>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{totalGeral.atual}</p>
            <p className="text-[10px] text-muted-foreground">unidades</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-green-600">{totalGeral.ok}</p>
            <p className="text-[10px] text-muted-foreground">OK</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-amber-600">{totalGeral.alerta}</p>
            <p className="text-[10px] text-muted-foreground">alerta</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-red-600">{totalGeral.zerado}</p>
            <p className="text-[10px] text-muted-foreground">zerado</p>
          </div>
        </div>
      </div>
    </div>
  );
}