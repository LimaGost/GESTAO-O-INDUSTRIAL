import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { imprimirEtiquetaProduto, getConfigEtiqueta } from '@/lib/imprimirEtiquetaProduto';
import { gerarLote } from '@/lib/numeracao';
import { hojeData } from '@/lib/brasilia';
import EstudioPreview from '@/components/etiquetas/EstudioPreview';
import EstudioConfigBar from '@/components/etiquetas/EstudioConfigBar';
import HistoricoImpressao from '@/components/etiquetas/HistoricoImpressao';
import { Tag, Printer, Search, X, Wand2, Minus, Plus } from 'lucide-react';

export default function EstudioEtiquetas() {
  const [config, setConfig] = useState(getConfigEtiqueta);
  const [produtos, setProdutos] = useState([]);
  const [buscaProduto, setBuscaProduto] = useState('');
  const [showBusca, setShowBusca] = useState(false);
  const [dados, setDados] = useState({
    produto_nome: '',
    codigo_barras: '',
    lote: '',
    data_producao: hojeData(),
  });
  const [quantidade, setQuantidade] = useState(1);
  const [historicoKey, setHistoricoKey] = useState(0);

  useEffect(() => {
    base44.entities.Produto.list().then(setProdutos).catch(() => {});
    const onSettings = () => setConfig(getConfigEtiqueta());
    window.addEventListener('settings:saved', onSettings);
    return () => window.removeEventListener('settings:saved', onSettings);
  }, []);

  const selecionarProduto = (p) => {
    setDados(d => ({ ...d, produto_nome: p.nome, codigo_barras: p.codigo ? String(p.codigo) : '' }));
    setShowBusca(false);
    setBuscaProduto('');
  };

  const imprimir = () => {
    if (!dados.produto_nome.trim()) return alert('Informe o nome do produto.');
    imprimirEtiquetaProduto({
      produto_nome: dados.produto_nome,
      quantidade,
      lote: dados.lote,
      data_producao: dados.data_producao,
      codigo_barras: dados.codigo_barras,
      num_volumes: quantidade,
    });
    // Registra no histórico local
    try {
      const hist = JSON.parse(localStorage.getItem('estudio_etiquetas_historico') || '[]');
      hist.unshift({ ...dados, quantidade, data_impressao: new Date().toISOString() });
      localStorage.setItem('estudio_etiquetas_historico', JSON.stringify(hist.slice(0, 30)));
    } catch {}
    setHistoricoKey(k => k + 1);
  };

  const produtosFiltrados = buscaProduto.trim()
    ? produtos.filter(p =>
        (p.nome || '').toLowerCase().includes(buscaProduto.toLowerCase()) ||
        (p.codigo || '').toString().toLowerCase().includes(buscaProduto.toLowerCase()))
    : produtos;

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Tag size={19} className="text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Estúdio de Etiquetas</h2>
          <p className="text-xs text-muted-foreground">Monte, visualize e imprima etiquetas com a configuração ativa</p>
        </div>
      </div>

      <EstudioConfigBar config={config} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* ── Editor ── */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Conteúdo da Etiqueta</p>

          {/* Produto */}
          <div className="relative">
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Produto</label>
            <div className="flex items-center gap-2 border border-border rounded-xl px-3 py-2.5 bg-background">
              <Search size={14} className="text-muted-foreground flex-shrink-0" />
              <input
                value={showBusca ? buscaProduto : dados.produto_nome}
                onChange={e => { setBuscaProduto(e.target.value); setShowBusca(true); }}
                onFocus={() => setShowBusca(true)}
                placeholder="Buscar produto cadastrado ou digitar nome livre..."
                className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground" />
              {(dados.produto_nome || buscaProduto) && (
                <button onClick={() => { setDados(d => ({ ...d, produto_nome: '', codigo_barras: '' })); setBuscaProduto(''); setShowBusca(false); }}
                  className="text-muted-foreground hover:text-foreground"><X size={13} /></button>
              )}
            </div>
            {showBusca && (
              <div className="absolute z-20 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-border rounded-xl shadow-lg divide-y divide-border/40">
                {buscaProduto.trim() && (
                  <button onClick={() => { setDados(d => ({ ...d, produto_nome: buscaProduto })); setShowBusca(false); setBuscaProduto(''); }}
                    className="w-full px-3 py-2 text-left text-sm text-primary font-medium hover:bg-muted/50">
                    Usar texto livre: “{buscaProduto}”
                  </button>
                )}
                {produtosFiltrados.slice(0, 30).map(p => (
                  <button key={p.id} onClick={() => selecionarProduto(p)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-muted/50">
                    <span className="text-sm text-foreground truncate">{p.nome}</span>
                    {p.codigo && <span className="text-[10px] text-muted-foreground font-mono flex-shrink-0">{p.codigo}</span>}
                  </button>
                ))}
                {produtosFiltrados.length === 0 && !buscaProduto.trim() && (
                  <p className="text-xs text-muted-foreground text-center py-3">Nenhum produto cadastrado</p>
                )}
              </div>
            )}
          </div>

          {/* Código de barras */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Código de barras (SKU)</label>
            <input value={dados.codigo_barras}
              onChange={e => setDados(d => ({ ...d, codigo_barras: e.target.value }))}
              placeholder="Deixe vazio para não imprimir código"
              className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>

          {/* Lote + Data */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Lote</label>
              <div className="flex gap-1.5">
                <input value={dados.lote}
                  onChange={e => setDados(d => ({ ...d, lote: e.target.value }))}
                  placeholder="—"
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary" />
                <button onClick={() => setDados(d => ({ ...d, lote: gerarLote(d.produto_nome || 'ETQ') }))}
                  title="Gerar lote automático"
                  className="px-2.5 border border-border rounded-xl text-muted-foreground hover:bg-muted hover:text-primary transition-colors flex-shrink-0">
                  <Wand2 size={13} />
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Data de produção</label>
              <input type="date" value={dados.data_producao}
                onChange={e => setDados(d => ({ ...d, data_producao: e.target.value }))}
                className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>

          {/* Quantidade */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Quantidade de etiquetas</label>
            <div className="flex items-center gap-2">
              <button onClick={() => setQuantidade(q => Math.max(1, q - 1))}
                className="w-9 h-9 rounded-xl bg-muted hover:bg-muted/70 flex items-center justify-center text-foreground transition-colors"><Minus size={14} /></button>
              <input type="number" min="1" value={quantidade}
                onChange={e => setQuantidade(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 text-center border border-border rounded-xl py-2 text-sm font-bold bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
              <button onClick={() => setQuantidade(q => q + 1)}
                className="w-9 h-9 rounded-xl bg-muted hover:bg-muted/70 flex items-center justify-center text-foreground transition-colors"><Plus size={14} /></button>
              {config.colunas > 1 && (
                <span className="text-[10px] text-muted-foreground ml-1">
                  = {Math.ceil(quantidade / config.colunas)} linha(s) de {config.colunas}
                </span>
              )}
            </div>
          </div>

          <button onClick={imprimir}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity shadow-sm">
            <Printer size={16} /> Imprimir {quantidade} etiqueta{quantidade !== 1 ? 's' : ''}
          </button>
          <p className="text-[10px] text-muted-foreground text-center">
            {config.linguagem === 'html'
              ? 'Abrirá a janela de impressão do navegador no tamanho exato da bobina.'
              : 'Será baixado um arquivo .prn — envie direto à impressora.'}
          </p>
        </div>

        {/* ── Preview + Histórico ── */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-2xl p-5">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Pré-visualização</p>
            <EstudioPreview config={config} dados={dados} />
          </div>
          <HistoricoImpressao key={historicoKey}
            onReimprimir={(item) => {
              setDados({ produto_nome: item.produto_nome, codigo_barras: item.codigo_barras || '', lote: item.lote || '', data_producao: item.data_producao || hojeData() });
              setQuantidade(item.quantidade || 1);
            }} />
        </div>
      </div>
    </div>
  );
}