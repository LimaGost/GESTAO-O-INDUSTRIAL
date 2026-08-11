import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import {
  X, CheckCircle, Clock, Package, Truck, Ban, FileText, Factory,
  Flag, AlertTriangle, Pencil, Save, ExternalLink, RefreshCw, Link2, Layers, Edit2, Tag, ShoppingBag
} from 'lucide-react';
import SeletorProdutos from './SeletorProdutos';
import RastreioQuantidades from './RastreioQuantidades';
import { DestinoForm, DestinoBadge, getDestinoLabel } from './DestinoPedido';
import ComprovanteRecebimento from './ComprovanteRecebimento';
import BadgeSemRotulo from '@/components/common/BadgeSemRotulo';

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

// Pipeline com produção (quando há OP)
const PIPELINE_COM_PRODUCAO = [
  { id: 'criado',    label: 'Pedido',      icon: FileText },
  { id: 'producao',  label: 'Produção',    icon: Factory },
  { id: 'separacao', label: 'Separação',   icon: Package },
  { id: 'separado',  label: 'Separado',    icon: Layers },
  { id: 'expedido',  label: 'Expedição',   icon: Truck },
  { id: 'entregue',  label: 'Entregue',    icon: CheckCircle },
];

// Pipeline sem produção (estoque disponível)
const PIPELINE_SEM_PRODUCAO = [
  { id: 'criado',    label: 'Pedido',      icon: FileText },
  { id: 'separacao', label: 'Separação',   icon: Package },
  { id: 'separado',  label: 'Separado',    icon: Layers },
  { id: 'expedido',  label: 'Expedição',   icon: Truck },
  { id: 'entregue',  label: 'Entregue',    icon: CheckCircle },
];

