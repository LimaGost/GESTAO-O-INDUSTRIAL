import { useState, useMemo } from 'react';
import { X, ArrowRight, CheckCircle, Package, CheckSquare, Square, Trash2, Printer } from 'lucide-react';
import ModalDescarte from './ModalDescarte';
import { imprimirEtiquetaProduto } from '@/lib/imprimirEtiquetaProduto';

function agruparPorCategoria(itens, produtos) {
  const map = {};
  for (const item of itens) {
    const prod = produtos?.find(p => p.id === item.produto_id);
    const categoria = prod?.categoria || item.produto_nome;
    if (!map[categoria]) map[categoria] = [];
    map[categoria].push(item);
  }
  return map;
}

const LABELS_BOTAO = {
  a_produzir: 'Iniciar Produção', em_producao: 'Finalizar Produção',
  produzido: 'Enviar p/ Embalagem', em_embalagem: 'Finalizar',
};

const PROXIMOS = {
  a_produzir: 'em_producao', em_producao: 'produzido',
  produzido: 'em_embalagem', em_embalagem: 'finalizado',
};

function getStorageKey(ordemId, status) { return `checklist_${ordemId}_${status}`; }
function loadFromStorage(key) { try { return JSON.parse(localStorage.getItem(key)) || {}; } catch { return {}; } }
function saveToStorage(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

export default function KanbanCardModal({ ordem, checklistConfigs = {}, produtos = [], onAvancar, loading, onClose, onChecklistChange }) {
  const [showDescarte, setShowDescarte] = useState(false);
  const checkKey = `${ordem.id}_${ordem.status}`;

  const itensEtapa = checklistConfigs[ordem.status]?.itens || [];
  const [checkEtapa, setCheckEtapa] = useState(() => loadFromStorage(getStorageKey(checkKey, 'etapa')));
  const [checkItens, setCheckItens] = useState(() => loadFromStorage(getStorageKey(checkKey, 'prod')));

  const itensNormalizados = useMemo(() => {
    if (ordem.itens?.length > 0) return ordem.itens;
    if (ordem.produto_id) return [{ produto_id: ordem.produto_id, produto_nome: ordem.produto_nome, quantidade: ordem.quantidade || 0 }];
    return [];
  }, [ordem]);

  const porCategoria = useMemo(() => {
    if (!itensNormalizados.length) return null;
    return agruparPorCategoria(itensNormalizados, produtos);
  }, [itensNormalizados, produtos]);

  const totalItens = itensNormalizados.length;
  const totalItensChecked = Object.values(checkItens).filter(Boolean).length;

  const toggleItem = (itemKey) => {
    const next = { ...checkItens, [itemKey]: !checkItens[itemKey] };
    setCheckItens(next);
    saveToStorage(getStorageKey(checkKey, 'prod'), next);
  };

  const [descartarAtivo, setDescartarAtivo] = useState(null);
  const [descarteRegistrado, setDescarteRegistrado] = useState(null);

  const itensOPCompleto = totalItens === 0 || totalItensChecked === totalItens;
  const etapaCompleto = itensEtapa.length === 0 || itensEtapa.every((_, i) => checkEtapa[i]);
  const descarteRespondido = ordem.status !== 'em_embalagem' || descartarAtivo !== null;
  const descartePreenchido = descartarAtivo !== true || descarteRegistrado !== null;
  const tudoCompleto = etapaCompleto && descarteRespondido && descartePreenchido;

  const toggleEtapa = (i) => {
    const next = { ...checkEtapa, [i]: !checkEtapa[i] };
    setCheckEtapa(next);
    saveToStorage(getStorageKey(checkKey, 'etapa'), next);
  };

  const qtdTotal = ordem.itens?.length > 0
    ? ordem.itens.reduce((s, i) => s + (i.quantidade || 0), 0)
    : (ordem.quantidade || 0);

  const handleAvancar = () => {
    if (!etapaCompleto) { alert('⚠️ Complete todos os itens do checklist antes de avançar!'); return; }
    if (!descarteRespondido) { alert('⚠️ Informe se houve descarte antes de finalizar.'); return; }
    if (descartarAtivo === true && !descarteRegistrado) { alert('Preencha o descarte antes de finalizar.'); return; }
    onAvancar(ordem, descarteRegistrado?.length > 0 ? descarteRegistrado : null);
  };

  const MOTIVO_LABEL = {
    defeito_fabricacao: 'Defeito de Fabricação', contaminacao: 'Contaminação',
    quebra: 'Quebra / Dano Físico', vencimento: 'Vencimento', erro_processo: 'Erro de Processo', outros: 'Outros',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
          <div>
            <h3 className="font-bold text-foreground">{ordem.numero}</h3>
            {ordem.pedido_numero && <p className="text-xs text-muted-foreground">📋 Pedido {ordem.pedido_numero}</p>}
            <p className="text-xs text-muted-foreground mt-0.5">
              {ordem.itens?.length > 0 ? `${ordem.itens.length} produto(s) — ${qtdTotal} un` : `${ordem.produto_nome} — ${qtdTotal} un`}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg"><X size={16} className="text-muted-foreground" /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Itens da OP */}
          {porCategoria && (
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b border-border">
                <p className="text-xs font-semibold text-foreground">Itens da Ordem</p>
                <p className="text-xs text-muted-foreground">{totalItensChecked}/{totalItens} confirmados</p>
              </div>
              {Object.entries(porCategoria).map(([categoria, itens]) => (
                <div key={categoria}>
                  <div className="flex items-center justify-between px-4 py-2 bg-muted/20">
                    <p className="text-xs font-semibold text-muted-foreground">{categoria}</p>
                    <p className="text-xs text-muted-foreground">{itens.reduce((s, i) => s + (i.quantidade || 0), 0)} un total</p>
                  </div>
                  {itens.map((item, idx) => {
                    const itemKey = `${item.produto_id || item.produto_nome}`;
                    const checked = !!checkItens[itemKey];
                    const variacao = item.produto_nome.startsWith(categoria) ? item.produto_nome.slice(categoria.length).trim() : item.produto_nome;
                    return (
                      <button key={idx} onClick={onAvancar ? () => toggleItem(itemKey) : undefined} disabled={!onAvancar}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 border-b border-border/50 transition-colors text-left ${onAvancar ? 'hover:bg-muted/40' : 'cursor-default'}`}>
                        {checked ? <CheckSquare size={14} className="text-green-500 flex-shrink-0" /> : <Square size={14} className="text-muted-foreground flex-shrink-0" />}
                        <span className={`text-sm flex-1 ${checked ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{variacao || item.produto_nome}</span>
                        <span className="text-xs text-muted-foreground font-medium">{item.quantidade} un</span>
                      </button>
                    );
                  })}
                </div>
              ))}
              {!itensOPCompleto && <p className="text-xs text-amber-600 px-4 py-2 bg-amber-50">⚠️ Confirme todos os itens para avançar</p>}
            </div>
          )}

          {/* Checklist da Etapa */}
          {itensEtapa.length > 0 && (
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b border-border">
                <p className="text-xs font-semibold text-foreground">Checklist da Etapa</p>
                <p className="text-xs text-muted-foreground">{itensEtapa.filter((_, i) => checkEtapa[i]).length}/{itensEtapa.length}</p>
              </div>
              {itensEtapa.map((item, i) => (
                <button key={i} onClick={onAvancar ? () => toggleEtapa(i) : undefined} disabled={!onAvancar}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 border-b border-border/50 transition-colors text-left ${onAvancar ? 'hover:bg-muted/40' : 'cursor-default'}`}>
                  {checkEtapa[i] ? <CheckSquare size={14} className="text-green-500 flex-shrink-0" /> : <Square size={14} className="text-muted-foreground flex-shrink-0" />}
                  <span className={`text-sm ${checkEtapa[i] ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{item}</span>
                </button>
              ))}
              {!etapaCompleto && <p className="text-xs text-amber-600 px-4 py-2 bg-amber-50">Complete todos os itens para avançar</p>}
            </div>
          )}

          {/* Lote / Obs */}
          {(ordem.lote || ordem.observacoes) && (
            <div className="bg-muted/30 rounded-xl p-3 space-y-1 text-xs">
              {ordem.lote && <p className="text-muted-foreground">Lote: <strong className="text-foreground">{ordem.lote}</strong></p>}
              {ordem.observacoes && <p className="text-muted-foreground italic">{ordem.observacoes}</p>}
            </div>
          )}

          {/* Descarte */}
          {onAvancar && ordem.status === 'em_embalagem' && (
            <div className="border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">Houve descarte? *</p>
                {descartarAtivo === null && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">obrigatório</span>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setDescartarAtivo(false); setDescarteRegistrado(null); }}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${descartarAtivo === false ? 'bg-green-100 border-green-300 text-green-700' : 'border-border text-muted-foreground hover:border-green-300 hover:text-green-700'}`}>
                  ✓ Não houve descarte
                </button>
                <button onClick={() => { setDescartarAtivo(true); setShowDescarte(true); }}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${descartarAtivo === true ? 'bg-red-100 border-red-300 text-red-700' : 'border-border text-muted-foreground hover:border-red-300 hover:text-red-700'}`}>
                  ⚠️ Sim, houve descarte
                </button>
              </div>
              {descartarAtivo === true && descarteRegistrado?.length > 0 && (
                <div className="bg-red-50 rounded-xl p-3 text-xs space-y-1">
                  <p className="font-semibold text-red-700">• {descarteRegistrado.length} descarte{descarteRegistrado.length !== 1 ? 's' : ''} registrado{descarteRegistrado.length !== 1 ? 's' : ''}</p>
                  {descarteRegistrado.map((d, i) => (
                    <p key={i} className="text-red-600">{d.produto_nome}: {d.quantidade} un — {MOTIVO_LABEL[d.motivo] || d.motivo}</p>
                  ))}
                  <button onClick={() => setShowDescarte(true)} className="text-red-500 underline text-[10px]">Editar</button>
                </div>
              )}
              {descartarAtivo === true && !descarteRegistrado && (
                <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">⚠️ Preencha o formulário de descarte para continuar</p>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="space-y-2">
            {onAvancar && ordem.status === 'em_embalagem' && (
              <button onClick={() => {
                const itensParaImprimir = ordem.itens?.length > 0 ? ordem.itens
                  : ordem.produto_id ? [{ produto_nome: ordem.produto_nome, quantidade: ordem.quantidade || 0 }] : [];
                itensParaImprimir.forEach(item => {
                  imprimirEtiquetaProduto({
                    produto_nome: item.produto_nome, quantidade: item.quantidade,
                    lote: ordem.lote || '—',
                    data_producao: ordem.data_embalagem?.slice(0, 10) || new Date().toISOString().slice(0, 10),
                    codigo_barras: item.produto_id || item.produto_nome,
                  });
                });
              }} className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold border border-primary/30 text-primary hover:bg-primary/10 transition-colors">
                <Printer size={13} /> Imprimir Etiquetas
              </button>
            )}

            {onAvancar && ordem.status !== 'finalizado' && (
              <button onClick={() => setShowDescarte(true)}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                <Trash2 size={13} /> Registrar Descarte Avulso
              </button>
            )}

            <div className="flex gap-3">
              {PROXIMOS[ordem.status] && onAvancar && (
                <button onClick={handleAvancar} disabled={loading || !tudoCompleto}
                  className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2">
                  <ArrowRight size={15} /> {loading ? 'Avançando...' : `${LABELS_BOTAO[ordem.status] || 'Avançar'}`}
                </button>
              )}
              {!PROXIMOS[ordem.status] && ordem.status === 'finalizado' && (
                <div className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-green-100 text-green-700">
                  <CheckCircle size={15} /> Finalizado
                </div>
              )}
              <button onClick={onClose} className="px-4 border border-border rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors">
                Fechar
              </button>
            </div>
          </div>
        </div>
      </div>

      {showDescarte && (
        <ModalDescarte ordem={ordem} produtos={produtos}
          onClose={() => setShowDescarte(false)}
          onSalvo={(itens) => { setDescarteRegistrado(itens); setDescartarAtivo(true); setShowDescarte(false); }}
        />
      )}
    </div>
  );
}