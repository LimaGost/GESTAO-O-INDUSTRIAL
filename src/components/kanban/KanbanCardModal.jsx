import { useState, useMemo, useRef, useEffect } from 'react';
import { X, ArrowRight, CheckCircle, CheckSquare, Square, Trash2, Printer, User, AlertTriangle, Plus, Minus, PackagePlus, Search, Save, Tag, Layers } from 'lucide-react';
import ModalDescarte from './ModalDescarte';
import ModalSobraFracionado from '@/components/fracionado/ModalSobraFracionado';
import AlertaFracionado from '@/components/fracionado/AlertaFracionado';
import { imprimirEtiquetaProduto } from '@/lib/imprimirEtiquetaProduto';
import BadgeSemRotulo from '@/components/common/BadgeSemRotulo';

function buildProximos(colunas) {
  const map = {};
  for (let i = 0; i < colunas.length - 1; i++) map[colunas[i].key] = colunas[i + 1].key;
  return map;
}

const COLUNAS_DEFAULT_KEYS = ['a_produzir', 'em_producao', 'produzido', 'em_embalagem', 'finalizado'];

function loadKanbanColunas() {
  try {
    const saved = JSON.parse(localStorage.getItem('kanban_colunas_config') || 'null');
    if (saved && Array.isArray(saved) && saved.length > 0) return saved;
  } catch {}
  return COLUNAS_DEFAULT_KEYS.map(key => ({ key, label: key }));
}

const MOTIVO_LABEL = {
  defeito_fabricacao: 'Defeito de Fabricação', contaminacao: 'Contaminação',
  quebra: 'Quebra / Dano Físico', vencimento: 'Vencimento', erro_processo: 'Erro de Processo', outros: 'Outros',
};

