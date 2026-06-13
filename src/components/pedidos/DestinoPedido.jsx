import { MapPin, Factory, Building2, Truck, Home } from 'lucide-react';

export const DESTINO_OPCOES = [
  { value: 'retirada_fabrica',  label: 'Retirada na Fábrica',         icon: Factory,   color: 'text-slate-600',  bg: 'bg-slate-100',  border: 'border-slate-300' },
  { value: 'retirada_unidade',  label: 'Retirada na Unidade',         icon: Building2, color: 'text-blue-600',   bg: 'bg-blue-50',    border: 'border-blue-200' },
  { value: 'transportadora',    label: 'Entrega via Transportadora',  icon: Truck,     color: 'text-orange-600', bg: 'bg-orange-50',  border: 'border-orange-200' },
  { value: 'entrega_cliente',   label: 'Entrega no Endereço',         icon: Home,      color: 'text-green-600',  bg: 'bg-green-50',   border: 'border-green-200' },
];

export const UNIDADES_PADRAO = [
  'Unidade Raio do Sol — Centro',
  'Unidade Raio do Sol — Sul',
  'Unidade Raio do Sol — Norte',
];

export function getDestinoLabel(pedido) {
  if (!pedido?.destino_tipo) return null;
  const op = DESTINO_OPCOES.find(o => o.value === pedido.destino_tipo);
  if (!op) return null;
  let detalhe = '';
  if (pedido.destino_tipo === 'retirada_unidade' && pedido.destino_unidade) detalhe = ` — ${pedido.destino_unidade}`;
  if (pedido.destino_tipo === 'transportadora' && pedido.destino_transportadora) detalhe = ` — ${pedido.destino_transportadora}`;
  if (pedido.destino_tipo === 'entrega_cliente' && pedido.destino_endereco) detalhe = `: ${pedido.destino_endereco}`;
  return { ...op, detalhe, texto: op.label + detalhe };
}

/** Badge compacto para exibição em cards/listas */
export function DestinoBadge({ pedido, className = '' }) {
  const info = getDestinoLabel(pedido);
  if (!info) return null;
  const Icon = info.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${info.bg} ${info.color} ${info.border} ${className}`}>
      <Icon size={9} />
      {info.texto}
    </span>
  );
}

/** Formulário completo de seleção de destino */
export function DestinoForm({ value, onChange, clienteEndereco = '' }) {
  const tipo = value?.destino_tipo || '';

  const update = (field, val) => onChange({ ...value, [field]: val });
  const selectTipo = (t) => {
    const next = { destino_tipo: t, destino_unidade: '', destino_transportadora: '', destino_endereco: '' };
    if (t === 'entrega_cliente') next.destino_endereco = clienteEndereco || '';
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <label className="text-xs font-semibold text-muted-foreground block">Destino do Pedido</label>
      <div className="grid grid-cols-2 gap-2">
        {DESTINO_OPCOES.map(op => {
          const Icon = op.icon;
          const sel = tipo === op.value;
          return (
            <button key={op.value} type="button"
              onClick={() => selectTipo(op.value)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all ${
                sel
                  ? `${op.bg} ${op.border} ${op.color} font-semibold ring-1 ring-current`
                  : 'border-border bg-background text-muted-foreground hover:bg-muted'
              }`}>
              <Icon size={14} className="flex-shrink-0" />
              <span className="text-xs leading-tight">{op.label}</span>
            </button>
          );
        })}
      </div>

      {tipo === 'retirada_unidade' && (
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Unidade</label>
          <select
            value={value?.destino_unidade || ''}
            onChange={e => update('destino_unidade', e.target.value)}
            className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="">Selecione a unidade...</option>
            {UNIDADES_PADRAO.map(u => <option key={u} value={u}>{u}</option>)}
            <option value="outra">Outra unidade...</option>
          </select>
          {value?.destino_unidade === 'outra' && (
            <input
              value={value?.destino_unidade_custom || ''}
              onChange={e => update('destino_unidade', e.target.value)}
              placeholder="Digite o nome da unidade..."
              className="mt-2 w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          )}
        </div>
      )}

      {tipo === 'transportadora' && (
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Transportadora</label>
          <input
            value={value?.destino_transportadora || ''}
            onChange={e => update('destino_transportadora', e.target.value)}
            placeholder="Ex: Correios, Jadlog, Total Express..."
            className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      )}

      {tipo === 'entrega_cliente' && (
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Endereço de entrega</label>
          <textarea
            value={value?.destino_endereco || ''}
            onChange={e => update('destino_endereco', e.target.value)}
            rows={2}
            placeholder="Endereço completo de entrega..."
            className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>
      )}
    </div>
  );
}