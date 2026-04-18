import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Tag, Printer, Check, Layers, Eye } from 'lucide-react';
import { imprimirEtiquetaProduto } from '@/lib/imprimirEtiquetaProduto';
import ModalImpressao from '@/components/etiquetas/ModalImpressao';
import { usePermissoes } from '@/lib/usePermissoes.jsx';

export default function Etiquetas() {
  const { somenteLeitura } = usePermissoes();
  const readonly = somenteLeitura('Etiquetas');
  const [etiquetas, setEtiquetas] = useState([]);
  const [filtro, setFiltro] = useState('todas');
  const [grupoBusca, setGrupoBusca] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [grupoModal, setGrupoModal] = useState(null);

  const load = async () => {
    const [data, produtos] = await Promise.all([
      base44.entities.Etiqueta.list('-created_date'),
      base44.entities.Produto.list(),
    ]);
    for (const etiqueta of data) {
      if (!etiqueta.codigo_barras && etiqueta.produto_id) {
        const prod = produtos.find(p => p.id === etiqueta.produto_id);
        if (prod?.codigo) await base44.entities.Etiqueta.update(etiqueta.id, { codigo_barras: String(prod.codigo) });
      }
    }
    setEtiquetas(data);
  };

  useEffect(() => { load(); }, []);

  const markPrinted = async (keys) => {
    const ids = etiquetas.filter(e => keys.includes(e.ordem_producao_id || e.produto_nome)).map(e => e.id);
    setEtiquetas(prev => prev.map(e => ids.includes(e.id) ? { ...e, impresso: true } : e));
    ids.forEach(id => base44.entities.Etiqueta.update(id, { impresso: true }));
  };

  const filtered = etiquetas.filter(e => {
    if (filtro === 'impressas') return e.impresso;
    if (filtro === 'pendentes') return !e.impresso;
    return true;
  });

  const grupos = [];
  const mapaGrupos = {};
  for (const e of filtered) {
    const key = e.ordem_producao_id || e.produto_nome;
    if (!mapaGrupos[key]) {
      mapaGrupos[key] = { key, produto_nome: e.produto_nome, lote: e.lote, data_producao: e.data_producao, codigo_barras: e.codigo_barras, etiquetas: [], totalCopias: 0, copiasImpressas: 0 };
      grupos.push(mapaGrupos[key]);
    }
    mapaGrupos[key].etiquetas.push(e);
    mapaGrupos[key].totalCopias += (e.quantidade || 1);
    if (e.impresso) mapaGrupos[key].copiasImpressas += (e.quantidade || 1);
  }

  const gruposFiltrados = grupos.filter(g => g.produto_nome.toLowerCase().includes(grupoBusca.toLowerCase()));
  const gruposParaModal = grupoModal ? [grupoModal] : gruposFiltrados;

  const naoImpressas = etiquetas.filter(e => !e.impresso).length;
  const impressas = etiquetas.filter(e => e.impresso).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-100 flex items-center justify-center">
            <Tag size={19} className="text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Etiquetas</h2>
            <p className="text-xs text-muted-foreground">{naoImpressas} pendente(s) · {impressas} impressa(s)</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Filtros */}
          <div className="flex gap-1 bg-muted p-1 rounded-xl">
            {['todas', 'pendentes', 'impressas'].map(f => (
              <button key={f} onClick={() => setFiltro(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${filtro === f ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                {f}
              </button>
            ))}
          </div>
          {readonly && <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-3 py-2 rounded-xl"><Eye size={13} /> Somente visualização</span>}
          {!readonly && gruposFiltrados.length > 0 && (
            <button onClick={() => { setGrupoModal(null); setShowModal(true); }}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
              <Layers size={14} /> Imprimir Seleção
            </button>
          )}
        </div>
      </div>

      <input value={grupoBusca} onChange={e => setGrupoBusca(e.target.value)}
        placeholder="Buscar produto..."
        className="w-full border border-border rounded-xl px-4 py-2.5 text-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />

      {gruposFiltrados.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-4xl mb-3">🏷️</p>
          <p className="text-sm">Nenhuma etiqueta encontrada.</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {gruposFiltrados.map(grupo => {
          const total = grupo.totalCopias;
          const impressas = grupo.copiasImpressas;
          const todasImpressas = grupo.etiquetas.every(e => e.impresso);
          const pendentes = total - impressas;
          const barcodeUrl = grupo.codigo_barras
            ? `https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(grupo.codigo_barras)}&code=Code128&dpi=72&unit=Min&color=%23000000&bgcolor=%23ffffff&quiet=0&width=200&height=35`
            : null;

          return (
            <div key={grupo.key} className={`bg-card border rounded-2xl overflow-hidden flex flex-col ${todasImpressas ? 'border-border opacity-70' : 'border-blue-200'}`}>
              {/* Preview da etiqueta */}
              <div className="p-4 bg-white border-b border-border">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">☀️</span>
                  <div>
                    <p className="text-xs font-bold text-amber-600">RAIO DO SOL</p>
                    <p className="text-[9px] text-muted-foreground">Gestão Industrial</p>
                  </div>
                </div>
                <p className="text-sm font-bold text-foreground mb-1">{grupo.produto_nome}</p>
                <div className="flex gap-3 text-xs text-muted-foreground">
                  {grupo.lote && <span>Lote: <strong>{grupo.lote}</strong></span>}
                  {grupo.data_producao && <span>Data: <strong>{grupo.data_producao}</strong></span>}
                </div>
                <p className="text-xs text-foreground mt-1">Qtd: <strong>{total} un</strong></p>
                {barcodeUrl && (
                  <div className="mt-2">
                    <img src={barcodeUrl} alt="Código de barras" className="h-8 w-auto" onError={e => e.target.style.display = 'none'} />
                    <p className="text-[9px] text-muted-foreground font-mono mt-0.5">{grupo.codigo_barras}</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs">
                  {todasImpressas
                    ? <Check size={13} className="text-green-500" />
                    : <Printer size={13} className="text-primary" />
                  }
                  <div>
                    <p className="font-medium text-foreground">{total} etiqueta{total !== 1 ? 's' : ''}</p>
                    <p className="text-muted-foreground text-[10px]">
                      {todasImpressas ? 'Todas impressas' : `${pendentes} pendente${pendentes !== 1 ? 's' : ''}`}
                    </p>
                  </div>
                </div>
                {!readonly && (
                  <button onClick={() => { setGrupoModal(grupo); setShowModal(true); }} disabled={todasImpressas}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${todasImpressas ? 'bg-muted text-muted-foreground cursor-default' : 'bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground'}`}>
                    {todasImpressas ? '✓ Impresso' : <><Printer size={12} /> Imprimir</>}
                  </button>
                )}
              </div>

              {/* Barra progresso */}
              {!todasImpressas && total > 0 && (
                <div className="h-1 bg-muted">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(impressas / total) * 100}%` }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showModal && (
        <ModalImpressao grupos={gruposParaModal} onClose={() => { setShowModal(false); setGrupoModal(null); }} onMarkPrinted={markPrinted} />
      )}
    </div>
  );
}