function getStorageKey(ordemId, status) { return `checklist_modal_${ordemId}_${status}`; }
function loadStorage(key) { try { return JSON.parse(localStorage.getItem(key)) || {}; } catch { return {}; } }
function saveStorage(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

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

export default function KanbanCardModal({ ordem, checklistConfigs = {}, produtos = [], kanbanColunas: kanbanColunasProps, clienteNome, isWhiteLabel, whiteLabelMarca, grupoOrigem, onAvancar, onSalvarItens, loading, onClose }) {
  const kanbanColunas = kanbanColunasProps || loadKanbanColunas();
  const PROXIMOS = buildProximos(kanbanColunas);
  const checkKey = `${ordem.id}_${ordem.status}`;

  const isSeparacao = ordem.status === 'em_separacao';
  const isEtiquetagem = (() => {
    const col = kanbanColunas.find(c => c.key === ordem.status);
    return /etiqueta/i.test(col?.label || '') || /etiqueta/i.test(ordem.status || '');
  })();
  const [itensEditados, setItensEditados] = useState(null);
  const [novoItem, setNovoItem] = useState({ produto_id: '', produto_nome: '', quantidade: 1, estoque: 0 });
  const [showAdicionarItem, setShowAdicionarItem] = useState(false);
  const [buscaProduto, setBuscaProduto] = useState('');
  const [salvandoItens, setSalvandoItens] = useState(false);
  const searchRef = useRef(null);

  const itensEtapa = checklistConfigs[ordem.status]?.itens || [];
  const [checkEtapa, setCheckEtapa] = useState(() => loadStorage(getStorageKey(checkKey, 'etapa')));
  const [checkItens, setCheckItens] = useState(() => loadStorage(getStorageKey(checkKey, 'prod')));

  const [showSobra, setShowSobra] = useState(false);
  const [descartarAtivo, setDescartarAtivo] = useState(null);
  const [descarteRegistrado, setDescarteRegistrado] = useState(null);
  const [showDescarte, setShowDescarte] = useState(false);

  const itensNormalizados = useMemo(() => {
    if (itensEditados !== null) return itensEditados;
    if (ordem.itens?.length > 0) return ordem.itens;
    if (ordem.produto_id) return [{ produto_id: ordem.produto_id, produto_nome: ordem.produto_nome, quantidade: ordem.quantidade || 0 }];
    return [];
  }, [ordem, itensEditados]);

  useEffect(() => {
    if (showAdicionarItem && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [showAdicionarItem]);

  const produtosFiltrados = useMemo(() => {
    if (!buscaProduto.trim()) return produtos;
    const q = buscaProduto.toLowerCase();
    return produtos.filter(p =>
      (p.nome || '').toLowerCase().includes(q) ||
      (p.codigo || '').toLowerCase().includes(q)
    );
  }, [produtos, buscaProduto]);

  const adicionarItem = () => {
    if (!novoItem.produto_id) return;
    const prod = produtos.find(p => p.id === novoItem.produto_id);
    const estoqueDisp = prod?.estoque_atual || 0;
    if (estoqueDisp < novoItem.quantidade) {
      alert(`⚠️ Estoque insuficiente! Disponível: ${estoqueDisp} un de "${novoItem.produto_nome}"`);
      return;
    }
    const base = itensEditados !== null ? itensEditados : (ordem.itens?.length > 0 ? ordem.itens : [{ produto_id: ordem.produto_id, produto_nome: ordem.produto_nome, quantidade: ordem.quantidade || 0 }]);
    const existente = base.findIndex(i => i.produto_id === novoItem.produto_id);
    let novos;
    if (existente >= 0) {
      novos = base.map((i, idx) => idx === existente ? { ...i, quantidade: i.quantidade + novoItem.quantidade } : i);
    } else {
      novos = [...base, { produto_id: novoItem.produto_id, produto_nome: novoItem.produto_nome, quantidade: novoItem.quantidade }];
    }
    setItensEditados(novos);
    setNovoItem({ produto_id: '', produto_nome: '', quantidade: 1, estoque: 0 });
    setBuscaProduto('');
    setShowAdicionarItem(false);
  };

  const alterarQuantidade = (idx, delta) => {
    const base = itensEditados !== null ? itensEditados : (ordem.itens?.length > 0 ? ordem.itens : [{ produto_id: ordem.produto_id, produto_nome: ordem.produto_nome, quantidade: ordem.quantidade || 0 }]);
    const novos = base.map((item, i) => i === idx ? { ...item, quantidade: Math.max(1, item.quantidade + delta) } : item);
    setItensEditados(novos);
  };

  const removerItem = (idx) => {
    const base = itensEditados !== null ? itensEditados : (ordem.itens?.length > 0 ? ordem.itens : [{ produto_id: ordem.produto_id, produto_nome: ordem.produto_nome, quantidade: ordem.quantidade || 0 }]);
    if (base.length <= 1) return alert('A OP precisa ter ao menos 1 item.');
    setItensEditados(base.filter((_, i) => i !== idx));
  };

  const porFamilia = useMemo(() => agruparPorCategoria(itensNormalizados, produtos), [itensNormalizados, produtos]);

  const totalItens = itensNormalizados.length;
  const itensDisponiveis = itensNormalizados.filter(i => i.disponivel === true).length;
  const totalItensChecked = itensDisponiveis + itensNormalizados.filter(i => i.disponivel !== true).filter(i => !!checkItens[`${i.produto_id || i.produto_nome}`]).length;
  const itensOPCompleto = isSeparacao || totalItens === 0 || totalItensChecked === totalItens;

  const etapaCompleto = itensEtapa.length === 0 || itensEtapa.every((_, i) => checkEtapa[i]);

  const temProximo = !!PROXIMOS[ordem.status];
  const descarteRespondido = !temProximo || descartarAtivo !== null;
  const descartePreenchido = descartarAtivo !== true || descarteRegistrado !== null;

  const tudoCompleto = etapaCompleto && itensOPCompleto && descarteRespondido && descartePreenchido;

  const qtdTotal = itensNormalizados.reduce((s, i) => s + (i.quantidade || 0), 0);

  const toggleEtapa = (i) => {
    const next = { ...checkEtapa, [i]: !checkEtapa[i] };
    setCheckEtapa(next);
    saveStorage(getStorageKey(checkKey, 'etapa'), next);
  };

  const toggleItem = (itemKey) => {
    const next = { ...checkItens, [itemKey]: !checkItens[itemKey] };
    setCheckItens(next);
    saveStorage(getStorageKey(checkKey, 'prod'), next);
  };

  const itensComQuantidadeValida = itensNormalizados.every(i => i.quantidade > 0);

  const handleAvancar = () => {
    if (!etapaCompleto) { alert('⚠️ Complete todos os itens do checklist da etapa antes de avançar!'); return; }
    if (!itensOPCompleto) { alert('⚠️ Confirme todos os itens da ordem de produção antes de avançar!'); return; }
    if (isSeparacao && !itensComQuantidadeValida) { alert('⚠️ Todos os itens precisam ter quantidade maior que zero.'); return; }
    if (!descarteRespondido) { alert('⚠️ Informe se houve descarte nesta etapa antes de avançar.'); return; }
    if (descartarAtivo === true && !descarteRegistrado) { alert('Preencha o formulário de descarte antes de continuar.'); return; }
    const ordemFinal = itensEditados !== null ? { ...ordem, itens: itensEditados } : ordem;
    onAvancar(ordemFinal, descarteRegistrado?.length > 0 ? descarteRegistrado : null);
  };

  const checklistPct = itensEtapa.length > 0
    ? Math.round((itensEtapa.filter((_, i) => checkEtapa[i]).length / itensEtapa.length) * 100)
    : 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-foreground">{ordem.numero}</h3>
              {ordem.pedido_numero && (
                <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">📋 {ordem.pedido_numero}</span>
              )}
              {isWhiteLabel && (
                <span className="inline-flex items-center gap-1 text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-bold">
                  <Tag size={8} /> WL{whiteLabelMarca ? ` · ${whiteLabelMarca}` : ''}
                </span>
              )}
              {(ordem.sem_rotulo || (ordem.itens || []).some(i => i.sem_rotulo)) && <BadgeSemRotulo />}
            </div>
            {(clienteNome || ordem.pedido_numero) && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <User size={10} /> {clienteNome || 'Cliente'}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">
              {totalItens > 1 ? `${totalItens} produto(s) — ${qtdTotal} un` : `${ordem.produto_nome} — ${qtdTotal} un`}
            </p>
            <div className="flex items-center gap-1.5 flex-wrap mt-1">
              <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-medium">
                {kanbanColunas.find(c => c.key === ordem.status)?.label || ordem.status}
              </span>
              {grupoOrigem && (
                <span className="inline-flex items-center gap-1 text-[10px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded font-semibold">
                  <Layers size={8} /> Grupo · {grupoOrigem.cliente_nome}
                  {(grupoOrigem.pedidos_numeros || []).length > 0 && (
                    <span className="opacity-70">({(grupoOrigem.pedidos_numeros || []).map(n => `#${n}`).join(' ')}) </span>
                  )}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 space-y-4">

          {/* Alerta de Estoque Fracionado ao separador */}
          {isSeparacao && onAvancar && (
            <AlertaFracionado itens={itensNormalizados} contexto={`OP ${ordem.numero}`} />
          )}

          {/* ── Edição de itens (apenas em_separacao) ── */}
          {isSeparacao && onAvancar && (
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b border-border">
                <div className="flex items-center gap-1.5">
                  <PackagePlus size={13} className="text-primary" />
                  <p className="text-xs font-semibold text-foreground">Itens para Separação</p>
                  {itensEditados !== null && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold">editado</span>}
                </div>
                <button onClick={() => setShowAdicionarItem(v => !v)}
                  className="flex items-center gap-1 text-xs font-semibold text-primary hover:bg-primary/10 px-2 py-1 rounded-lg transition-colors">
                  <Plus size={12} /> Adicionar
                </button>
              </div>

              {/* Lista de itens editável */}
              {itensNormalizados.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 px-4 py-2.5 border-b border-border/40">
                  <span className="text-sm flex-1 text-foreground truncate">{item.produto_nome}</span>
                  {item.sem_rotulo && <BadgeSemRotulo size="sm" />}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => alterarQuantidade(idx, -1)}
                      className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/70 transition-colors">
                      <Minus size={11} className="text-foreground" />
                    </button>
                    <span className="text-sm font-bold text-foreground w-8 text-center">{item.quantidade}</span>
                    <button onClick={() => alterarQuantidade(idx, 1)}
                      className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/70 transition-colors">
                      <Plus size={11} className="text-foreground" />
                    </button>
                    <button onClick={() => removerItem(idx)}
                      className="w-6 h-6 rounded-lg hover:bg-red-50 flex items-center justify-center transition-colors ml-1">
                      <Trash2 size={11} className="text-red-400" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Adicionar novo item */}
              {showAdicionarItem && (
                <div className="px-4 py-3 bg-muted/20 border-t border-border space-y-2">
                  {/* Campo de busca */}
                  <div className="flex items-center gap-2 border border-border rounded-xl px-3 py-2 bg-background">
                    <Search size={13} className="text-muted-foreground flex-shrink-0" />
                    <input
                      ref={searchRef}
                      type="text"
                      value={buscaProduto}
                      onChange={e => setBuscaProduto(e.target.value)}
                      placeholder="Buscar por nome ou SKU..."
                      className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                    />
                    {buscaProduto && (
                      <button onClick={() => setBuscaProduto('')} className="text-muted-foreground hover:text-foreground">
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  {/* Lista filtrada de produtos */}
                  {!novoItem.produto_id && (
                    <div className="max-h-48 overflow-y-auto border border-border rounded-xl bg-background divide-y divide-border/40">
                      {produtosFiltrados.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">Nenhum produto encontrado</p>
                      ) : produtosFiltrados.map(p => {
                        const semEstoque = (p.estoque_atual || 0) <= 0;
                        return (
                          <button key={p.id}
                            onClick={() => setNovoItem(n => ({ ...n, produto_id: p.id, produto_nome: p.nome, estoque: p.estoque_atual || 0 }))}
                            className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-muted/50 ${semEstoque ? 'opacity-60' : ''}`}>
                            {p.foto_url
                              ? <img src={p.foto_url} alt={p.nome} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                              : <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-primary">{p.nome?.charAt(0)}</div>
                            }
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-foreground truncate">{p.nome}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {p.codigo ? `SKU: ${p.codigo} · ` : ''}Est: {p.estoque_atual || 0} un{semEstoque ? ' · ⚠️ Sem estoque' : ''}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Produto selecionado + quantidade */}
                  {novoItem.produto_id && (
                    <div className="border border-primary/30 rounded-xl p-3 bg-primary/5 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {(() => {
                            const p = produtos.find(x => x.id === novoItem.produto_id);
                            return p?.foto_url ? <img src={p.foto_url} alt={p.nome} className="w-7 h-7 rounded object-cover" /> : null;
                          })()}
                          <div>
                            <p className="text-xs font-semibold text-foreground">{novoItem.produto_nome}</p>
                            <p className="text-[10px] text-muted-foreground">Estoque: {novoItem.estoque} un</p>
                          </div>
                        </div>
                        <button onClick={() => setNovoItem({ produto_id: '', produto_nome: '', quantidade: 1, estoque: 0 })}
                          className="text-muted-foreground hover:text-foreground">
                          <X size={12} />
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex items-center gap-1.5 border border-border rounded-xl px-2 py-1.5 bg-background">
                          <button onClick={() => setNovoItem(n => ({ ...n, quantidade: Math.max(1, n.quantidade - 1) }))}
                            className="w-6 h-6 rounded flex items-center justify-center hover:bg-muted"><Minus size={11} /></button>
                          <span className="text-sm font-bold w-6 text-center">{novoItem.quantidade}</span>
                          <button onClick={() => setNovoItem(n => ({ ...n, quantidade: n.quantidade + 1 }))}
                            className="w-6 h-6 rounded flex items-center justify-center hover:bg-muted"><Plus size={11} /></button>
                        </div>
                        <button onClick={adicionarItem}
                          className="flex-1 bg-primary text-primary-foreground rounded-xl text-xs font-semibold hover:opacity-90 transition-opacity">
                          Confirmar
                        </button>
                        <button onClick={() => { setShowAdicionarItem(false); setBuscaProduto(''); }}
                          className="px-3 border border-border rounded-xl text-xs text-muted-foreground hover:bg-muted">
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!itensComQuantidadeValida && (
                <div className="px-4 py-2.5 bg-red-50 text-red-700 text-xs flex items-center gap-1.5">
                  <AlertTriangle size={12} /> Todos os itens precisam ter quantidade maior que zero
                </div>
              )}
            </div>
          )}

          {/* Itens da OP agrupados por família */}
          {!isSeparacao && itensNormalizados.length > 0 && (
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b border-border">
                <p className="text-xs font-semibold text-foreground">Itens da Ordem</p>
                <p className={`text-xs font-semibold ${itensOPCompleto ? 'text-green-600' : 'text-amber-600'}`}>
                  {totalItensChecked}/{totalItens} confirmados
                </p>
              </div>
              {Object.entries(porFamilia).map(([familia, itens]) => (
                <div key={familia}>
                  <div className="flex items-center justify-between px-4 py-2 bg-muted/20 border-b border-border/50">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{familia}</p>
                    <p className="text-[10px] text-muted-foreground">{itens.reduce((s, i) => s + (i.quantidade || 0), 0)} un</p>
                  </div>
                  {itens.map((item, idx) => {
                    const itemKey = `${item.produto_id || item.produto_nome}`;
                    const jaDisponivel = item.disponivel === true;
                    const checked = jaDisponivel || !!checkItens[itemKey];
                    return (
                      <button key={idx}
                        onClick={(!jaDisponivel && onAvancar) ? () => toggleItem(itemKey) : undefined}
                        disabled={jaDisponivel || !onAvancar}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 border-b border-border/40 transition-colors text-left ${(!jaDisponivel && onAvancar) ? 'hover:bg-muted/30' : 'cursor-default'} ${checked ? 'bg-green-50/50' : ''}`}>
                        {checked
                          ? <CheckSquare size={14} className="text-green-500 flex-shrink-0" />
                          : <Square size={14} className="text-muted-foreground flex-shrink-0" />
                        }
                        <span className={`text-sm flex-1 ${checked ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                          {item.produto_nome}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {item.sem_rotulo && <BadgeSemRotulo size="sm" />}
                          {jaDisponivel && (
                            <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-semibold">em estoque</span>
                          )}
                          <span className="text-xs font-semibold text-muted-foreground">{item.quantidade} un</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
              {!itensOPCompleto && (
                <div className="px-4 py-2.5 bg-amber-50 text-amber-700 text-xs flex items-center gap-1.5">
                  <AlertTriangle size={12} /> Confirme todos os itens para avançar
                </div>
              )}
            </div>
          )}

          {/* Checklist da Etapa */}
          {itensEtapa.length > 0 && (
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-border"
                style={{ background: etapaCompleto ? '#F0FDF4' : '#FFFBEB' }}>
                <p className="text-xs font-semibold text-foreground">
                  Checklist — {kanbanColunas.find(c => c.key === ordem.status)?.label || ordem.status}
                </p>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 rounded-full bg-border overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${checklistPct}%`, background: etapaCompleto ? '#22C55E' : '#F59E0B' }} />
                  </div>
                  <p className={`text-xs font-semibold ${etapaCompleto ? 'text-green-600' : 'text-amber-600'}`}>
                    {itensEtapa.filter((_, i) => checkEtapa[i]).length}/{itensEtapa.length}
                  </p>
                </div>
              </div>
              {itensEtapa.map((item, i) => (
                <button key={i}
                  onClick={onAvancar ? () => toggleEtapa(i) : undefined}
                  disabled={!onAvancar}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 border-b border-border/40 transition-colors text-left ${onAvancar ? 'hover:bg-muted/30' : 'cursor-default'} ${checkEtapa[i] ? 'bg-green-50/40' : ''}`}>
                  {checkEtapa[i]
                    ? <CheckSquare size={14} className="text-green-500 flex-shrink-0" />
                    : <Square size={14} className="text-muted-foreground flex-shrink-0" />
                  }
                  <span className={`text-sm ${checkEtapa[i] ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{item}</span>
                </button>
              ))}
              {!etapaCompleto && (
                <div className="px-4 py-2.5 bg-amber-50 text-amber-700 text-xs flex items-center gap-1.5">
                  <AlertTriangle size={12} /> Complete o checklist para liberar o avanço
                </div>
              )}
            </div>
          )}

          {/* Lote / Obs */}
          {(ordem.lote || ordem.observacoes) && (
            <div className="space-y-2">
              {ordem.lote && (
                <div className="bg-muted/30 rounded-xl px-3 py-2 text-xs">
                  <p className="text-muted-foreground">Lote: <strong className="text-foreground">{ordem.lote}</strong></p>
                </div>
              )}
              {ordem.observacoes && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-xs flex gap-2">
                  <span className="text-amber-500 text-base leading-none flex-shrink-0">📝</span>
                  <div>
                    <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide mb-0.5">Obs. do Pedido</p>
                    <p className="text-amber-900">{ordem.observacoes}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Descarte obrigatório em TODAS as etapas */}
          {onAvancar && temProximo && (
            <div className={`border rounded-xl p-4 space-y-3 ${descartarAtivo === null ? 'border-amber-300 bg-amber-50/50' : 'border-border'}`}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">Houve descarte nesta etapa?</p>
                {descartarAtivo === null && (
                  <span className="text-[10px] bg-amber-200 text-amber-700 px-1.5 py-0.5 rounded-full font-bold">obrigatório</span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setDescartarAtivo(false); setDescarteRegistrado(null); }}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-all ${descartarAtivo === false ? 'bg-green-100 border-green-400 text-green-700' : 'border-border text-muted-foreground hover:border-green-300 hover:bg-green-50'}`}>
                  ✓ Não houve descarte
                </button>
                <button
                  onClick={() => { setDescartarAtivo(true); setShowDescarte(true); }}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-all ${descartarAtivo === true ? 'bg-red-100 border-red-400 text-red-700' : 'border-border text-muted-foreground hover:border-red-300 hover:bg-red-50'}`}>
                  ⚠️ Sim, houve descarte
                </button>
              </div>
              {descartarAtivo === true && descarteRegistrado?.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs space-y-1">
                  <p className="font-semibold text-red-700">
                    {descarteRegistrado.length} descarte{descarteRegistrado.length !== 1 ? 's' : ''} registrado{descarteRegistrado.length !== 1 ? 's' : ''}
                  </p>
                  {descarteRegistrado.map((d, i) => (
                    <p key={i} className="text-red-600">{d.produto_nome}: {d.quantidade} un — {MOTIVO_LABEL[d.motivo] || d.motivo}</p>
                  ))}
                  <button onClick={() => setShowDescarte(true)} className="text-red-500 underline text-[10px]">Editar</button>
                </div>
              )}
              {descartarAtivo === true && !descarteRegistrado && (
                <p className="text-xs text-amber-700 bg-amber-100 rounded-lg px-3 py-2 flex items-center gap-1.5">
                  <AlertTriangle size={11} /> Preencha o formulário de descarte para continuar
                </p>
              )}
            </div>
          )}

          {/* Botões de ação */}
          <div className="space-y-2 pt-1">
            {!onAvancar ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold bg-muted text-muted-foreground border border-border">
                  🔒 Somente visualização — sem permissão para avançar
                </div>
                <button onClick={onClose} className="w-full border border-border rounded-xl py-2.5 text-sm text-muted-foreground hover:bg-muted transition-colors">
                  Fechar
                </button>
              </div>
            ) : (
              <>
                {/* Salvar Alterações (apenas em_separacao com itens editados) */}
                {isSeparacao && itensEditados !== null && onSalvarItens && (
                  <button
                    onClick={async () => {
                      setSalvandoItens(true);
                      await onSalvarItens(ordem, itensEditados);
                      setSalvandoItens(false);
                    }}
                    disabled={salvandoItens || !itensComQuantidadeValida}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-green-600 text-white hover:opacity-90 disabled:opacity-40 transition-opacity">
                    <Save size={14} /> {salvandoItens ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                )}

                {/* Imprimir Etiquetas — apenas na etapa de Etiquetagem */}
                {isEtiquetagem && (
                  <button onClick={() => {
                    itensNormalizados.forEach(item => {
                      imprimirEtiquetaProduto({
                        produto_nome: item.produto_nome,
                        quantidade: item.quantidade,
                        lote: ordem.lote || '—',
                        data_producao: ordem.data_embalagem?.slice(0, 10) || new Date().toISOString().slice(0, 10),
                        codigo_barras: item.produto_id || item.produto_nome,
                      });
                    });
                  }} className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold border border-primary/30 text-primary hover:bg-primary/10 transition-colors">
                    <Printer size={13} /> Imprimir Etiquetas
                  </button>
                )}

                {/* Enviar sobra p/ Estoque Fracionado */}
                <button onClick={() => setShowSobra(true)}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold border border-amber-300 text-amber-700 hover:bg-amber-50 transition-colors">
                  <PackagePlus size={13} /> Enviar Sobra p/ Estoque Fracionado
                </button>

                {/* Descarte avulso */}
                <button onClick={() => setShowDescarte(true)}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                  <Trash2 size={13} /> Registrar Descarte Avulso
                </button>

                <div className="flex gap-3">
                  {PROXIMOS[ordem.status] && (
                    <button
                      onClick={handleAvancar}
                      disabled={loading || !tudoCompleto}
                      title={!tudoCompleto ? 'Complete o checklist e informe o descarte para avançar' : ''}
                      className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center justify-center gap-2">
                      <ArrowRight size={15} />
                      {loading ? 'Avançando...' : `→ ${kanbanColunas.find(c => c.key === PROXIMOS[ordem.status])?.label || 'Avançar'}`}
                    </button>
                  )}
                  {ordem.status === 'finalizado' && (
                    <div className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-green-100 text-green-700">
                      <CheckCircle size={15} /> Finalizado
                    </div>
                  )}
                  <button onClick={onClose} className="px-4 border border-border rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors">
                    Fechar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {showSobra && (
        <ModalSobraFracionado
          itens={itensNormalizados}
          produtos={produtos}
          origem={`Sobra da OP ${ordem.numero}`}
          onClose={() => setShowSobra(false)}
        />
      )}

      {showDescarte && (
        <ModalDescarte
          ordem={ordem}
          produtos={produtos}
          onClose={() => setShowDescarte(false)}
          onSalvo={(itens) => {
            setDescarteRegistrado(itens);
            setDescartarAtivo(true);
            setShowDescarte(false);
          }}
        />
      )}
    </div>
  );
}