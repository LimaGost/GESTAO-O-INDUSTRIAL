import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Link2, Users, Plus, CheckCircle, Unlink } from 'lucide-react';
import { registrarLog } from '@/lib/audit';

const STATUS_LABELS = {
  rascunho: 'Rascunho', aguardando_estoque: 'Ag. Estoque', separacao: 'Em Separação',
  separado: 'Separado', expedido: 'Expedido', entregue: 'Entregue', cancelado: 'Cancelado',
};

export default function ModalGrupamento({ pedidos, grupos, onClose, onRefresh }) {
  const [view, setView] = useState('list');
  const [selectedClienteId, setSelectedClienteId] = useState('');
  const [selectedPedidosIds, setSelectedPedidosIds] = useState([]);
  const [observacoes, setObservacoes] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [desfazendoId, setDesfazendoId] = useState(null);
  const [grupoExpandido, setGrupoExpandido] = useState(null);

  const pedidosIdsEmGrupo = new Set(grupos.flatMap(g => g.pedidos_ids || []));
  const pedidosDisponiveis = pedidos.filter(p => p.status !== 'cancelado' && !pedidosIdsEmGrupo.has(p.id));

  const clientesUnicos = [...new Map(
    pedidosDisponiveis
      .filter(p => p.cliente_id && p.cliente_nome)
      .map(p => [p.cliente_id, { id: p.cliente_id, nome: p.cliente_nome }])
  ).values()].filter(c => pedidosDisponiveis.filter(p => p.cliente_id === c.id).length >= 2);

  const pedidosDoCliente = selectedClienteId
    ? pedidosDisponiveis.filter(p => p.cliente_id === selectedClienteId)
    : [];

  const togglePedido = (id) =>
    setSelectedPedidosIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const criarGrupo = async () => {
    if (selectedPedidosIds.length < 2) return alert('Selecione ao menos 2 pedidos para agrupar.');
    setSalvando(true);
    const pedidosSel = pedidos.filter(p => selectedPedidosIds.includes(p.id));
    const clienteNome = pedidosSel[0]?.cliente_nome || '';
    const clienteId = pedidosSel[0]?.cliente_id || '';
    const numeros = pedidosSel.map(p => p.numero).filter(Boolean);
    const valorTotal = pedidosSel.reduce((s, p) => s + (p.valor_total || 0), 0);

    const grupo = await base44.entities.GrupoPedidos.create({
      cliente_id: clienteId,
      cliente_nome: clienteNome,
      pedidos_ids: selectedPedidosIds,
      pedidos_numeros: numeros,
      valor_total_consolidado: valorTotal,
      status: 'ativo',
      observacoes,
    });

    await registrarLog('GrupoPedidos', grupo.id, 'CRIACAO_GRUPO',
      `Grupo criado para ${clienteNome}: pedidos ${numeros.join(', ')}`);

    setSalvando(false);
    onRefresh();
    setView('list');
    setSelectedClienteId('');
    setSelectedPedidosIds([]);
    setObservacoes('');
  };

  const desfazerGrupo = async (grupo) => {
    if (!confirm(`Desfazer agrupamento dos pedidos ${(grupo.pedidos_numeros || []).join(', ')}?`)) return;
    setDesfazendoId(grupo.id);
    await base44.entities.GrupoPedidos.update(grupo.id, { status: 'desfeito' });
    await registrarLog('GrupoPedidos', grupo.id, 'DESFAZER_GRUPO',
      `Agrupamento desfeito: ${grupo.cliente_nome} — pedidos ${(grupo.pedidos_numeros || []).join(', ')}`);
    setDesfazendoId(null);
    onRefresh();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <Link2 size={17} className="text-violet-600" />
            <h3 className="font-bold text-foreground">Agrupamento de Pedidos</h3>
          </div>
          <div className="flex items-center gap-2">
            {view === 'list' && (
              <button onClick={() => setView('create')}
                className="flex items-center gap-1.5 text-xs bg-violet-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:opacity-90">
                <Plus size={12} /> Novo Grupo
              </button>
            )}
            {view === 'create' && (
              <button onClick={() => { setView('list'); setSelectedClienteId(''); setSelectedPedidosIds([]); }}
                className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-muted">
                ← Voltar
              </button>
            )}
            <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg">
              <X size={16} className="text-muted-foreground" />
            </button>
          </div>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* LIST VIEW */}
          {view === 'list' && (
            <>
              {grupos.length === 0 ? (
                <div className="text-center py-12">
                  <Link2 size={36} className="mx-auto mb-3 text-muted-foreground opacity-20" />
                  <p className="text-sm text-muted-foreground font-medium">Nenhum grupo ativo</p>
                  <p className="text-xs text-muted-foreground mt-1">Crie um grupo para vincular pedidos do mesmo cliente operacionalmente.</p>
                  <button onClick={() => setView('create')}
                    className="mt-4 inline-flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90">
                    <Plus size={14} /> Criar Primeiro Grupo
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {grupos.map(g => {
                    const pedidosGrupo = pedidos.filter(p => (g.pedidos_ids || []).includes(p.id));
                    const totalConsolidado = pedidosGrupo.reduce((s, p) => s + (p.valor_total || 0), 0);
                    const expanded = grupoExpandido === g.id;
                    return (
                      <div key={g.id} className="border border-violet-200 bg-violet-50/60 rounded-2xl overflow-hidden">
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                                <Users size={14} className="text-violet-700" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-foreground text-sm">{g.cliente_nome}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {(g.pedidos_numeros || []).map(n => `#${n}`).join(' · ')} · {(g.pedidos_ids || []).length} pedidos
                                </p>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm font-bold text-foreground">
                                R$ {totalConsolidado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </p>
                              <p className="text-[10px] text-muted-foreground">total consolidado</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between mt-3 gap-2">
                            <button onClick={() => setGrupoExpandido(expanded ? null : g.id)}
                              className="text-xs text-violet-700 font-semibold hover:underline">
                              {expanded ? '▲ Recolher' : '▼ Ver detalhes dos pedidos'}
                            </button>
                            <button onClick={() => desfazerGrupo(g)} disabled={desfazendoId === g.id}
                              className="flex items-center gap-1 text-xs text-red-600 border border-red-200 px-2.5 py-1 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors">
                              <Unlink size={11} /> {desfazendoId === g.id ? 'Desfazendo...' : 'Desfazer Grupo'}
                            </button>
                          </div>

                          {expanded && (
                            <div className="mt-3 space-y-2">
                              {pedidosGrupo.map(p => (
                                <div key={p.id} className="bg-white rounded-xl px-3 py-2.5 border border-violet-100">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-semibold text-foreground">#{p.numero}</span>
                                      <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                                        {STATUS_LABELS[p.status] || p.status}
                                      </span>
                                    </div>
                                    <span className="text-xs font-medium text-foreground">
                                      R$ {(p.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                  <div className="mt-1 text-xs text-muted-foreground">
                                    {(p.itens || []).slice(0, 3).map((item, i) => (
                                      <span key={i}>{i > 0 ? ' · ' : ''}{item.produto_nome} ×{item.quantidade}</span>
                                    ))}
                                    {(p.itens || []).length > 3 && <span> +{(p.itens || []).length - 3} mais</span>}
                                  </div>
                                </div>
                              ))}
                              <div className="bg-violet-100 rounded-xl px-3 py-2.5 flex items-center justify-between">
                                <span className="text-xs font-bold text-violet-800">Total Consolidado</span>
                                <span className="text-sm font-bold text-violet-800">
                                  R$ {totalConsolidado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* CREATE VIEW */}
          {view === 'create' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">1. Selecione o Cliente *</label>
                <select value={selectedClienteId} onChange={e => { setSelectedClienteId(e.target.value); setSelectedPedidosIds([]); }}
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="">Selecione um cliente...</option>
                  {clientesUnicos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
                {clientesUnicos.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    Nenhum cliente possui 2 ou mais pedidos disponíveis para agrupamento.
                  </p>
                )}
              </div>

              {selectedClienteId && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                    2. Selecione os Pedidos a Agrupar * ({selectedPedidosIds.length} selecionado(s))
                  </label>
                  {pedidosDoCliente.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhum pedido disponível para este cliente.</p>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto">
                      {pedidosDoCliente.map(p => {
                        const sel = selectedPedidosIds.includes(p.id);
                        return (
                          <button key={p.id} onClick={() => togglePedido(p.id)}
                            className={`w-full text-left border rounded-xl px-3 py-2.5 transition-all ${sel ? 'border-violet-400 bg-violet-50' : 'border-border hover:bg-muted/50'}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {sel
                                  ? <CheckCircle size={14} className="text-violet-600 flex-shrink-0" />
                                  : <div className="w-3.5 h-3.5 rounded-full border-2 border-border flex-shrink-0" />}
                                <span className="text-sm font-semibold text-foreground">#{p.numero}</span>
                                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                                  {STATUS_LABELS[p.status] || p.status}
                                </span>
                              </div>
                              <span className="text-xs font-medium text-foreground">
                                R$ {(p.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground pl-5">
                              {(p.itens || []).slice(0, 2).map((item, i) => (
                                <span key={i}>{i > 0 ? ' · ' : ''}{item.produto_nome} ×{item.quantidade}</span>
                              ))}
                              {(p.itens || []).length > 2 && <span> +{(p.itens || []).length - 2}</span>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {selectedPedidosIds.length >= 2 && (
                <>
                  <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 space-y-1">
                    <p className="text-xs font-semibold text-violet-800">Resumo do Grupo</p>
                    <p className="text-xs text-violet-700">
                      Pedidos: <strong>{pedidos.filter(p => selectedPedidosIds.includes(p.id)).map(p => `#${p.numero}`).join(', ')}</strong>
                    </p>
                    <p className="text-xs text-violet-700">
                      Total consolidado: <strong>R$ {pedidos.filter(p => selectedPedidosIds.includes(p.id)).reduce((s, p) => s + (p.valor_total || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Observações (opcional)</label>
                    <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} rows={2}
                      placeholder="Ex: Entrega na mesma data, consolidar na mesma NF..."
                      className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {view === 'create' && selectedPedidosIds.length >= 2 && (
          <div className="px-5 py-4 border-t border-border flex-shrink-0">
            <button onClick={criarGrupo} disabled={salvando}
              className="w-full flex items-center justify-center gap-2 bg-violet-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity">
              <Link2 size={14} /> {salvando ? 'Criando...' : `Criar Grupo com ${selectedPedidosIds.length} Pedidos`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}