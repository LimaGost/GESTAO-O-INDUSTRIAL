import { useState } from 'react';
import { X, Printer, Package } from 'lucide-react';
import { imprimirEtiquetaProduto } from '@/lib/imprimirEtiquetaProduto';

export default function ModalImpressao({ grupos, onClose, onMarkPrinted }) {
  const [volumes, setVolumes] = useState(() => {
    const m = {};
    grupos.forEach(g => { m[g.key] = 1; });
    return m;
  });

  const [selecionados, setSelecionados] = useState(() => {
    const m = {};
    grupos.forEach(g => { m[g.key] = !g.etiquetas.every(e => e.impresso); });
    return m;
  });

  const toggleSelecionado = (key) => {
    setSelecionados(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleImprimir = () => {
    const alvos = grupos.filter(g => selecionados[g.key]);
    if (alvos.length === 0) return alert('Selecione ao menos um produto para imprimir.');

    alvos.forEach(g => {
      const num_volumes = volumes[g.key] || 1;
      imprimirEtiquetaProduto({
        produto_nome: g.produto_nome,
        quantidade: g.totalCopias,
        lote: g.lote,
        data_producao: g.data_producao,
        codigo_barras: g.codigo_barras,
        num_volumes,
      });
    });

    onMarkPrinted(alvos.map(g => g.key));
    onClose();
  };

  const totalVolumes = grupos
    .filter(g => selecionados[g.key])
    .reduce((s, g) => s + (volumes[g.key] || 1), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <Printer size={18} className="text-primary" />
            <h3 className="font-bold text-foreground">Imprimir Etiquetas</h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground">
            <X size={16} />
          </button>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {grupos.map(g => {
            const impresso = g.etiquetas.every(e => e.impresso);
            const numVol = volumes[g.key] || 1;
            return (
              <div
                key={g.key}
                className={`rounded-xl border p-3 transition-all ${
                  selecionados[g.key] ? 'border-primary/40 bg-primary/5' : 'border-border bg-background'
                } ${impresso ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center gap-3">
                  {/* Checkbox */}
                  <button
                    onClick={() => !impresso && toggleSelecionado(g.key)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      selecionados[g.key] ? 'bg-primary border-primary' : 'border-border bg-background'
                    }`}
                  >
                    {selecionados[g.key] && <div className="w-2 h-2 bg-white rounded-sm" />}
                  </button>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{g.produto_nome}</p>
                    <p className="text-xs text-muted-foreground">Lote: {g.lote} · {g.data_producao} · {g.totalCopias} un</p>
                  </div>
                </div>

                {/* Volumes por produto */}
                {!impresso && (
                  <div className="mt-3 flex items-center gap-3 pl-8">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Package size={12} />
                      <span className="font-medium">Volumes/Caixas:</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setVolumes(prev => ({ ...prev, [g.key]: Math.max(1, (prev[g.key] || 1) - 1) }))}
                        className="w-7 h-7 rounded-lg bg-muted hover:bg-muted/70 flex items-center justify-center text-foreground font-bold transition-colors"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={numVol}
                        onChange={e => setVolumes(prev => ({ ...prev, [g.key]: Math.max(1, parseInt(e.target.value) || 1) }))}
                        className="w-14 text-center border border-border rounded-lg py-1 text-sm font-bold bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                      <button
                        onClick={() => setVolumes(prev => ({ ...prev, [g.key]: (prev[g.key] || 1) + 1 }))}
                        className="w-7 h-7 rounded-lg bg-muted hover:bg-muted/70 flex items-center justify-center text-foreground font-bold transition-colors"
                      >
                        +
                      </button>
                    </div>
                    {numVol > 1 && (
                      <div className="flex gap-1 flex-wrap ml-1">
                        {Array.from({ length: numVol }).map((_, i) => (
                          <span key={i} className="text-[10px] bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded">
                            {i + 1}/{numVol}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border flex-shrink-0 space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{grupos.filter(g => selecionados[g.key]).length} produto(s) selecionado(s)</span>
            <span className="font-semibold text-foreground">{totalVolumes} etiqueta(s) no total</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleImprimir}
              className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              <Printer size={15} /> Imprimir
            </button>
            <button
              onClick={onClose}
              className="px-4 border border-border rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}