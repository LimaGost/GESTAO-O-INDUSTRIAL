import { ArrowRight, Clock, Package, AlertTriangle, CheckCircle, User, Calendar, ExternalLink, Printer } from 'lucide-react';
import { imprimirEtiquetaProduto } from '@/lib/imprimirEtiquetaProduto';
import CardChecklist from './CardChecklist';

function fmtData(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

const PROXIMOS = {
  a_produzir: 'em_producao', em_producao: 'produzido',
  produzido: 'em_embalagem', em_embalagem: 'finalizado',
};



const ETAPAS = ['a_produzir', 'em_producao', 'produzido', 'em_embalagem', 'finalizado'];

const ORIGEM_CONFIG = {
  pedido:        { label: 'Pedido',    bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' },
  estoque_minimo:{ label: 'Reposição', bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA' },
  manual:        { label: 'Manual',    bg: '#F8FAFC', color: '#64748B', border: '#E2E8F0' },
};

const STATUS_ACCENT = {
  a_produzir: '#64748B', em_producao: '#0EA5E9', produzido: '#22C55E',
  em_embalagem: '#F59E0B', finalizado: '#A855F7',
};

function tempoDecorrido(dataISO) {
  if (!dataISO) return null;
  const diff = Date.now() - new Date(dataISO).getTime();
  if (diff <= 0) return null;
  const totalMin = Math.floor(diff / 60000);
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  const hours = d * 24 + h + m / 60;
  if (d > 0) return { text: `${d}d ${h}h`, hours };
  if (h > 0) return { text: `${h}h ${m}m`, hours };
  return { text: `${m}min`, hours };
}

export default function KanbanCard({ ordem, clienteNome, checklistConfigs = {}, checklistOk, setChecklistOk, onAvancar, loading, onOpenModal, labelBotao, acaoAtual }) {
  const origem = ordem.origem || 'manual';
  const origemCfg = ORIGEM_CONFIG[origem] || ORIGEM_CONFIG.manual;
  const checkKey = `${ordem.id}_${ordem.status}`;
  const itensChecklist = checklistConfigs[ordem.status]?.itens || [];
  const checklistCompleto = itensChecklist.length === 0 || checklistOk?.[checkKey];

  const dataEntradaEtapa =
    ordem.status === 'em_producao' ? ordem.data_inicio :
    ordem.status === 'produzido' ? ordem.data_fim_producao :
    ordem.status === 'em_embalagem' ? ordem.data_embalagem :
    ordem.created_date;

  const tempo = tempoDecorrido(dataEntradaEtapa);
  const horas = tempo?.hours || 0;
  const urgente = horas > 48;
  const atencao = horas > 24 && !urgente;

  const qtdTotal = ordem.itens?.length > 0
    ? ordem.itens.reduce((s, i) => s + (i.quantidade || 0), 0)
    : (ordem.quantidade || 0);

  const itensDisponiveis = (ordem.itens || []).filter(i => i.disponivel === true).length;
  const itensPendentes = (ordem.itens || []).filter(i => i.disponivel !== true).length;
  const temMisto = itensDisponiveis > 0 && itensPendentes > 0;

  const accent = STATUS_ACCENT[ordem.status] || '#64748B';
  const leftBorderColor = urgente ? '#EF4444' : atencao ? '#F97316' : accent;

  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden"
      style={{ border: `1px solid #E2E8F0`, borderLeftWidth: '3px', borderLeftColor: leftBorderColor }}>

      {/* Header */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <span className="text-xs font-bold text-foreground truncate">{ordem.numero}</span>
            {ordem.pedido_numero && (
              <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium flex-shrink-0">📋 {ordem.pedido_numero}</span>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
              style={{ background: origemCfg.bg, color: origemCfg.color, border: `1px solid ${origemCfg.border}` }}>
              {origemCfg.label}
            </span>
          </div>
        </div>

        {/* Badge de itens mistos (estoque + produção) */}
        {temMisto && (
          <div className="flex items-center gap-1 text-[10px] font-semibold mb-1.5 px-1.5 py-1 rounded-lg bg-blue-50 text-blue-700">
            <Package size={10} />
            {itensDisponiveis} em estoque · {itensPendentes} para produzir
          </div>
        )}

        {/* Urgência */}
        {(urgente || atencao) && (
          <div className={`flex items-center gap-1 text-[10px] font-semibold mb-2 px-1.5 py-1 rounded-lg ${urgente ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
            <AlertTriangle size={10} />
            {urgente ? `Urgente — ${tempo?.text}` : `Atenção — ${tempo?.text}`}
          </div>
        )}

        {/* Cliente */}
        {clienteNome && (
          <div className="flex items-center gap-1 text-xs text-blue-600 mb-1.5 bg-blue-50 px-2 py-1 rounded-lg">
            <User size={10} className="flex-shrink-0" /><span className="truncate font-medium">{clienteNome}</span>
          </div>
        )}

        {/* Produtos */}
        {ordem.itens?.length > 0 ? (
          <div className="space-y-0.5 mb-2">
            {ordem.itens.slice(0, 3).map((item, idx) => (
              <div key={idx} className={`flex items-center justify-between text-xs px-1.5 py-0.5 rounded ${item.disponivel ? 'bg-green-50' : ''}`}>
                <span className={`truncate flex-1 ${item.disponivel ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{item.produto_nome}</span>
                <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                  {item.disponivel && <span className="text-[9px] text-green-600 font-bold">✓</span>}
                  <span className={`font-semibold ${item.disponivel ? 'text-green-600' : 'text-foreground'}`}>{item.quantidade}</span>
                </div>
              </div>
            ))}
            {ordem.itens.length > 3 && <p className="text-[10px] text-muted-foreground">+{ordem.itens.length - 3} mais</p>}
          </div>
        ) : (
          <p className="text-xs text-foreground mb-1.5 truncate">{ordem.produto_nome}</p>
        )}

        {/* Métricas */}
        <div className="flex items-center gap-2 flex-wrap text-[10px] text-muted-foreground mb-2">
          <span className="flex items-center gap-0.5"><Package size={9} />{qtdTotal} un</span>
          {tempo && !urgente && !atencao && ordem.status !== 'finalizado' && (
            <span className="flex items-center gap-0.5"><Clock size={9} />{tempo.text}</span>
          )}
          {ordem.created_date && <span className="flex items-center gap-0.5"><Calendar size={9} />{fmtData(ordem.created_date)}</span>}
          {ordem.lote && <span className="font-mono">{ordem.lote}</span>}
        </div>

        {ordem.observacoes && (
          <p className="text-[10px] text-muted-foreground italic line-clamp-1 mb-2">{ordem.observacoes}</p>
        )}

        {/* Progress bar */}
        {ordem.status !== 'finalizado' && (
          <div className="flex gap-0.5 mb-2">
            {ETAPAS.slice(0, -1).map((e, i) => {
              const idx = ETAPAS.indexOf(ordem.status);
              const filled = i < idx;
              const current = i === idx;
              return (
                <div key={e} className="flex-1 h-1 rounded-full transition-all"
                  style={{ background: filled || current ? accent : '#E2E8F0', opacity: current ? 1 : filled ? 0.7 : 1 }} />
              );
            })}
          </div>
        )}
      </div>

      {/* Checklist no card — sempre visível se houver itens */}
      {itensChecklist.length > 0 && (
        <div className="px-3 pb-2">
          <CardChecklist
            ordemId={checkKey}
            itens={itensChecklist}
            onAllChecked={(done) => setChecklistOk?.(prev => ({ ...prev, [checkKey]: done }))}
            externalDone={checklistOk?.[checkKey]}
            readonly={!onAvancar}
          />
        </div>
      )}

      {/* Botões */}
      <div className="px-3 pb-3 space-y-1.5">
        {/* Ver Detalhes — sempre visível */}
        {onOpenModal && (
          <button
            onClick={onOpenModal}
            className="w-full py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 border border-border text-muted-foreground hover:bg-muted hover:text-foreground">
            <ExternalLink size={11} /> Ver Detalhes
          </button>
        )}

        {/* Imprimir Etiqueta — visível na coluna de separação */}
        {acaoAtual === 'saida_estoque' && (
          <button
            onClick={() => {
              const itensOP = ordem.itens?.length > 0 ? ordem.itens : (ordem.produto_id ? [{ produto_id: ordem.produto_id, produto_nome: ordem.produto_nome, quantidade: ordem.quantidade }] : []);
              itensOP.forEach(item => imprimirEtiquetaProduto({
                produto_nome: item.produto_nome,
                quantidade: item.quantidade,
                lote: ordem.lote || '—',
                data_producao: new Date().toISOString().slice(0, 10),
                codigo_barras: item.produto_id || item.produto_nome,
              }));
            }}
            className="w-full py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 border border-primary/30 text-primary hover:bg-primary/10">
            <Printer size={11} /> Imprimir Etiqueta
          </button>
        )}

        {ordem.status === 'finalizado' ? (
          <div className="flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-green-600 bg-green-50 rounded-xl">
            <CheckCircle size={12} /> Concluído
          </div>
        ) : onAvancar && PROXIMOS[ordem.status] ? (
          <button
            onClick={() => onAvancar(ordem)}
            disabled={loading || !checklistCompleto}
            className="w-full py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
            style={{ background: `${accent}15`, color: accent }}
            onMouseEnter={e => { e.currentTarget.style.background = accent; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = `${accent}15`; e.currentTarget.style.color = accent; }}
          >
            {loading ? '...' : <><ArrowRight size={12} />{labelBotao || 'Avançar'}</>}
          </button>
        ) : null}
      </div>
    </div>
  );
}