export default function ModalDetalhesPedido({
  pedido, ocultarValores, podeEditarPrecos,
  onClose, onRefresh, onSalvarPrecos, produtos = [], onCancelar, onConfirmarReserva,
}) {
  const [ordens, setOrdens] = useState([]);
  const [expedicao, setExpedicao] = useState(null);
  const [separacoes, setSeparacoes] = useState([]);
  const [expedicoesPedido, setExpedicoesPedido] = useState([]);
  const [loadingExtra, setLoadingExtra] = useState(true);
  const [precosEditados, setPrecosEditados] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [aba, setAba] = useState('resumo'); // 'resumo' | 'rastreamento' | 'itens' | 'editar' | 'editar_itens'
  const [formEdicao, setFormEdicao] = useState({
    cliente_nome: pedido.cliente_nome || '',
    data_pedido: pedido.data_pedido || '',
    data_entrega_prevista: pedido.data_entrega_prevista || '',
    observacoes: pedido.observacoes || '',
    white_label: pedido.white_label || false,
    white_label_marca: pedido.white_label_marca || '',
    destino_tipo: pedido.destino_tipo || '',
    destino_unidade: pedido.destino_unidade || '',
    destino_transportadora: pedido.destino_transportadora || '',
    destino_endereco: pedido.destino_endereco || '',
  });
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [itensEditados, setItensEditados] = useState(pedido.itens || []);
  const [salvandoItens, setSalvandoItens] = useState(false);

  useEffect(() => {
    carregarExtra();
  }, [pedido.id]);

  const carregarExtra = async () => {
    setLoadingExtra(true);
    const [todasOrdens, todasExps, todasSeps] = await Promise.all([
      base44.entities.OrdemProducao.list('-created_date'),
      base44.entities.Expedicao.list('-created_date'),
      base44.entities.Separacao.list('-created_date').catch(() => []),
    ]);
    const opsVinculadas = todasOrdens.filter(o => o.pedido_id === pedido.id && o.status !== 'cancelado');
    const expsVinculadas = todasExps.filter(e => e.pedido_id === pedido.id);
    setOrdens(opsVinculadas);
    setExpedicao(expsVinculadas[0] || null);
    setExpedicoesPedido(expsVinculadas);
    setSeparacoes(todasSeps.filter(s => s.pedido_id === pedido.id));
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

  const handleSalvarEdicao = async () => {
    setSalvandoEdicao(true);
    await base44.entities.Pedido.update(pedido.id, formEdicao);
    setSalvandoEdicao(false);
    onRefresh();
    setAba('resumo');
  };

  // Salva alterações nos itens E propaga para OPs vinculadas
  const handleSalvarItens = async () => {
    setSalvandoItens(true);

    const novoTotal = itensEditados.reduce((s, i) => s + (i.total || 0), 0);

    // 1. Atualiza o pedido
    await base44.entities.Pedido.update(pedido.id, { itens: itensEditados, valor_total: novoTotal });

    // 2. Propaga para OPs vinculadas (apenas as ainda não finalizadas/canceladas)
    const opsAtualizaveis = ordens.filter(op =>
      ['a_produzir', 'em_producao'].includes(op.status)
    );

    for (const op of opsAtualizaveis) {
      // Recalcula os itens da OP baseado no que mudou no pedido
      // A OP só contém itens que NÃO tinham estoque — disponivel: false
      const itensOpAtualizados = (op.itens || []).map(opItem => {
        const itemPedidoAtualizado = itensEditados.find(i => i.produto_id === opItem.produto_id);
        if (!itemPedidoAtualizado) {
          // Item removido do pedido → zera a quantidade na OP
          return { ...opItem, quantidade: 0 };
        }
        // Busca produto para verificar estoque atual
        const produto = produtos.find(p => p.id === opItem.produto_id);
        const estoqueAtual = produto?.estoque_atual || 0;
        const qtdNecessaria = itemPedidoAtualizado.quantidade;
        const qtdFalta = Math.max(0, qtdNecessaria - estoqueAtual);
        return { ...opItem, quantidade: qtdFalta };
      }).filter(i => i.quantidade > 0);

      // Verifica se há novos itens no pedido que antes não estavam na OP
      for (const itemPedido of itensEditados) {
        const jaExisteNaOp = (op.itens || []).some(oi => oi.produto_id === itemPedido.produto_id);
        if (!jaExisteNaOp) {
          const produto = produtos.find(p => p.id === itemPedido.produto_id);
          const estoqueAtual = produto?.estoque_atual || 0;
          const qtdFalta = Math.max(0, itemPedido.quantidade - estoqueAtual);
          if (qtdFalta > 0) {
            itensOpAtualizados.push({
              produto_id: itemPedido.produto_id,
              produto_nome: itemPedido.produto_nome,
              quantidade: qtdFalta,
              disponivel: false,
            });
          }
        }
      }

      if (itensOpAtualizados.length === 0) {
        // Sem itens restantes → cancela a OP
        await base44.entities.OrdemProducao.update(op.id, { status: 'cancelado' });
      } else {
        const novaQtdTotal = itensOpAtualizados.reduce((s, i) => s + i.quantidade, 0);
        await base44.entities.OrdemProducao.update(op.id, {
          itens: itensOpAtualizados,
          quantidade: novaQtdTotal,
        });
      }
    }

    setSalvandoItens(false);
    await carregarExtra();
    onRefresh();
    setAba('resumo');
  };

  const temProducao = ordens.length > 0;
  const PIPELINE = temProducao ? PIPELINE_COM_PRODUCAO : PIPELINE_SEM_PRODUCAO;

  // Determina etapa atual no pipeline
  const getPipelineStep = () => {
    if (pedido.status === 'cancelado') return -1;
    if (pedido.status === 'entregue' || expedicao?.status === 'entregue' || expedicao?.confirmado_pelo_cliente) return PIPELINE.length;
    if (expedicao) return PIPELINE.findIndex(s => s.id === 'expedido');
    if (pedido.status === 'separado') return PIPELINE.findIndex(s => s.id === 'separado');
    if (pedido.status === 'separacao') return PIPELINE.findIndex(s => s.id === 'separacao');
    if (temProducao) return PIPELINE.findIndex(s => s.id === 'producao');
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
            { id: 'editar', label: '✏️ Editar' },
            { id: 'editar_itens', label: '🛍️ Itens' },
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

              {pedido.destino_tipo && (
                <div className="bg-muted/30 rounded-xl p-3 col-span-2">
                  <p className="text-xs text-muted-foreground mb-1.5">Destino do Pedido</p>
                  <DestinoBadge pedido={pedido} className="text-xs px-2.5 py-1" />
                  {pedido.destino_tipo === 'entrega_cliente' && pedido.destino_endereco && (
                    <p className="text-xs text-muted-foreground mt-1.5">📍 {pedido.destino_endereco}</p>
                  )}
                </div>
              )}

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
                  <ComprovanteRecebimento expedicao={expedicao} />
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

                  {/* Quantidades por etapa */}
                  <RastreioQuantidades pedido={pedido} ordens={ordens} separacoes={separacoes} expedicoes={expedicoesPedido} />

                  {/* OPs no Kanban */}
                  {ordens.length === 0 ? (
                    <div className="text-center py-4 border border-dashed border-green-200 bg-green-50 rounded-xl text-green-700">
                      <CheckCircle size={24} className="mx-auto mb-1.5 text-green-500" />
                      <p className="text-sm font-semibold">Estoque disponível</p>
                      <p className="text-xs text-green-600 mt-0.5">Pedido vai direto para Separação — sem necessidade de produção.</p>
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

                  {/* Destino */}
                  {pedido.destino_tipo && (
                    <div className="bg-muted/30 rounded-xl p-3">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Destino do Pedido</p>
                      <DestinoBadge pedido={pedido} className="text-xs px-2.5 py-1" />
                      {pedido.destino_tipo === 'entrega_cliente' && pedido.destino_endereco && (
                        <p className="text-xs text-muted-foreground mt-1.5">📍 {pedido.destino_endereco}</p>
                      )}
                      {pedido.destino_tipo === 'retirada_unidade' && pedido.destino_unidade && (
                        <p className="text-xs text-muted-foreground mt-1.5">🏢 {pedido.destino_unidade}</p>
                      )}
                      {pedido.destino_tipo === 'transportadora' && pedido.destino_transportadora && (
                        <p className="text-xs text-muted-foreground mt-1.5">🚛 {pedido.destino_transportadora}</p>
                      )}
                    </div>
                  )}

                  {/* Expedição */}
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Expedição</p>
                    {!expedicao ? (
                      <div className="text-center py-4 border border-dashed border-border rounded-xl text-muted-foreground">
                        <Truck size={22} className="mx-auto mb-1 opacity-20" />
                        <p className="text-xs">Expedição ainda não gerada.</p>
                        <p className="text-[10px] mt-0.5 opacity-60">Disponível quando o pedido estiver no status "Separado".</p>
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
                        <ComprovanteRecebimento expedicao={expedicao} />
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ABA: Editar */}
          {aba === 'editar' && (
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Nome do Cliente</label>
                <input
                  value={formEdicao.cliente_nome}
                  onChange={e => setFormEdicao(f => ({ ...f, cliente_nome: e.target.value }))}
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Data do Pedido</label>
                  <input
                    type="date"
                    value={formEdicao.data_pedido}
                    onChange={e => setFormEdicao(f => ({ ...f, data_pedido: e.target.value }))}
                    className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Entrega Prevista</label>
                  <input
                    type="date"
                    value={formEdicao.data_entrega_prevista}
                    onChange={e => setFormEdicao(f => ({ ...f, data_entrega_prevista: e.target.value }))}
                    className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Observações</label>
                <textarea
                  value={formEdicao.observacoes}
                  onChange={e => setFormEdicao(f => ({ ...f, observacoes: e.target.value }))}
                  rows={3}
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
              {/* Destino */}
              <DestinoForm
                value={formEdicao}
                onChange={dest => setFormEdicao(f => ({ ...f, ...dest }))}
              />

              {/* White Label */}
              <label className="flex items-center gap-3 cursor-pointer select-none p-3 rounded-xl border border-border hover:bg-muted/30 transition-colors">
                <div
                  onClick={() => setFormEdicao(f => ({ ...f, white_label: !f.white_label, white_label_marca: !f.white_label ? f.white_label_marca : '' }))}
                  className={`w-10 h-6 rounded-full transition-colors flex items-center px-0.5 flex-shrink-0 ${formEdicao.white_label ? 'bg-purple-500' : 'bg-border'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${formEdicao.white_label ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <Tag size={12} className="text-purple-600" /> Pedido White Label
                  </p>
                </div>
              </label>
              {formEdicao.white_label && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Marca / Cliente White Label</label>
                  <input
                    value={formEdicao.white_label_marca}
                    onChange={e => setFormEdicao(f => ({ ...f, white_label_marca: e.target.value }))}
                    placeholder="Ex: Marca XYZ"
                    className="w-full border border-purple-300 rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>
              )}
              <button
                onClick={handleSalvarEdicao}
                disabled={salvandoEdicao || !formEdicao.cliente_nome}
                className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                <Save size={14} />
                {salvandoEdicao ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          )}

          {/* ABA: Editar Itens */}
          {aba === 'editar_itens' && (
            <div className="p-5 space-y-4">
              {/* Aviso se há OPs vinculadas */}
              {ordens.filter(op => ['a_produzir', 'em_producao'].includes(op.status)).length > 0 && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <AlertTriangle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-amber-800">Atenção: há OP(s) vinculada(s)</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Ao salvar, as ordens de produção em andamento serão atualizadas automaticamente para refletir as novas quantidades.
                    </p>
                  </div>
                </div>
              )}
              {ordens.filter(op => ['produzido', 'em_embalagem', 'em_separacao', 'finalizado'].includes(op.status)).length > 0 && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                  <AlertTriangle size={14} className="text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-red-800">OPs em estágio avançado não serão alteradas</p>
                    <p className="text-xs text-red-700 mt-0.5">
                      Ordens já produzidas ou em embalagem precisam ser ajustadas manualmente no Kanban.
                    </p>
                  </div>
                </div>
              )}
              {produtos.length > 0 ? (
                <SeletorProdutos
                  produtos={produtos}
                  itens={itensEditados}
                  onChange={setItensEditados}
                />
              ) : (
                <p className="text-xs text-muted-foreground text-center py-6">Carregando produtos...</p>
              )}
              <button
                onClick={handleSalvarItens}
                disabled={salvandoItens || itensEditados.length === 0}
                className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                <Save size={14} />
                {salvandoItens ? 'Salvando e atualizando OPs...' : 'Salvar Itens e Propagar para OPs'}
              </button>
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
                    <div key={i} className={`rounded-xl p-3 ${(pedido.sem_rotulo && item.sem_rotulo) ? 'bg-teal-50 border border-teal-300' : foiAlterado ? 'bg-amber-50 border border-amber-200' : 'bg-muted/40 border border-border'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-sm font-medium text-foreground truncate">{item.produto_nome}</p>
                            {item.sem_rotulo && <BadgeSemRotulo size="sm" />}
                          </div>
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
        <div className="px-5 py-3 border-t border-border flex-shrink-0 space-y-2">
          {onConfirmarReserva && pedido.status === 'rascunho' && pedido.origem === 'pedido' && (
            <button
              onClick={() => { onConfirmarReserva(pedido); onClose(); }}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              <Package size={14} /> Confirmar Reserva de Estoque
            </button>
          )}
          {onCancelar && !['cancelado', 'entregue'].includes(pedido.status) && (
            <button
              onClick={() => { onCancelar(pedido.id, pedido.numero); onClose(); }}
              className="w-full flex items-center justify-center gap-2 border border-red-300 bg-red-50 text-red-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-100 transition-colors"
            >
              <Ban size={14} /> Cancelar Pedido
            </button>
          )}
          <button onClick={onClose}
            className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}