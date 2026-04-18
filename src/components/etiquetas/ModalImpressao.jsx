import { useState } from 'react';
import { X, Printer, Check } from 'lucide-react';
import { imprimirEtiquetaProduto } from '@/lib/imprimirEtiquetaProduto';

export default function ModalImpressao({ grupos, onClose, onMarkPrinted }) {
  const [modo, setModo] = useState('todos');
  const [qtds, setQtds] = useState(() => {
    const m = {};
    grupos.forEach(g => { m[g.key] = g.totalCopias; });
    return m;
  });
  const [selecionados, setSelecionados] = useState(() => {
    const m = {};
    grupos.forEach(g => { m[g.key] = !g.etiquetas.every(e => e.impresso); });
    return m;
  });

  const toggleSelecionado = (key) => setSelecionados(prev => ({ ...prev, [key]: !prev[key] }));

  const handleImprimir = () => {
    const alvos = grupos.filter(g => modo === 'todos' ? selecionados[g.key] : true);
    if (alvos.length === 0) return alert('Selecione ao menos um produto.');
    alvos.forEach(g => {
      imprimirEtiquetaProduto({
        produto_nome: g.produto_nome, quantidade: qtds[g.key] || g.totalCopias,
        lote: g.lote, data_producao: g.data_producao, codigo_barras: g.codigo_barras,
      });
    });
    onMarkPrinted(alvos.map(g => g.key));
    onClose();
  };

  const totalSelecionado = grupos.filter(g => selecionados[g.key]).reduce((s, g) => s + (qtds[g.key] || g.totalCopias), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="font-bold text-foreground">Imprimir Etiquetas</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex gap-2">
            {[['todos', 'Selecionar produtos'], ['individual', 'Definir quantidades']].map(([m, label]) => (
              <button key={m} onClick={() => setModo(m)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                  modo === m ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
                }`}>{label}</button>
            ))}
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {grupos.map(g => {
              const impresso = g.etiquetas.every(e => e.impresso);
              return (
                <div key={g.key} className={`flex items-center gap-3 p-3 rounded-xl border ${selecionados[g.key] ? 'border-primary/40 bg-primary/5' : 'border-border'}`}>
                  {modo === 'todos' && (
                    <button onClick={() => !impresso && toggleSelecionado(g.key)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        selecionados[g.key] ? 'bg-primary border-primary' : 'border-border bg-background'
                      }`}>
                      {selecionados[g.key] && <Check size={11} className="text-primary-foreground" />}
                    </button>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{g.produto_nome}</p>
                    <p className="text-xs text-muted-foreground">Lote: {g.lote} · {g.data_producao}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => setQtds(prev => ({ ...prev, [g.key]: Math.max(1, (prev[g.key] || 1) - 1) }))}
                      className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center font-bold text-foreground">−</button>
                    <input type="number" value={qtds[g.key] || g.totalCopias}
                      onChange={e => setQtds(prev => ({ ...prev, [g.key]: Math.max(1, parseInt(e.target.value) || 1) }))}
                      className="w-12 text-center border border-border rounded-lg py-1 text-sm font-bold bg-background text-foreground focus:outline-none" />
                    <button onClick={() => setQtds(prev => ({ ...prev, [g.key]: (prev[g.key] || 1) + 1 }))}
                      className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center font-bold text-foreground">+</button>
                    <span className="text-xs text-muted-foreground">un</span>
                  </div>
                </div>
              );
            })}
          </div>

          {modo === 'todos' && (
            <div className="text-xs text-muted-foreground">
              {grupos.filter(g => selecionados[g.key]).length} produto(s) · {totalSelecionado} etiqueta(s)
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={handleImprimir}
              className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
              <Printer size={16} /> Imprimir
            </button>
            <button onClick={onClose} className="px-4 border border-border rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}