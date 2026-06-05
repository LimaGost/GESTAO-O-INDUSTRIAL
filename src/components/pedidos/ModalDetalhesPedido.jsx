import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import {
  X, CheckCircle, Clock, Package, Truck, Ban, FileText, Factory,
  Flag, AlertTriangle, Pencil, Save, ExternalLink, RefreshCw, Link2
} from 'lucide-react';

const VALOR_OCULTO = '••••••';

const STATUS_PEDIDO = {
  rascunho:           { label: 'Rascunho',       color: 'text-slate-600',  bg: 'bg-slate-100' },
  aguardando_estoque: { label: 'Ag. Estoque',    color: 'text-amber-700',  bg: 'bg-amber-100' },
  separacao:          { label: 'Em Separação',   color: 'text-blue-700',   bg: 'bg-blue-100' },
  separado:           { label: 'Separado',       color: 'text-green-700',  bg: 'bg-green-100' },
  expedido:           { label: 'Expedido',       color: 'text-orange-700', bg: 'bg-orange-100' },
  entregue:           { label: 'Entregue',       color: 'text-emerald-700',bg: 'bg-emerald-100' },
  cancelado:          { label: 'Cancelado',      color: 'text-red-700',    bg: 'bg-red-100' },
};

const STATUS_OP_CONFIG = {
  a_produzir:    { label: 'A Produzir',    color: '#64748B', bg: 'bg-slate-100' },
  em_producao:   { label: 'Em Produção',   color: '#0EA5E9', bg: 'bg-sky-100' },
  produzido:     { label: 'Produzido',     color: '#22C55E', bg: 'bg-green-100' },
  em_embalagem:  { label: 'Em Embalagem',  color: '#F59E0B', bg: 'bg-amber-100' },
  em_separacao:  { label: 'Em Separação',  color: '#14B8A6', bg: 'bg-teal-100' },
  finalizado:    { label: 'Finalizado',    color: '#A855F7', bg: 'bg-purple-100' },
  cancelado:     { label: 'Cancelado',     color: '#EF4444', bg: 'bg-red-100' },
};

const STATUS_EXP = {
  emitida:  { label: 'NF Emitida',  color: 'text-blue-700',   bg: 'bg-blue-100' },
  enviada:  { label: 'Enviada',     color: 'text-orange-700', bg: 'bg-orange-100' },
  entregue: { label: 'Entregue',    color: 'text-green-700',  bg: 'bg-green-100' },
};

// Timeline de fluxo completo do pedido
const PIPELINE = [
  { id: 'pedido_criado',  label: 'Pedido Criado',      icon: FileText },
  { id: 'op_kanban',      label: 'Produção (Kanban)',   icon: Factory },
  { id: 'expedido',       label: 'Expedição',           icon: Truck },
  { id: 'entregue',       label: 'Entregue',            icon: CheckCircle },
];

