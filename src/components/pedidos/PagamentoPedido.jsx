import { Banknote, QrCode, FileText, Gift, CreditCard, Link2, CheckCircle, Clock, Package } from 'lucide-react';

export const FORMAS_PAGAMENTO = [
  { key: 'dinheiro', label: 'Dinheiro', icon: Banknote },
  { key: 'pix', label: 'Pix', icon: QrCode },
  { key: 'boleto', label: 'Boleto', icon: FileText },
  { key: 'bonificacao', label: 'Bonificação', icon: Gift },
  { key: 'cartao_debito', label: 'Cartão de Débito', icon: CreditCard },
  { key: 'cartao_credito', label: 'Cartão de Crédito', icon: CreditCard },
  { key: 'link_pagamento', label: 'Link de Pagamento', icon: Link2 },
];

export const STATUS_PAGAMENTO = [
  { key: 'pago', label: 'Já foi pago', icon: CheckCircle, cor: 'text-green-700 border-green-400 bg-green-50' },
  { key: 'pendente', label: 'Pendente pagamento', icon: Clock, cor: 'text-amber-700 border-amber-400 bg-amber-50' },
  { key: 'pagamento_na_retirada', label: 'Pagamento na retirada', icon: Package, cor: 'text-blue-700 border-blue-400 bg-blue-50' },
];

export const getPagamentoLabel = (key) => FORMAS_PAGAMENTO.find(f => f.key === key)?.label || '—';
export const getStatusPagamentoLabel = (key) => STATUS_PAGAMENTO.find(s => s.key === key)?.label || '—';

// Forma de pagamento só é obrigatória quando o pedido já foi pago
export const formaPagamentoObrigatoria = (status) => status === 'pago';

export default function PagamentoPedido({ value, onChange }) {
  const obrigatoria = formaPagamentoObrigatoria(value.status_pagamento);
  return (
    <div className="space-y-5">
      <div>
        <label className="text-sm font-semibold text-foreground mb-2 block">Situação do pagamento *</label>
        <div className="space-y-2">
          {STATUS_PAGAMENTO.map(({ key, label, icon: Icon, cor }) => (
            <button key={key} type="button"
              onClick={() => onChange({ status_pagamento: key })}
              className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm text-left transition-all ${
                value.status_pagamento === key ? `${cor} font-semibold shadow-sm` : 'border-border text-muted-foreground hover:bg-muted/40'
              }`}>
              <Icon size={14} className="flex-shrink-0" /> {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-semibold text-foreground mb-2 block">
          Forma de pagamento {obrigatoria ? '*' : <span className="font-normal text-muted-foreground">(opcional)</span>}
        </label>
        <div className="grid grid-cols-2 gap-2">
          {FORMAS_PAGAMENTO.map(({ key, label, icon: Icon }) => (
            <button key={key} type="button"
              onClick={() => onChange({ forma_pagamento: value.forma_pagamento === key ? '' : key })}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm text-left transition-all ${
                value.forma_pagamento === key
                  ? 'border-primary bg-primary/5 text-foreground font-semibold shadow-sm'
                  : 'border-border text-muted-foreground hover:bg-muted/40'
              }`}>
              <Icon size={14} className="flex-shrink-0" /> {label}
            </button>
          ))}
        </div>
        {!obrigatoria && (
          <p className="text-xs text-muted-foreground mt-1.5">Pode deixar em branco e definir depois.</p>
        )}
      </div>

      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Observações do pagamento</label>
        <textarea value={value.observacoes_pagamento || ''}
          onChange={e => onChange({ observacoes_pagamento: e.target.value })}
          rows={2} placeholder="Ex: parcelado em 2x, link enviado por WhatsApp..."
          className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
      </div>
    </div>
  );
}