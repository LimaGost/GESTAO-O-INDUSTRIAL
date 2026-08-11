import BadgeSemRotulo from '@/components/common/BadgeSemRotulo';
import BadgeMovimentoEstoque from '@/components/common/BadgeMovimentoEstoque';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { ArrowRight, User, Tag, Package, Truck, MapPin, Calendar, Flag, CheckCircle, Hash, ClipboardList, Home, Clock, ExternalLink, Lock, X, Link2 } from 'lucide-react';

const STATUS_ACCENT = {
  aguardando_producao: '#F59E0B',
  aguardando_separacao: '#64748B',
  em_separacao: '#0EA5E9',
  separado: '#22C55E',
  em_conferencia: '#F59E0B',
  conferido: '#A855F7',
  liberado_expedicao: '#14B8A6',
};

const DESTINO_LABEL = {
  retirada_fabrica: 'Retirada Fábrica',
  retirada_unidade: 'Retirada Unidade',
  transportadora: 'Transportadora',
  entrega_cliente: 'Entrega Cliente',
};

const ORIGEM_CONFIG = {
  pedido: { label: 'Pedido', bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' },
  grupo: { label: 'Grupo', bg: '#F5F3FF', color: '#7C3AED', border: '#DDD6FE' },
  ordem_producao: { label: 'OP', bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0' },
};

function fmtData(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function LiberarSemIrmaModal({ separacao, onClose, onSucesso }) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const confirmar = async () => {
    setLoading(true);
    setErro('');
    try {
      const res = await base44.functions.invoke('liberarSeparacaoSemIrma', { separacao_id: separacao.id, pin });
      const data = res?.data || res;
      if (data?.error) setErro(data.error);
      else onSucesso();
    } catch (e) {
      setErro(e.message || 'Erro ao processar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Lock size={18} className="text-amber-600" />
            <h3 className="text-base font-bold text-foreground">Liberar sem a irmã</h3>
          </div>
          <button onClick={onClose}><X size={18} className="text-muted-foreground" /></button>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          A separação {separacao.numero} vai seguir sozinha pra Conferência/Expedição, sem esperar a irmã {separacao.separacao_irma_numero}. O pedido será expedido incompleto. Só o gerente de produção pode confirmar isso.
        </p>
        <input
          type="password" inputMode="numeric" autoFocus
          value={pin} onChange={e => setPin(e.target.value)}
          placeholder="PIN do gerente"
          className="w-full text-center text-2xl tracking-[0.4em] border-2 border-border rounded-xl py-3 mb-2 focus:outline-none focus:border-amber-500"
        />
        {erro && <p className="text-xs text-red-600 mb-2 text-center">{erro}</p>}
        <div className="flex gap-2 mt-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-muted text-muted-foreground font-semibold text-sm">Cancelar</button>
          <button onClick={confirmar} disabled={loading || pin.length < 4}
            className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white font-semibold text-sm disabled:opacity-50">
            {loading ? 'Verificando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SeparacaoCard({ separacao, onAvancar, loading, labelBotao, readonly, onOpenModal, movimentoEstoque, onLiberadoSemIrma }) {
  const [showLiberarModal, setShowLiberarModal] = useState(false);
  const accent = STATUS_ACCENT[separacao.status] || '#64748B';
  const origem = ORIGEM_CONFIG[separacao.origem] || ORIGEM_CONFIG.ordem_producao;
  const atrasada = separacao.data_prevista && separacao.status !== 'liberado_expedicao' &&
    new Date(separacao.data_prevista) < new Date(new Date().toDateString());

  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden"
      style={{ border: `1px solid #E2E8F0`, borderLeftWidth: '3px', borderLeftColor: atrasada ? '#EF4444' : accent }}>

      <div className="px-3 pt-3 pb-2">
        {/* Header */}
        <div className="flex flex-col gap-1.5 mb-2">
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground truncate leading-tight">
              {separacao.cliente_nome || separacao.grupo_cliente_nome || separacao.numero}
            </p>
            <div className="flex items-center gap-1.5 flex-wrap mt-1">
              {separacao.pedido_numero && (
                <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-200 px-1.5 py-0.5 rounded font-medium whitespace-nowrap">📋 {separacao.pedido_numero}</span>
              )}
              {separacao.ordem_producao_numero && (
                <Link
                  to={`/Kanban?busca=${encodeURIComponent(separacao.ordem_producao_numero)}`}
                  title="Ver esta OP no Kanban de Produção"
                  className="text-[10px] bg-green-50 text-green-600 border border-green-200 px-1.5 py-0.5 rounded font-medium whitespace-nowrap hover:bg-green-100 hover:underline inline-flex items-center gap-0.5"
                >
                  🏭 {separacao.ordem_producao_numero} <ExternalLink size={9} />
                </Link>
              )}
              {!separacao.pedido_numero && !separacao.ordem_producao_numero && (
                <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-medium whitespace-nowrap">{separacao.numero}</span>
              )}
              {separacao.separacao_irma_numero && (
                <span className="text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-200 px-1.5 py-0.5 rounded font-medium whitespace-nowrap inline-flex items-center gap-0.5">
                  <Link2 size={9} /> Irmã: {separacao.separacao_irma_numero}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {separacao.white_label && (
              <span className="inline-flex items-center gap-0.5 text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-bold flex-shrink-0">
                <Tag size={8} /> WL
              </span>
            )}
            {(separacao.sem_rotulo || (separacao.itens || []).some(i => i.sem_rotulo)) && <BadgeSemRotulo />}
            <BadgeMovimentoEstoque movimento={movimentoEstoque} />
          </div>
        </div>

        {/* Atraso */}
        {atrasada && (
          <div className="flex items-center gap-1 text-[10px] font-semibold mb-2 px-1.5 py-1 rounded-lg bg-red-50 text-red-600">
            <Calendar size={10} /> Atrasada — {fmtData(separacao.data_prevista)}
          </div>
        )}

        {/* Itens resumo */}
        {separacao.itens?.length > 0 && (
          <div className="space-y-0.5 mb-2">
            {separacao.itens.slice(0, 3).map((item, idx) => (
              <div key={idx} className={`flex items-center justify-between text-xs px-1.5 py-0.5 rounded ${item.sem_rotulo ? 'bg-teal-50 border border-teal-200' : ''}`}>
                <span className="truncate flex-1 text-foreground">{item.produto_nome}</span>
                {item.sem_rotulo && <BadgeSemRotulo size="sm" />}
                <span className="font-semibold text-foreground ml-2 flex-shrink-0">{item.quantidade}</span>
              </div>
            ))}
            {separacao.itens.length > 3 && <p className="text-[10px] text-muted-foreground">+{separacao.itens.length - 3} mais</p>}
          </div>
        )}

        {/* Métricas */}
        <div className="flex items-center gap-2 flex-wrap text-[10px] text-muted-foreground mb-2">
          <span className="flex items-center gap-0.5"><Hash size={9} />{separacao.quantidade_itens || 0} itens</span>
          <span className="flex items-center gap-0.5"><Package size={9} />{separacao.quantidade_total || 0} un</span>
          {separacao.created_date && <span className="flex items-center gap-0.5"><Clock size={9} />Pedido {fmtData(separacao.created_date)}</span>}
          {separacao.data_prevista && <span className="flex items-center gap-0.5"><Calendar size={9} />Prev. {fmtData(separacao.data_prevista)}</span>}
        </div>

        {/* Entrega */}
        <div className="space-y-1 mb-2">
          {separacao.destino_tipo && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Truck size={9} className="flex-shrink-0" />
              <span>{DESTINO_LABEL[separacao.destino_tipo] || separacao.destino_tipo}</span>
            </div>
          )}
          {separacao.destino_transportadora && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Truck size={9} className="flex-shrink-0" />
              <span className="truncate">{separacao.destino_transportadora}</span>
            </div>
          )}
          {separacao.destino_unidade && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Home size={9} className="flex-shrink-0" />
              <span className="truncate">{separacao.destino_unidade}</span>
            </div>
          )}
          {separacao.destino_endereco && (
            <div className="flex items-start gap-1 text-[10px] text-muted-foreground">
              <MapPin size={9} className="flex-shrink-0 mt-0.5" />
              <span className="truncate">{separacao.destino_endereco}</span>
            </div>
          )}
        </div>

        {/* Prioridade */}
        <div className="flex items-center gap-1.5 mb-1">
          <Flag size={9} className={separacao.prioridade === 'alta' ? 'text-red-500' : 'text-muted-foreground'} />
          <span className={`text-[10px] font-medium ${separacao.prioridade === 'alta' ? 'text-red-600' : 'text-muted-foreground'}`}>
            {separacao.prioridade === 'alta' ? 'Alta' : separacao.prioridade === 'baixa' ? 'Baixa' : 'Normal'}
          </span>
        </div>

        {separacao.observacoes && (
          <p className="text-[10px] text-muted-foreground italic line-clamp-1 mb-1">{separacao.observacoes}</p>
        )}

        {/* Aguardando produção (alocação parcial) — sempre no final do card */}
        {separacao.status === 'aguardando_producao' && (
          <div className="text-[10px] font-semibold mt-2 px-2 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 space-y-0.5">
            <p>🟡 Aguardando Produção — {separacao.quantidade_pendente_producao || 0} un em produção</p>
            <p className="text-green-600">🟢 {separacao.quantidade_total || 0} un já reservadas</p>
          </div>
        )}
        {separacao.producao_concluida && separacao.status === 'aguardando_separacao' && (
          <div className="flex items-center gap-1 text-[10px] font-semibold mt-2 px-2 py-1 rounded-lg bg-green-50 text-green-700 border border-green-200">
            <CheckCircle size={10} /> Pedido completo — Pronto para Separação
          </div>
        )}
        {separacao.status === 'separado' && separacao.separacao_irma_id && (
          <div className="text-[10px] font-semibold mt-2 px-2 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
            <Clock size={10} className="flex-shrink-0" /> Aguardando a irmã {separacao.separacao_irma_numero} chegar em Separado também
          </div>
        )}
        {separacao.liberado_sem_irma && (
          <div className="text-[10px] font-semibold mt-2 px-2 py-1.5 rounded-lg bg-orange-50 text-orange-700 border border-orange-200 flex items-center gap-1">
            <Lock size={10} className="flex-shrink-0" /> Liberada sem a irmã por {separacao.liberado_sem_irma_por} — pedido incompleto
          </div>
        )}
      </div>

      {/* Botões */}
      <div className="px-3 pb-3 space-y-1.5">
        {onOpenModal && (
          <button
            onClick={onOpenModal}
            className="w-full py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 border border-border text-muted-foreground hover:bg-muted hover:text-foreground">
            <ExternalLink size={11} /> Ver Detalhes
          </button>
        )}
        {separacao.status === 'aguardando_producao' ? (
          <div className="flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-amber-600 bg-amber-50 rounded-xl">
            <Clock size={12} /> Aguardando Produção
          </div>
        ) : separacao.status === 'liberado_expedicao' ? (
          <div className="flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-teal-600 bg-teal-50 rounded-xl">
            <CheckCircle size={12} /> Liberado p/ Expedição
          </div>
        ) : onAvancar && labelBotao ? (
          <button
            onClick={() => onAvancar(separacao)}
            disabled={loading || readonly}
            className="w-full py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
            style={{ background: `${accent}15`, color: accent }}
            onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = accent; e.currentTarget.style.color = '#fff'; } }}
            onMouseLeave={e => { e.currentTarget.style.background = `${accent}15`; e.currentTarget.style.color = accent; }}
          >
            {loading ? '...' : <><ArrowRight size={12} />{labelBotao}</>}
          </button>
        ) : null}
      </div>
    </div>
  );
}