export default function ModalDetalhesPedido({
  pedido, ocultarValores, podeEditarPrecos,
  onClose, onRefresh, onSalvarPrecos,
}) {
  const [ordens, setOrdens] = useState([]);
  const [expedicao, setExpedicao] = useState(null);
  const [loadingExtra, setLoadingExtra] = useState(true);
  const [precosEditados, setPrecosEditados] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [aba, setAba] = useState('resumo'); // 'resumo' | 'rastreamento' | 'itens'

  useEffect(() => {
    carregarExtra();
  }, [pedido.id]);

  const carregarExtra = async () => {
    setLoadingExtra(true);
    const [todasOrdens, todasExps] = await Promise.all([
      base44.entities.OrdemProducao.list('-created_date'),
      base44.entities.Expedicao.list('-created_date'),
    ]);
    const opsVinculadas = todasOrdens.filter(o => o.pedido_id === pedido.id && o.status !== 'cancelado');
    const expVinculada = todasExps.find(e => e.pedido_id === pedido.id) || null;
    setOrdens(opsVinculadas);
    setExpedicao(expVinculada);
    setLoadingExtra(false);
  };

  const getPrecoOriginal = (item) =>
    item.preco_unitario || item.valor_unitario ||
    (item.total && item.quantidade ? item.total / item.quantidade : 0);

  const handleSalvarPrecos = async () => {
    setSalvando(true);
    await onSalvarPrecos(pedido, precosEditados);
    setPrecosEditados({});
    setSalvando(false);
    carregarExtra();
  };

  // Determina etapa atual no pipeline
  const getPipelineStep = () => {
    if (pedido.status === 'cancelado') return -1;
    if (expedicao?.status === 'entregue' || expedicao?.confirmado_pelo_cliente) return 3;
    if (expedicao) return 2;
    if (ordens.some(o => ['finalizado', 'em_separacao', 'em_embalagem', 'produzido', 'em_producao', 'a_produzir'].includes(o.status))) return 1;
    return 0;
  };

  const pipelineStep = getPipelineStep();
  const stPedido = STATUS_PEDIDO[pedido.status] || STATUS_PEDIDO.rascunho;
  const itens = pedido.itens || [];
  const totalEditado = itens.reduce((s, item, i) => {
    const preco = precosEditados[i] !== undefined ? Number(precosEditados[i]) : getPrecoOriginal(item);
    return s + preco * (item.quantidade || 0);
  }, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <FileText size={16} className="text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-bold text-foreground">{pedido.numero || 'Pedido'}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${stPedido.bg} ${stPedido.color}`}>
                  {stPedido.label}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate">{pedido.cliente_nome}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={carregarExtra} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
              <RefreshCw size={13} className={`text-muted-foreground ${loadingExtra ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-xl transition-colors">
              <X size={16} className="text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Abas */}
        <div className="flex border-b border-border flex-shrink-0">
          {[
            { id: 'resumo', label: 'Resumo' },
            { id: 'rastreamento', label: '🔍 Rastreamento' },
            { id: 'itens', label: `Itens (${itens.length})` },
          ].map(a => (
            <button key={a.id} onClick={() => setAba(a.id)}
              className={`flex-1 py-2.5 text-xs font-semibold transition-colors border-b-2 ${
                aba === a.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}>
              {a.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">

          {/* ABA: Resumo */}
          {aba === 'resumo' && (
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/30 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">Cliente</p>
                  <p className="text-sm font-semibold text-foreground">{pedido.cliente_nome}</p>
                </div>
                <div className="bg-muted/30 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">Total do Pedido</p>
                  <p className="text-sm font-bold text-primary">
                    {ocultarValores ? VALOR_OCULTO : `R$ ${(pedido.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                  </p>
                </div>
                <div className="bg-muted/30 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">Data do Pedido</p>
                  <p className="text-sm font-medium text-foreground">
                    {pedido.data_pedido ? new Date(pedido.data_pedido + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                  </p>
                </div>
                <div className="bg-muted/30 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">Entrega Prevista</p>
                  <p className="text-sm font-medium text-foreground">
                    {pedido.data_entrega_prevista ? new Date(pedido.data_entrega_prevista + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                  </p>
                </div>
              </div>

              {pedido.observacoes && (
                <div className="bg-muted/30 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">Observações</p>
                  <p className="text-sm text-foreground">{pedido.observacoes}</p>
                </div>
              )}

              {/* Snapshot de OPs e Exp */}
              {!loadingExtra && (
                <div className="space-y-2">
                  {ordens.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                      <p className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1.5">
                        <Factory size={11} /> {ordens.length} Ordem(ns) de Produção no Kanban
                      </p>
                      {ordens.map(op => {
                        const opSt = STATUS_OP_CONFIG[op.status] || STATUS_OP_CONFIG.a_produzir;
                        return (
                          <div key={op.id} className="flex items-center justify-between text-xs">
                            <span className="text-blue-800 font-medium">{op.numero}</span>
                            <span className={`px-2 py-0.5 rounded-full font-semibold text-white text-[10px]`}
                              style={{ background: opSt.color }}>
                              {opSt.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {expedicao && (
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
                      <p className="text-xs font-semibold text-orange-700 mb-1 flex items-center gap-1.5">
                        <Truck size={11} /> Expedição vinculada
                      </p>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-orange-800 font-medium">NF {expedicao.numero_nf}</span>
                        <span className={`px-2 py-0.5 rounded-full font-semibold ${STATUS_EXP[expedicao.status]?.bg || 'bg-gray-100'} ${STATUS_EXP[expedicao.status]?.color || 'text-gray-600'}`}>
                          {STATUS_EXP[expedicao.status]?.label || expedicao.status}
                        </span>
                      </div>
                      {expedicao.transportadora && (
                        <p className="text-xs text-orange-600 mt-1">🚛 {expedicao.transportadora}</p>
                      )}
                      {expedicao.confirmado_pelo_cliente && (
                        <p className="text-xs text-green-600 mt-1 font-semibold">✅ Confirmado pelo cliente</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ABA: Rastreamento */}
          {aba === 'rastreamento' && (
            <div className="p-5 space-y-4">
              {loadingExtra ? (
                <div className="flex items-center justify-center py-10">
                  <RefreshCw size={20} className="animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {/* Pipeline visual */}
                  <div className="flex items-center gap-1">
                    {PIPELINE.map((step, i) => {
                      const done = pipelineStep > i;
                      const active = pipelineStep === i;
                      const cancelled = pipelineStep === -1;
                      const Icon = step.icon;
                      return (
                        <div key={step.id} className="flex items-center gap-1 flex-1">
                          <div className={`flex flex-col items-center gap-1 flex-1 ${cancelled ? 'opacity-30' : ''}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                              done ? 'bg-green-500 border-green-500 text-white' :
                              active ? 'bg-primary border-primary text-primary-foreground animate-pulse' :
                              'bg-muted border-border text-muted-foreground'
                            }`}>
                              <Icon size={13} />
                            </div>
                            <p className="text-[9px] text-center text-muted-foreground leading-tight">{step.label}</p>
                          </div>
                          {i < PIPELINE.length - 1 && (
                            <div className={`h-0.5 w-4 rounded-full flex-shrink-0 mb-3 ${done ? 'bg-green-400' : 'bg-border'}`} />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* OPs no Kanban */}
                  {ordens.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <Factory size={28} className="mx-auto mb-2 opacity-20" />
                      <p className="text-sm">Nenhuma OP vinculada a este pedido.</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Kanban de Produção</p>
                      <div className="space-y-2">
                        {ordens.map(op => {
                          const opSt = STATUS_OP_CONFIG[op.status] || STATUS_OP_CONFIG.a_produzir;
                          const qtd = op.itens?.length > 0
                            ? op.itens.reduce((s, i) => s + (i.quantidade || 0), 0)
                            : op.quantidade || 0;
                          return (
                            <div key={op.id} className="bg-card border border-border rounded-xl p-3 space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <div>
                                  <p className="text-xs font-bold text-foreground">{op.numero}</p>
                                  <p className="text-xs text-muted-foreground">{op.produto_nome}</p>
                                </div>
                                <span className="text-[10px] px-2 py-0.5 rounded-full text-white font-semibold flex-shrink-0"
                                  style={{ background: opSt.color }}>
                                  {opSt.label}
                                </span>
                              </div>
                              {/* Progresso de itens */}
                              {op.itens?.length > 0 && (
                                <div className="space-y-1">
                                  {op.itens.slice(0, 3).map((item, i) => (
                                    <div key={i} className="flex items-center justify-between text-xs">
                                      <span className="text-muted-foreground truncate flex-1">{item.produto_nome}</span>
                                      <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                                        {item.disponivel && (
                                          <span className="text-[9px] bg-green-100 text-green-700 px-1 rounded font-semibold">✓ est.</span>
                                        )}
                                        <span className="font-medium">{item.quantidade}×</span>
                                      </div>
                                    </div>
                                  ))}
                                  {op.itens.length > 3 && (
                                    <p className="text-[10px] text-muted-foreground">+{op.itens.length - 3} mais...</p>
                                  )}
                                </div>
                              )}
                              {/* Datas */}
                              <div className="flex gap-3 text-[10px] text-muted-foreground flex-wrap">
                                {op.data_inicio && <span>▶ Início: {new Date(op.data_inicio).toLocaleDateString('pt-BR')}</span>}
                                {op.data_fim_producao && <span>✓ Produzido: {new Date(op.data_fim_producao).toLocaleDateString('pt-BR')}</span>}
                                {op.data_finalizacao && <span>🏁 Final: {new Date(op.data_finalizacao).toLocaleDateString('pt-BR')}</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Expedição */}
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Expedição</p>
                    {!expedicao ? (
                      <div className="text-center py-4 border border-dashed border-border rounded-xl text-muted-foreground">
                        <Truck size={22} className="mx-auto mb-1 opacity-20" />
                        <p className="text-xs">Expedição ainda não gerada.</p>
                        <p className="text-[10px] mt-0.5 opacity-60">Será criada automaticamente ao finalizar a OP no Kanban.</p>
                      </div>
                    ) : (
                      <div className="bg-card border border-border rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-xs font-bold text-foreground">NF {expedicao.numero_nf}</p>
                            {expedicao.transportadora && (
                              <p className="text-xs text-muted-foreground">🚛 {expedicao.transportadora}</p>
                            )}
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_EXP[expedicao.status]?.bg || 'bg-gray-100'} ${STATUS_EXP[expedicao.status]?.color || 'text-gray-700'}`}>
                            {STATUS_EXP[expedicao.status]?.label || expedicao.status}
                          </span>
                        </div>
                        <div className="flex gap-3 text-[10px] text-muted-foreground flex-wrap">
                          {expedicao.data_emissao && <span>📄 Emitida: {new Date(expedicao.data_emissao + 'T12:00:00').toLocaleDateString('pt-BR')}</span>}
                          {expedicao.data_envio && <span>📤 Enviada: {new Date(expedicao.data_envio + 'T12:00:00').toLocaleDateString('pt-BR')}</span>}
                          {expedicao.data_entrega && <span>✅ Entregue: {new Date(expedicao.data_entrega + 'T12:00:00').toLocaleDateString('pt-BR')}</span>}
                        </div>
                        {expedicao.confirmado_pelo_cliente && (
                          <p className="text-xs text-green-700 font-semibold bg-green-50 border border-green-200 rounded-lg px-2 py-1">
                            ✅ Recebimento confirmado pelo cliente
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ABA: Itens */}
          {aba === 'itens' && (
            <div className="p-5 space-y-3">
              {podeEditarPrecos && !['cancelado', 'entregue'].includes(pedido.status) && (
                <div className="flex items-center gap-1.5 text-xs text-primary bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
                  <Pencil size={11} /> Clique no preço unitário para editar
                </div>
              )}

              <div className="space-y-2">
                {itens.map((item, i) => {
                  const precoBase = getPrecoOriginal(item);
                  const precoAtual = precosEditados[i] !== undefined ? precosEditados[i] : precoBase;
                  const foiAlterado = precosEditados[i] !== undefined && Number(precosEditados[i]) !== precoBase;
                  const canEdit = podeEditarPrecos && !['cancelado', 'entregue'].includes(pedido.status);
                  const totalItem = Number(precoAtual) * item.quantidade;

                  return (
                    <div key={i} className={`rounded-xl p-3 ${foiAlterado ? 'bg-amber-50 border border-amber-200' : 'bg-muted/40 border border-border'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{item.produto_nome}</p>
                          <p className="text-xs text-muted-foreground">{item.quantidade} unidades</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-foreground">
                            {ocultarValores ? VALOR_OCULTO : `R$ ${totalItem.toFixed(2)}`}
                          </p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[10px] text-muted-foreground">unit.</span>
                            {canEdit ? (
                              <input type="number" step="0.01" min="0" value={precoAtual}
                                onChange={e => setPrecosEditados(prev => ({ ...prev, [i]: parseFloat(e.target.value) || 0 }))}
                                className="w-20 border border-border rounded-lg px-1.5 py-0.5 text-xs font-semibold bg-background text-foreground text-right focus:outline-none focus:ring-1 focus:ring-primary" />
                            ) : (
                              <span className="text-xs font-semibold text-muted-foreground">
                                {ocultarValores ? VALOR_OCULTO : `R$ ${precoBase.toFixed(2)}`}
                              </span>
                            )}
                            {foiAlterado && (
                              <span className="text-[9px] bg-amber-200 text-amber-800 px-1 rounded font-bold">✎</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Total */}
              <div className="flex justify-between items-center pt-2 border-t border-border">
                <span className="text-sm font-semibold text-foreground">Total</span>
                <span className="text-base font-bold text-primary">
                  {ocultarValores ? VALOR_OCULTO : `R$ ${totalEditado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                </span>
              </div>

              {Object.keys(precosEditados).length > 0 && (
                <button onClick={handleSalvarPrecos} disabled={salvando}
                  className="w-full flex items-center justify-center gap-2 bg-amber-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity">
                  <Save size={14} /> {salvando ? 'Salvando...' : 'Salvar Preços Alterados'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border flex-shrink-0">
          <button onClick={onClose}
            className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}