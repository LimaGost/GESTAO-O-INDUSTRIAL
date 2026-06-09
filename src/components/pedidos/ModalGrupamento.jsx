import { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Link2, Users, Plus, CheckCircle, Unlink, ChevronDown, ChevronRight, Package, DollarSign, Calendar, ArrowLeft, Layers } from 'lucide-react';
import { registrarLog } from '@/lib/audit';

const STATUS_CONFIG = {
  rascunho:           { label: 'Rascunho',      color: '#64748B', bg: '#F1F5F9' },
  aguardando_estoque: { label: 'Ag. Estoque',   color: '#D97706', bg: '#FEF3C7' },
  separacao:          { label: 'Separação',     color: '#2563EB', bg: '#DBEAFE' },
  separado:           { label: 'Separado',      color: '#16A34A', bg: '#DCFCE7' },
  expedido:           { label: 'Expedido',      color: '#EA580C', bg: '#FFEDD5' },
  entregue:           { label: 'Entregue',      color: '#059669', bg: '#D1FAE5' },
  cancelado:          { label: 'Cancelado',     color: '#DC2626', bg: '#FEE2E2' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.rascunho;
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: cfg.color, background: cfg.bg }}>
      {cfg.label}
    </span>
  );
}

function fmtVal(v) {
  return `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

export default function ModalGrupamento({ pedidos, grupos, onClose, onRefresh }) {
  const [view, setView] = useState('list'); // 'list' | 'create'
  const [selectedClienteId, setSelectedClienteId] = useState('');
  const [selectedPedidosIds, setSelectedPedidosIds] = useState([]);
  const [observacoes, setObservacoes] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [desfazendoId, setDesfazendoId] = useState(null);
  const [grupoExpandido, setGrupoExpandido] = useState(null);

  const pedidosIdsEmGrupo = useMemo(
    () => new Set(grupos.flatMap(g => g.pedidos_ids || [])),
    [grupos]
  );

  const pedidosDisponiveis = useMemo(
    () => pedidos.filter(p => p.status !== 'cancelado' && !pedidosIdsEmGrupo.has(p.id)),
    [pedidos, pedidosIdsEmGrupo]
  );

  const clientesUnicos = useMemo(() => {
    const map = new Map();
    for (const p of pedidosDisponiveis) {
      if (!p.cliente_id || !p.cliente_nome) continue;
      if (!map.has(p.cliente_id)) map.set(p.cliente_id, { id: p.cliente_id, nome: p.cliente_nome, count: 0 });
      map.get(p.cliente_id).count++;
    }
    return [...map.values()].filter(c => c.count >= 2);
  }, [pedidosDisponiveis]);

  const pedidosDoCliente = useMemo(
    () => selectedClienteId ? pedidosDisponiveis.filter(p => p.cliente_id === selectedClienteId) : [],
    [selectedClienteId, pedidosDisponiveis]
  );

  const pedidosSelecionados = useMemo(
    () => pedidos.filter(p => selectedPedidosIds.includes(p.id)),
    [pedidos, selectedPedidosIds]
  );

  const totalSelecionado = useMemo(
    () => pedidosSelecionados.reduce((s, p) => s + (p.valor_total || 0), 0),
    [pedidosSelecionados]
  );

  const togglePedido = (id) =>
    setSelectedPedidosIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const resetCreate = () => {
    setSelectedClienteId('');
    setSelectedPedidosIds([]);
    setObservacoes('');
  };

  const criarGrupo = async () => {
    if (selectedPedidosIds.length < 2) return;
    setSalvando(true);
    const numeros = pedidosSelecionados.map(p => p.numero).filter(Boolean);
    const clienteNome = pedidosSelecionados[0]?.cliente_nome || '';
    const clienteId = pedidosSelecionados[0]?.cliente_id || '';

    const grupo = await base44.entities.GrupoPedidos.create({
      cliente_id: clienteId,
      cliente_nome: clienteNome,
      pedidos_ids: selectedPedidosIds,
      pedidos_numeros: numeros,
      valor_total_consolidado: totalSelecionado,
      status: 'ativo',
      observacoes,
    });

    await registrarLog('GrupoPedidos', grupo.id, 'CRIACAO_GRUPO',
      `Grupo criado para ${clienteNome}: pedidos ${numeros.join(', ')}`);

    setSalvando(false);
    onRefresh();
    setView('list');
    resetCreate();
  };

  const desfazerGrupo = async (grupo) => {
    if (!confirm(`Desfazer agrupamento "${grupo.cliente_nome}" (${(grupo.pedidos_numeros || []).length} pedidos)?`)) return;
    setDesfazendoId(grupo.id);
    await base44.entities.GrupoPedidos.update(grupo.id, { status: 'desfeito' });
    await registrarLog('GrupoPedidos', grupo.id, 'DESFAZER_GRUPO',
      `Agrupamento desfeito: ${grupo.cliente_nome}`);
    setDesfazendoId(null);
    onRefresh();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            {view === 'create' && (
              <button onClick={() => { setView('list'); resetCreate(); }}
                className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground">
                <ArrowLeft size={15} />
              </button>
            )}
            <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center">
              <Layers size={16} className="text-violet-600" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-sm">
                {view === 'list' ? 'Grupos de Pedidos' : 'Novo Agrupamento'}
              </h3>
              <p className="text-xs text-muted-foreground">
                {view === 'list'
                  ? `${grupos.length} grupo(s) ativo(s)`
                  : 'Vincule pedidos do mesmo cliente'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {view === 'list' && clientesUnicos.length > 0 && (
              <button onClick={() => setView('create')}
                className="flex items-center gap-1.5 text-xs bg-violet-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:opacity-90 transition-opacity">
                <Plus size={12} /> Novo Grupo
              </button>
            )}
            <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
              <X size={15} className="text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto">

          {/* ────── LIST VIEW ────── */}
          {view === 'list' && (
            <div className="p-5">
              {grupos.length === 0 ? (
                <div className="text-center py-14 space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-violet-50 border-2 border-dashed border-violet-200 flex items-center justify-center mx-auto">
                    <Layers size={24} className="text-violet-300" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Nenhum grupo ativo</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                      Agrupe pedidos do mesmo cliente para gerenciá-los de forma consolidada.
                    </p>
                  </div>
                  {clientesUnicos.length > 0 ? (
                    <button onClick={() => setView('create')}
                      className="inline-flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
                      <Plus size={14} /> Criar Primeiro Grupo
                    </button>
                  ) : (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 inline-block">
                      Nenhum cliente possui 2 ou mais pedidos disponíveis.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {grupos.map(g => {
                    const pedidosGrupo = pedidos.filter(p => (g.pedidos_ids || []).includes(p.id));
                    const totalConsolidado = pedidosGrupo.reduce((s, p) => s + (p.valor_total || 0), 0);
                    const expanded = grupoExpandido === g.id;

                    return (
                      <div key={g.id}
                        className="border border-violet-200 rounded-2xl overflow-hidden bg-white shadow-sm">

                        {/* Card header */}
                        <div className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                              <Users size={16} className="text-violet-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-foreground text-sm leading-tight">{g.cliente_nome}</p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="text-xs text-muted-foreground">
                                  {(g.pedidos_ids || []).length} pedido(s)
                                </span>
                                <span className="text-[10px] text-muted-foreground">·</span>
                                {(g.pedidos_numeros || []).slice(0, 3).map((n, i) => (
                                  <span key={i} className="text-[10px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full font-mono font-bold">
                                    #{n}
                                  </span>
                                ))}
                                {(g.pedidos_numeros || []).length > 3 && (
                                  <span className="text-[10px] text-muted-foreground">
                                    +{(g.pedidos_numeros || []).length - 3}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm font-bold text-foreground">{fmtVal(totalConsolidado)}</p>
                              <p className="text-[10px] text-muted-foreground">total</p>
                            </div>
                          </div>

                          {g.observacoes && (
                            <p className="text-xs text-muted-foreground mt-2.5 bg-muted/50 rounded-lg px-3 py-2 italic">
                              "{g.observacoes}"
                            </p>
                          )}

                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/60">
                            <button
                              onClick={() => setGrupoExpandido(expanded ? null : g.id)}
                              className="flex items-center gap-1 text-xs text-violet-700 font-semibold hover:text-violet-900 transition-colors">
                              {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                              {expanded ? 'Recolher pedidos' : 'Ver pedidos'}
                            </button>
                            <button
                              onClick={() => desfazerGrupo(g)}
                              disabled={desfazendoId === g.id}
                              className="flex items-center gap-1.5 text-xs text-red-600 border border-red-200 bg-red-50 px-2.5 py-1 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors font-medium">
                              <Unlink size={11} />
                              {desfazendoId === g.id ? 'Desfazendo...' : 'Desfazer'}
                            </button>
                          </div>
                        </div>

                        {/* Expanded pedidos */}
                        {expanded && (
                          <div className="border-t border-violet-100 bg-violet-50/50 p-3 space-y-2">
                            {pedidosGrupo.map(p => (
                              <div key={p.id} className="bg-white rounded-xl px-3 py-3 border border-violet-100 shadow-sm">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-sm font-bold text-foreground font-mono">#{p.numero}</span>
                                    <StatusBadge status={p.status} />
                                  </div>
                                  <span className="text-sm font-bold text-foreground flex-shrink-0">{fmtVal(p.valor_total)}</span>
                                </div>
                                {(p.itens || []).length > 0 && (
                                  <div className="mt-1.5 flex flex-wrap gap-1">
                                    {(p.itens || []).slice(0, 3).map((item, i) => (
                                      <span key={i} className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-md">
                                        {item.produto_nome} ×{item.quantidade}
                                      </span>
                                    ))}
                                    {(p.itens || []).length > 3 && (
                                      <span className="text-[10px] text-muted-foreground">+{(p.itens || []).length - 3}</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                            <div className="flex items-center justify-between bg-violet-600 rounded-xl px-4 py-2.5">
                              <span className="text-xs font-bold text-white">Total Consolidado</span>
                              <span className="text-sm font-bold text-white">{fmtVal(totalConsolidado)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ────── CREATE VIEW ────── */}
          {view === 'create' && (
            <div className="p-5 space-y-5">

              {/* Step 1: Cliente */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-5 h-5 rounded-full bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">1</div>
                  <label className="text-xs font-bold text-foreground">Selecione o Cliente</label>
                </div>
                {clientesUnicos.length === 0 ? (
                  <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                    Nenhum cliente possui 2 ou mais pedidos disponíveis para agrupamento.
                  </div>
                ) : (
                  <div className="grid gap-2">
                    {clientesUnicos.map(c => (
                      <button key={c.id} onClick={() => { setSelectedClienteId(c.id); setSelectedPedidosIds([]); }}
                        className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                          selectedClienteId === c.id
                            ? 'border-violet-400 bg-violet-50 ring-1 ring-violet-300'
                            : 'border-border hover:bg-muted/50'
                        }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${selectedClienteId === c.id ? 'bg-violet-200' : 'bg-muted'}`}>
                              <Users size={13} className={selectedClienteId === c.id ? 'text-violet-700' : 'text-muted-foreground'} />
                            </div>
                            <span className={`text-sm font-semibold ${selectedClienteId === c.id ? 'text-violet-800' : 'text-foreground'}`}>
                              {c.nome}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{c.count} pedidos</span>
                            {selectedClienteId === c.id && (
                              <CheckCircle size={15} className="text-violet-600" />
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Step 2: Pedidos */}
              {selectedClienteId && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">2</div>
                      <label className="text-xs font-bold text-foreground">Selecione os Pedidos</label>
                    </div>
                    {selectedPedidosIds.length > 0 && (
                      <span className="text-xs font-bold text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full">
                        {selectedPedidosIds.length} selecionado(s)
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {pedidosDoCliente.map(p => {
                      const sel = selectedPedidosIds.includes(p.id);
                      return (
                        <button key={p.id} onClick={() => togglePedido(p.id)}
                          className={`w-full text-left rounded-xl border transition-all ${
                            sel
                              ? 'border-violet-400 bg-violet-50 shadow-sm'
                              : 'border-border bg-white hover:bg-muted/30'
                          }`}>
                          <div className="px-3 py-3">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                  sel ? 'border-violet-500 bg-violet-500' : 'border-border'
                                }`}>
                                  {sel && <CheckCircle size={11} className="text-white" />}
                                </div>
                                <span className="text-sm font-bold text-foreground font-mono">#{p.numero}</span>
                                <StatusBadge status={p.status} />
                              </div>
                              <span className="text-sm font-bold text-foreground flex-shrink-0">{fmtVal(p.valor_total)}</span>
                            </div>
                            {(p.itens || []).length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1 pl-7">
                                {(p.itens || []).slice(0, 3).map((item, i) => (
                                  <span key={i} className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-md">
                                    {item.produto_nome} ×{item.quantidade}
                                  </span>
                                ))}
                                {(p.itens || []).length > 3 && (
                                  <span className="text-[10px] text-muted-foreground">+{(p.itens || []).length - 3}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 3: Resumo + Observações */}
              {selectedPedidosIds.length >= 2 && (
                <div className="space-y-3">
                  {/* Resumo visual */}
                  <div className="bg-gradient-to-br from-violet-600 to-violet-700 rounded-2xl p-4 text-white">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                        <span className="text-[10px] font-bold">3</span>
                      </div>
                      <span className="text-xs font-bold opacity-90">Resumo do Agrupamento</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-white/10 rounded-xl p-2.5 text-center">
                        <p className="text-lg font-bold">{selectedPedidosIds.length}</p>
                        <p className="text-[10px] opacity-80 mt-0.5">pedidos</p>
                      </div>
                      <div className="bg-white/10 rounded-xl p-2.5 text-center col-span-2">
                        <p className="text-lg font-bold">{fmtVal(totalSelecionado)}</p>
                        <p className="text-[10px] opacity-80 mt-0.5">total consolidado</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {pedidosSelecionados.map(p => (
                        <span key={p.id} className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-mono font-bold">
                          #{p.numero}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Observações */}
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Observações (opcional)</label>
                    <textarea
                      value={observacoes}
                      onChange={e => setObservacoes(e.target.value)}
                      rows={2}
                      placeholder="Ex: Entregar na mesma data, consolidar em única NF..."
                      className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none placeholder:text-muted-foreground"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        {view === 'create' && selectedPedidosIds.length >= 2 && (
          <div className="px-5 py-4 border-t border-border flex-shrink-0">
            <button
              onClick={criarGrupo}
              disabled={salvando}
              className="w-full flex items-center justify-center gap-2 bg-violet-600 text-white py-3 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity shadow-sm">
              <Link2 size={15} />
              {salvando ? 'Criando grupo...' : `Criar Grupo com ${selectedPedidosIds.length} Pedidos`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}