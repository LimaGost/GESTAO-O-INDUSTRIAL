import { useState } from 'react';
import BadgeSemRotulo from '@/components/common/BadgeSemRotulo';
import { FileText, Truck, CheckCircle, Printer, ChevronDown, ChevronUp, MapPin, Package, Send, Clock, Tag } from 'lucide-react';

const STATUS_CONFIG = {
  emitida: { label: 'Emitida', color: 'bg-blue-100 text-blue-700 border-blue-300', icon: FileText, dot: 'bg-blue-500' },
  enviada: { label: 'Em Trânsito', color: 'bg-amber-100 text-amber-700 border-amber-300', icon: Truck, dot: 'bg-amber-500' },
  entregue: { label: 'Entregue', color: 'bg-green-100 text-green-700 border-green-300', icon: CheckCircle, dot: 'bg-green-500' },
};

function fmtData(str) {
  if (!str) return '—';
  const d = str.includes('T') ? new Date(str) : new Date(str + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export default function ExpedicaoCard({ exp, onAtualizarStatus, onImprimirNF, onConfirmarRecebimento, ocultarValores }) {
  const [expandido, setExpandido] = useState(false);
  const st = STATUS_CONFIG[exp.status] || STATUS_CONFIG.emitida;
  const StatusIcon = st.icon;
  const totalItens = (exp.itens || []).reduce((s, i) => s + (i.quantidade || 0), 0);

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-md transition-all">
      <div className="h-1 w-full" style={{ background: exp.status === 'entregue' ? '#22C55E' : exp.status === 'enviada' ? '#F59E0B' : '#3B82F6' }} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
              <StatusIcon size={16} className="text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-bold text-foreground">{exp.numero_nf}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${st.color}`}>{st.label}</span>
                {exp.white_label && (
                  <span className="inline-flex items-center gap-1 text-xs bg-purple-100 text-purple-700 border border-purple-300 px-2 py-0.5 rounded-full font-bold">
                    <Tag size={10} /> WL{exp.white_label_marca ? ` · ${exp.white_label_marca}` : ''}
                  </span>
                )}
                {(exp.sem_rotulo || (exp.itens || []).some(i => i.sem_rotulo)) && <BadgeSemRotulo />}
                {exp.confirmado_pelo_cliente && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Recebido</span>
                )}
              </div>
              <p className="text-sm font-medium text-foreground mt-0.5">{exp.cliente_nome}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                {exp.pedido_numero && <span>📋 {exp.pedido_numero}</span>}
                <span>{fmtData(exp.data_emissao)}</span>
                <span>{totalItens} un</span>
                {exp.transportadora && <span>🚚 {exp.transportadora}</span>}
                <span className="font-semibold text-foreground">{ocultarValores ? '••••••' : `R$ ${(exp.valor_total || 0).toFixed(2)}`}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap">
            {onAtualizarStatus && exp.status === 'emitida' && (
              <button onClick={() => onAtualizarStatus(exp.id, 'enviada')}
                className="flex items-center gap-1 text-xs bg-amber-50 text-amber-700 border border-amber-300 px-2.5 py-1.5 rounded-lg hover:bg-amber-100 font-semibold transition-colors">
                <Send size={11} /> Enviado
              </button>
            )}
            {onAtualizarStatus && exp.status === 'enviada' && !exp.confirmado_pelo_cliente && (
              <button onClick={() => onAtualizarStatus(exp.id, 'entregue')}
                className="flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-300 px-2.5 py-1.5 rounded-lg hover:bg-green-100 font-semibold transition-colors">
                <CheckCircle size={11} /> Entregue
              </button>
            )}
            {onConfirmarRecebimento && !exp.confirmado_pelo_cliente && exp.status !== 'emitida' && (
              <button onClick={() => onConfirmarRecebimento(exp)}
                className="text-xs border border-border px-2.5 py-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
                Confirmar
              </button>
            )}
            <button onClick={() => onImprimirNF(exp)}
              className="flex items-center gap-1 text-xs border border-border px-2.5 py-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
              <Printer size={11} /> NF
            </button>
            <button onClick={() => setExpandido(v => !v)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground">
              {expandido ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>

        {exp.confirmado_pelo_cliente && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-3 text-xs text-green-700 space-y-1">
            <p className="font-semibold">✅ Recebimento confirmado pelo cliente {exp.data_confirmacao_cliente && `— ${fmtData(exp.data_confirmacao_cliente)}`}</p>
            {exp.nome_recebedor && <p>👤 {exp.nome_recebedor} {exp.cpf_recebedor && `— ${exp.cpf_recebedor}`}</p>}
            {exp.observacoes_cliente && <p className="italic">"{exp.observacoes_cliente}"</p>}
          </div>
        )}

        {expandido && (
          <div className="mt-3 pt-3 border-t border-border space-y-3">
            {exp.cliente_endereco && (
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <MapPin size={12} className="mt-0.5 flex-shrink-0" />
                <span>{exp.cliente_endereco}</span>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    {['Produto', 'Qtd', 'Unit.', 'Total'].map(h => (
                      <th key={h} className="text-left py-1.5 pr-3 text-muted-foreground font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(exp.itens || []).map((item, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-1.5 pr-3 text-foreground">
                        {item.produto_nome}
                        {item.sem_rotulo && <span className="ml-1.5 inline-block align-middle"><BadgeSemRotulo size="sm" /></span>}
                      </td>
                      <td className="py-1.5 pr-3">{item.quantidade}</td>
                      <td className="py-1.5 pr-3">{ocultarValores ? '••••••' : `R$ ${(item.preco_unitario || 0).toFixed(2)}`}</td>
                      <td className="py-1.5 font-medium text-foreground">{ocultarValores ? '••••••' : `R$ ${(item.total || 0).toFixed(2)}`}</td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={3} className="pt-2 text-right font-semibold text-muted-foreground text-xs">Total</td>
                    <td className="pt-2 font-bold text-foreground">{ocultarValores ? '••••••' : `R$ ${(exp.valor_total || 0).toFixed(2)}`}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            {exp.observacoes && <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">📝 {exp.observacoes}</p>}
            <div className="flex gap-4 text-xs text-muted-foreground">
              {exp.data_emissao && <span>Emissão: <strong>{fmtData(exp.data_emissao)}</strong></span>}
              {exp.data_entrega && <span>Entrega: <strong>{fmtData(exp.data_entrega)}</strong></span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}