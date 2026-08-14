import { useState } from 'react';
import { X, ArrowRight, User, Tag, Package, Truck, MapPin, Calendar, Flag, CheckCircle, Hash, ClipboardList, Home, Clock, Factory, CheckSquare, Square } from 'lucide-react';
import AlertaFracionado from '@/components/fracionado/AlertaFracionado';

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

function fmtDataHora(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}
function fmtData(iso) {
  if (!iso) return null;
  return new Date(iso.includes('T') ? iso : iso + 'T12:00:00').toLocaleDateString('pt-BR');
}

export default function SeparacaoCardModal({ separacao, colunas = [], onAvancar, loading, labelBotao, onClose, onConfirmarEstoque }) {
  const [itensChecados, setItensChecados] = useState(() => new Set());
  const [confirmando, setConfirmando] = useState(false);
  const precisaConfirmarEstoque = separacao.status === 'aguardando_separacao' && !separacao.estoque_confirmado;
  const accent = STATUS_ACCENT[separacao.status] || '#64748B';
  const colunaAtual = colunas.find(c => c.key === separacao.status);
  const statusLabel = separacao.status === 'aguardando_producao' ? 'Aguardando Produção' : (colunaAtual?.label || separacao.status);
  const totalUn = (separacao.itens || []).reduce((s, i) => s + (i.quantidade || 0), 0);

  const datas = [
    { label: 'Criada em', valor: fmtDataHora(separacao.created_date) },
    { label: 'Início da separação', valor: fmtDataHora(separacao.data_inicio_separacao) },
    { label: 'Separado em', valor: fmtDataHora(separacao.data_separado) },
    { label: 'Conferência em', valor: fmtDataHora(separacao.data_conferencia) },
    { label: 'Liberado em', valor: fmtDataHora(separacao.data_liberacao) },
  ].filter(d => d.valor);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl max-h-[88vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-foreground truncate">
                {separacao.cliente_nome && separacao.pedido_numero
                  ? `${separacao.cliente_nome} • ${separacao.pedido_numero}`
                  : separacao.numero}
              </h3>
              {separacao.white_label && (
                <span className="inline-flex items-center gap-0.5 text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-bold">
                  <Tag size={8} /> WL
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: accent }}>
                {statusLabel}
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">{separacao.numero}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg flex-shrink-0">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          {/* Alerta de Estoque Fracionado ao separador */}
          {onAvancar && ['aguardando_separacao', 'em_separacao'].includes(separacao.status) && (
            <AlertaFracionado itens={separacao.itens || []} contexto={`Separação ${separacao.numero}`} />
          )}

          {/* Aguardando produção */}
          {separacao.status === 'aguardando_producao' && (
            <div className="text-xs font-semibold px-3 py-2.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 space-y-1">
              <p className="flex items-center gap-1.5"><Clock size={12} /> Aguardando Produção — {separacao.quantidade_pendente_producao || 0} un em produção</p>
              <p className="text-green-600">🟢 {separacao.quantidade_total || 0} un já reservadas em estoque</p>
            </div>
          )}
          {separacao.producao_concluida && (
            <div className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-green-50 text-green-700 border border-green-200">
              <CheckCircle size={12} /> Produção concluída — pedido completo
            </div>
          )}

          {/* Vínculos */}
          <div className="grid grid-cols-2 gap-2">
            {separacao.cliente_nome && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
                <p className="text-[10px] text-blue-500 font-semibold uppercase flex items-center gap-1"><User size={9} /> Cliente</p>
                <p className="text-xs font-bold text-blue-800 truncate">{separacao.cliente_nome}</p>
              </div>
            )}
            {separacao.grupo_cliente_nome && !separacao.cliente_nome && (
              <div className="bg-violet-50 border border-violet-100 rounded-xl px-3 py-2">
                <p className="text-[10px] text-violet-500 font-semibold uppercase flex items-center gap-1"><User size={9} /> Grupo</p>
                <p className="text-xs font-bold text-violet-800 truncate">{separacao.grupo_cliente_nome}</p>
              </div>
            )}
            {separacao.pedido_numero && (
              <div className="bg-muted/40 border border-border rounded-xl px-3 py-2">
                <p className="text-[10px] text-muted-foreground font-semibold uppercase flex items-center gap-1"><ClipboardList size={9} /> Pedido</p>
                <p className="text-xs font-bold text-foreground">#{separacao.pedido_numero}</p>
              </div>
            )}
            {separacao.ordem_producao_numero && (
              <div className="bg-green-50 border border-green-100 rounded-xl px-3 py-2">
                <p className="text-[10px] text-green-600 font-semibold uppercase flex items-center gap-1"><Factory size={9} /> OP</p>
                <p className="text-xs font-bold text-green-800">{separacao.ordem_producao_numero}</p>
              </div>
            )}
            <div className="bg-muted/40 border border-border rounded-xl px-3 py-2">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase flex items-center gap-1"><Flag size={9} /> Prioridade</p>
              <p className={`text-xs font-bold ${separacao.prioridade === 'alta' ? 'text-red-600' : 'text-foreground'}`}>
                {separacao.prioridade === 'alta' ? 'Alta' : separacao.prioridade === 'baixa' ? 'Baixa' : 'Normal'}
              </p>
            </div>
            {separacao.data_prevista && (
              <div className="bg-muted/40 border border-border rounded-xl px-3 py-2">
                <p className="text-[10px] text-muted-foreground font-semibold uppercase flex items-center gap-1"><Calendar size={9} /> Prev. Entrega</p>
                <p className="text-xs font-bold text-foreground">{fmtData(separacao.data_prevista)}</p>
              </div>
            )}
          </div>

          {/* Itens — checklist de confirmação, ou lista completa normal */}
          <div>
            {precisaConfirmarEstoque ? (
              <>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-amber-700 uppercase tracking-wide flex items-center gap-1.5">
                    <ClipboardList size={12} /> Confirme o que tem em estoque
                  </p>
                  {(separacao.itens || []).length > 0 && (
                    <button
                      onClick={() => setItensChecados(prev => prev.size === separacao.itens.length ? new Set() : new Set(separacao.itens.map(i => i.produto_id)))}
                      className="text-xs font-semibold text-primary hover:underline">
                      {itensChecados.size === separacao.itens.length ? 'Desmarcar tudo' : 'Marcar tudo'}
                    </button>
                  )}
                </div>
                {(separacao.itens || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-3 bg-muted/30 rounded-xl">Sem itens registrados</p>
                ) : (
                  <div className="border border-amber-200 rounded-xl divide-y divide-amber-100 overflow-hidden bg-amber-50/30">
                    {separacao.itens.map((item, idx) => {
                      const checado = itensChecados.has(item.produto_id);
                      return (
                        <button
                          key={idx}
                          onClick={() => setItensChecados(prev => {
                            const next = new Set(prev);
                            if (next.has(item.produto_id)) next.delete(item.produto_id); else next.add(item.produto_id);
                            return next;
                          })}
                          className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors ${checado ? 'bg-emerald-50' : 'hover:bg-amber-100/50 bg-white'}`}
                        >
                          {checado ? <CheckSquare size={16} className="text-emerald-600 flex-shrink-0" /> : <Square size={16} className="text-muted-foreground flex-shrink-0" />}
                          <span className="text-xs text-foreground truncate flex-1">{item.produto_nome}</span>
                          <span className="text-xs font-bold text-foreground bg-muted px-2 py-0.5 rounded-lg flex-shrink-0">{item.quantidade} un</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Package size={11} /> Itens ({separacao.quantidade_itens || (separacao.itens || []).length} distintos · {totalUn} un)
                </p>
                {(separacao.itens || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-3 bg-muted/30 rounded-xl">Sem itens registrados</p>
                ) : (
                  <div className="border border-border rounded-xl divide-y divide-border/60 overflow-hidden">
                    {separacao.itens.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-2 px-3 py-2 bg-white">
                        <span className="text-xs text-foreground truncate flex-1">{item.produto_nome}</span>
                        <span className="text-xs font-bold text-foreground bg-muted px-2 py-0.5 rounded-lg flex-shrink-0">{item.quantidade} un</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Entrega */}
          {(separacao.destino_tipo || separacao.destino_transportadora || separacao.destino_unidade || separacao.destino_endereco) && (
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Truck size={11} /> Entrega
              </p>
              <div className="bg-muted/30 border border-border rounded-xl px-3 py-2.5 space-y-1.5 text-xs text-foreground">
                {separacao.destino_tipo && <p className="flex items-center gap-1.5"><Truck size={10} className="text-muted-foreground" /> {DESTINO_LABEL[separacao.destino_tipo] || separacao.destino_tipo}</p>}
                {separacao.destino_transportadora && <p className="flex items-center gap-1.5"><Truck size={10} className="text-muted-foreground" /> {separacao.destino_transportadora}</p>}
                {separacao.destino_unidade && <p className="flex items-center gap-1.5"><Home size={10} className="text-muted-foreground" /> {separacao.destino_unidade}</p>}
                {separacao.destino_endereco && <p className="flex items-start gap-1.5"><MapPin size={10} className="text-muted-foreground mt-0.5 flex-shrink-0" /> {separacao.destino_endereco}</p>}
              </div>
            </div>
          )}

          {/* Datas */}
          {datas.length > 0 && (
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Hash size={11} /> Histórico
              </p>
              <div className="bg-muted/30 border border-border rounded-xl px-3 py-2.5 space-y-1">
                {datas.map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{d.label}</span>
                    <span className="font-semibold text-foreground">{d.valor}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Observações */}
          {separacao.observacoes && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2.5">
              <p className="text-[10px] text-yellow-600 font-semibold uppercase mb-0.5">📝 Observações</p>
              <p className="text-xs text-yellow-800">{separacao.observacoes}</p>
            </div>
          )}
        </div>

        {/* Rodapé com ação */}
        <div className="px-6 py-4 border-t border-border flex-shrink-0">
          {separacao.status === 'aguardando_producao' ? (
            <div className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-amber-600 bg-amber-50 rounded-xl">
              <Clock size={13} /> Aguardando Produção
            </div>
          ) : separacao.status === 'liberado_expedicao' ? (
            <div className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-teal-600 bg-teal-50 rounded-xl">
              <CheckCircle size={13} /> Liberado p/ Expedição
            </div>
          ) : onAvancar && labelBotao ? (
            <button
              onClick={() => onAvancar(separacao)}
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
              style={{ background: accent }}>
              {loading ? '...' : <><ArrowRight size={13} />{labelBotao}</>}
            </button>
          ) : (
            <button onClick={onClose} className="w-full py-2.5 rounded-xl text-sm font-semibold border border-border text-muted-foreground hover:bg-muted transition-colors">
              Fechar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}