import { useState, useMemo } from 'react';
import { X, ArrowRight, CheckCircle, CheckSquare, Square, Trash2, Printer, User, AlertTriangle } from 'lucide-react';
import ModalDescarte from './ModalDescarte';
import { imprimirEtiquetaProduto } from '@/lib/imprimirEtiquetaProduto';

const LABELS_BOTAO = {
  a_produzir: 'Iniciar Produção', em_producao: 'Finalizar Produção',
  produzido: 'Enviar p/ Embalagem', em_embalagem: 'Finalizar',
};

const PROXIMOS = {
  a_produzir: 'em_producao', em_producao: 'produzido',
  produzido: 'em_embalagem', em_embalagem: 'finalizado',
};

const ETAPAS_LABEL = {
  a_produzir: 'A Produzir', em_producao: 'Em Produção',
  produzido: 'Produzido', em_embalagem: 'Em Embalagem',
};

const MOTIVO_LABEL = {
  defeito_fabricacao: 'Defeito de Fabricação', contaminacao: 'Contaminação',
  quebra: 'Quebra / Dano Físico', vencimento: 'Vencimento', erro_processo: 'Erro de Processo', outros: 'Outros',
};

function getStorageKey(ordemId, status) { return `checklist_modal_${ordemId}_${status}`; }
function loadStorage(key) { try { return JSON.parse(localStorage.getItem(key)) || {}; } catch { return {}; } }
function saveStorage(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

// Agrupa itens por "família" (prefixo do nome antes da variação)
function agruparPorFamilia(itens) {
  const map = {};
  for (const item of itens) {
    // Tenta extrair família pelo nome base (últimas palavras são variação)
    // Usa a primeira palavra(s) como chave de família
    const partes = item.produto_nome.trim().split(/\s+/);
    // Família = tudo exceto a última palavra (que seria variação), ou nome inteiro se só 1 palavra
    const familia = partes.length > 1 ? partes.slice(0, -1).join(' ') : item.produto_nome;
    if (!map[familia]) map[familia] = [];
    map[familia].push(item);
  }
  return map;
}

export default function KanbanCardModal({ ordem, checklistConfigs = {}, produtos = [], clienteNome, onAvancar, loading, onClose }) {
  const checkKey = `${ordem.id}_${ordem.status}`;

  // Checklist da etapa com persistência
  const itensEtapa = checklistConfigs[ordem.status]?.itens || [];
  const [checkEtapa, setCheckEtapa] = useState(() => loadStorage(getStorageKey(checkKey, 'etapa')));

  // Checkboxes de itens da OP (confirmação de produção)
  const [checkItens, setCheckItens] = useState(() => loadStorage(getStorageKey(checkKey, 'prod')));

  // Descarte — obrigatório em TODAS as etapas que têm "próximo"
  const [descartarAtivo, setDescartarAtivo] = useState(null); // null = não respondido, false = sem descarte, true = com descarte
  const [descarteRegistrado, setDescarteRegistrado] = useState(null);
  const [showDescarte, setShowDescarte] = useState(false);

  const itensNormalizados = useMemo(() => {
    if (ordem.itens?.length > 0) return ordem.itens;
    if (ordem.produto_id) return [{ produto_id: ordem.produto_id, produto_nome: ordem.produto_nome, quantidade: ordem.quantidade || 0 }];
    return [];
  }, [ordem]);

  const porFamilia = useMemo(() => agruparPorFamilia(itensNormalizados), [itensNormalizados]);

  const totalItens = itensNormalizados.length;
  const totalItensChecked = Object.values(checkItens).filter(Boolean).length;
  const itensOPCompleto = totalItens === 0 || totalItensChecked === totalItens;

  const etapaCompleto = itensEtapa.length === 0 || itensEtapa.every((_, i) => checkEtapa[i]);

  // Descarte é obrigatório em qualquer etapa com "próximo"
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

  const handleAvancar = () => {
    if (!etapaCompleto) { alert('⚠️ Complete todos os itens do checklist da etapa antes de avançar!'); return; }
    if (!itensOPCompleto) { alert('⚠️ Confirme todos os itens da ordem de produção antes de avançar!'); return; }
    if (!descarteRespondido) { alert('⚠️ Informe se houve descarte nesta etapa antes de avançar.'); return; }
    if (descartarAtivo === true && !descarteRegistrado) { alert('Preencha o formulário de descarte antes de continuar.'); return; }
    onAvancar(ordem, descarteRegistrado?.length > 0 ? descarteRegistrado : null);
  };

  // Indicador de progresso do checklist
  const checklistPct = itensEtapa.length > 0
    ? Math.round((itensEtapa.filter((_, i) => checkEtapa[i]).length / itensEtapa.length) * 100)
    : 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-foreground">{ordem.numero}</h3>
              {ordem.pedido_numero && (
                <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">📋 {ordem.pedido_numero}</span>
              )}
            </div>
            {(clienteNome || ordem.pedido_numero) && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <User size={10} /> {clienteNome || 'Cliente'}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">
              {totalItens > 1 ? `${totalItens} produto(s) — ${qtdTotal} un` : `${ordem.produto_nome} — ${qtdTotal} un`}
            </p>
            <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-medium mt-1 inline-block">
              {ETAPAS_LABEL[ordem.status] || ordem.status}
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 space-y-4">

          {/* Itens da OP agrupados por família */}
          {itensNormalizados.length > 0 && (
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b border-border">
                <p className="text-xs font-semibold text-foreground">Itens da Ordem</p>
                <p className={`text-xs font-semibold ${itensOPCompleto ? 'text-green-600' : 'text-amber-600'}`}>
                  {totalItensChecked}/{totalItens} confirmados
                </p>
              </div>
              {Object.entries(porFamilia).map(([familia, itens]) => (
                <div key={familia}>
                  {/* Cabeçalho de família */}
                  <div className="flex items-center justify-between px-4 py-2 bg-muted/20 border-b border-border/50">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{familia}</p>
                    <p className="text-[10px] text-muted-foreground">{itens.reduce((s, i) => s + (i.quantidade || 0), 0)} un</p>
                  </div>
                  {itens.map((item, idx) => {
                    const itemKey = `${item.produto_id || item.produto_nome}`;
                    const checked = !!checkItens[itemKey];
                    // Mostra apenas a variação (o que vem após o nome da família)
                    const variacaoLabel = item.produto_nome.startsWith(familia)
                      ? item.produto_nome.slice(familia.length).trim() || item.produto_nome
                      : item.produto_nome;
                    return (
                      <button key={idx}
                        onClick={onAvancar ? () => toggleItem(itemKey) : undefined}
                        disabled={!onAvancar}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 border-b border-border/40 transition-colors text-left ${onAvancar ? 'hover:bg-muted/30' : 'cursor-default'} ${checked ? 'bg-green-50/50' : ''}`}>
                        {checked
                          ? <CheckSquare size={14} className="text-green-500 flex-shrink-0" />
                          : <Square size={14} className="text-muted-foreground flex-shrink-0" />
                        }
                        <span className={`text-sm flex-1 ${checked ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                          {variacaoLabel}
                        </span>
                        <span className="text-xs font-semibold text-muted-foreground">{item.quantidade} un</span>
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

          {/* Checklist da Etapa com persistência */}
          {itensEtapa.length > 0 && (
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-border"
                style={{ background: etapaCompleto ? '#F0FDF4' : '#FFFBEB' }}>
                <p className="text-xs font-semibold text-foreground">
                  Checklist — {ETAPAS_LABEL[ordem.status]}
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
            <div className="bg-muted/30 rounded-xl p-3 space-y-1 text-xs">
              {ordem.lote && <p className="text-muted-foreground">Lote: <strong className="text-foreground">{ordem.lote}</strong></p>}
              {ordem.observacoes && <p className="text-muted-foreground italic">{ordem.observacoes}</p>}
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
            {/* Imprimir Etiquetas (qualquer etapa) */}
            {onAvancar && (
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

            {/* Descarte avulso (além do obrigatório) */}
            {onAvancar && (
              <button onClick={() => setShowDescarte(true)}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                <Trash2 size={13} /> Registrar Descarte Avulso
              </button>
            )}

            <div className="flex gap-3">
              {PROXIMOS[ordem.status] && onAvancar && (
                <button
                  onClick={handleAvancar}
                  disabled={loading || !tudoCompleto}
                  title={!tudoCompleto ? 'Complete o checklist e informe o descarte para avançar' : ''}
                  className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center justify-center gap-2">
                  <ArrowRight size={15} />
                  {loading ? 'Avançando...' : LABELS_BOTAO[ordem.status] || 'Avançar'}
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
          </div>
        </div>
      </div>

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