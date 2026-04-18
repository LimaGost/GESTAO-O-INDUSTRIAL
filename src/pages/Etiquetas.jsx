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
        if (prod?.codigo) {
          await base44.entities.Etiqueta.update(etiqueta.id, { codigo_barras: String(prod.codigo) });
        }
      }
    }

    setEtiquetas(data);
  };

  useEffect(() => { load(); }, []);

  const markPrinted = async (keys) => {
    const ids = etiquetas
      .filter(e => keys.includes(e.ordem_producao_id || e.produto_nome))
      .map(e => e.id);
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
      mapaGrupos[key] = {
        key,
        produto_nome: e.produto_nome,
        lote: e.lote,
        data_producao: e.data_producao,
        codigo_barras: e.codigo_barras,
        etiquetas: [],
        totalCopias: 0,
        copiasImpressas: 0,
      };
      grupos.push(mapaGrupos[key]);
    }
    mapaGrupos[key].etiquetas.push(e);
    mapaGrupos[key].totalCopias += (e.quantidade || 1);
    if (e.impresso) mapaGrupos[key].copiasImpressas += (e.quantidade || 1);
  }

  const gruposFiltrados = grupos.filter(g =>
    g.produto_nome.toLowerCase().includes(grupoBusca.toLowerCase())
  );

  const gruposParaModal = grupoModal ? [grupoModal] : gruposFiltrados;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Tag size={19} className="text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Etiquetas</h2>
            <p className="text-xs text-muted-foreground">{etiquetas.filter(e => !e.impresso).length} pendentes · {etiquetas.filter(e => e.impresso).length} impressas</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-muted p-1 rounded-xl">
            {['todas', 'pendentes', 'impressas'].map(f => (
              <button key={f} onClick={() => setFiltro(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${
                  filtro === f ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}>
                {f}
              </button>
            ))}
          </div>
          {readonly && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-3 py-2 rounded-xl">
              <Eye size={13} /> Somente visualização
            </span>
          )}
          {!readonly && gruposFiltrados.length > 0 && (
            <button
              onClick={() => { setGrupoModal(null); setShowModal(true); }}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              <Printer size={14} /> Imprimir Seleção
            </button>
          )}
        </div>
      </div>

      <input
        value={grupoBusca}
        onChange={e => setGrupoBusca(e.target.value)}
        placeholder="Buscar produto..."
        className="w-full border border-border rounded-xl px-4 py-2.5 text-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
      />

      {gruposFiltrados.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Tag size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-sm">Nenhuma etiqueta encontrada.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {gruposFiltrados.map(grupo => {
          const total = grupo.totalCopias;
          const impressas = grupo.copiasImpressas;
          const todasImpressas = grupo.etiquetas.every(e => e.impresso);
          const pendentes = total - impressas;

          return (
            <div key={grupo.key} className={`bg-card border rounded-2xl overflow-hidden hover:shadow-md transition-all ${todasImpressas ? 'border-rainbow-green/30' : 'border-border'}`}>
              {/* Preview da etiqueta */}
              <div className="bg-white p-4 border-b border-dashed border-gray-200" style={{ fontFamily: 'Arial, sans-serif' }}>
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-dashed border-gray-200">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">☀️</span>
                    <div>
                      <p className="font-bold text-xs text-gray-800 leading-tight">RAIO DO SOL</p>
                      <p className="text-gray-400 leading-tight" style={{ fontSize: '9px' }}>Artigos de Umbanda e Candomblé</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-400" style={{ fontSize: '8px' }}>Lote</p>
                    <p className="font-bold text-xs text-gray-800">{grupo.lote}</p>
                  </div>
                </div>
                <p className="font-bold text-sm text-gray-900 mb-1 truncate">{grupo.produto_nome}</p>
                <div className="flex gap-4 text-xs text-gray-500 mb-2">
                  <span>Qtd: <strong className="text-gray-800">{total} un</strong></span>
                  <span>Data: <strong className="text-gray-800">{grupo.data_producao}</strong></span>
                </div>
                {grupo.codigo_barras && (
                  <div className="border-t border-dashed border-gray-200 pt-2 text-center">
                    <img
                      src={`https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(grupo.codigo_barras)}&code=Code128&dpi=72&unit=Min&color=%23000000&bgcolor=%23ffffff&quiet=0&width=200&height=35`}
                      alt="Código de barras"
                      className="h-7 object-contain mx-auto"
                      onError={e => e.target.style.display = 'none'}
                    />
                    <p className="text-xs text-gray-400 font-mono mt-0.5">{grupo.codigo_barras}</p>
                  </div>
                )}
              </div>

              {/* Rodapé */}
              <div className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${todasImpressas ? 'bg-rainbow-green/15' : 'bg-sun-yellow/15'}`}>
                    {todasImpressas
                      ? <Check size={15} className="text-rainbow-green" />
                      : <Layers size={15} className="text-sun-yellow" />
                    }
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground leading-tight">{total} etiqueta{total !== 1 ? 's' : ''}</p>
                    <p className="text-xs text-muted-foreground leading-tight">
                      {todasImpressas
                        ? 'Todas impressas'
                        : `${pendentes} pendente${pendentes !== 1 ? 's' : ''} · ${impressas} impressa${impressas !== 1 ? 's' : ''}`
                      }
                    </p>
                  </div>
                </div>

                {!readonly ? (
                  <button
                    onClick={() => { setGrupoModal(grupo); setShowModal(true); }}
                    disabled={todasImpressas}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      todasImpressas
                        ? 'bg-muted text-muted-foreground cursor-default'
                        : 'bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground'
                    }`}
                  >
                    <Printer size={13} />
                    {todasImpressas ? 'Impresso' : 'Imprimir'}
                  </button>
                ) : (
                  <span className="text-xs text-muted-foreground px-3 py-2">
                    {todasImpressas ? '✓ Impresso' : `${total} etiqueta${total !== 1 ? 's' : ''}`}
                  </span>
                )}
              </div>

              {/* Barra de progresso */}
              {!todasImpressas && (
                <div className="h-1 bg-muted">
                  <div
                    className="h-full bg-rainbow-green transition-all"
                    style={{ width: `${total > 0 ? (impressas / total) * 100 : 0}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showModal && (
        <ModalImpressao
          grupos={gruposParaModal}
          onClose={() => { setShowModal(false); setGrupoModal(null); }}
          onMarkPrinted={markPrinted}
        />
      )}
    </div>
  );
}