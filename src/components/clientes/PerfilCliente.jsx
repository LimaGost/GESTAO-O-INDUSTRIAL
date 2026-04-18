import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import {
  X, Edit2, Check, ShoppingCart, TrendingUp,
  Star, MessageSquare, Plus, Phone, Mail,
  MapPin, Package, DollarSign, CreditCard
} from 'lucide-react';

const fmtR = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';

const STATUS_LABEL = {
  rascunho: 'Rascunho', aguardando_estoque: 'Ag. Estoque',
  separacao: 'Separação', separado: 'Separado',
  expedido: 'Expedido', cancelado: 'Cancelado',
};
const STATUS_COLOR = {
  rascunho: 'bg-muted text-muted-foreground',
  aguardando_estoque: 'bg-orange-100 text-orange-700',
  separacao: 'bg-sky-100 text-sky-700',
  separado: 'bg-green-100 text-green-700',
  expedido: 'bg-purple-100 text-purple-700',
  cancelado: 'bg-red-100 text-red-700',
};

function diasSemComprar(pedidos) {
  const ativos = pedidos.filter(p => p.status !== 'cancelado');
  if (ativos.length === 0) return null;
  const datas = ativos.map(p => new Date(p.data_pedido || p.created_date)).filter(d => !isNaN(d));
  if (datas.length === 0) return null;
  return Math.floor((Date.now() - Math.max(...datas)) / 86400000);
}

export default function PerfilCliente({ cliente, onClose, onSave }) {
  const [pedidos, setPedidos] = useState([]);
  const [loadingPedidos, setLoadingPedidos] = useState(true);
  const [obs, setObs] = useState(cliente.observacoes_relacionamento || '');
  const [editingObs, setEditingObs] = useState(false);
  const [novaInteracao, setNovaInteracao] = useState('');
  const [novoPagamento, setNovoPagamento] = useState({ forma: '', obs: '' });
  const [savingObs, setSavingObs] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState('pedidos');

  useEffect(() => {
    base44.entities.Pedido.filter({ cliente_id: cliente.id }, '-data_pedido').then(data => {
      setPedidos(data.sort((a, b) => new Date(b.data_pedido) - new Date(a.data_pedido)));
      setLoadingPedidos(false);
    });
  }, [cliente.id]);

  const pedidosAtivos = pedidos.filter(p => p.status !== 'cancelado');
  const totalInvestido = pedidosAtivos.reduce((s, p) => s + (p.valor_total || 0), 0);
  const ticketMedio = pedidosAtivos.length > 0 ? totalInvestido / pedidosAtivos.length : 0;
  const dias = diasSemComprar(pedidos);

  const prodMap = {};
  for (const ped of pedidosAtivos) {
    for (const item of ped.itens || []) {
      const k = item.produto_nome;
      if (!prodMap[k]) prodMap[k] = { nome: k, qtd: 0, valor: 0 };
      prodMap[k].qtd += item.quantidade || 0;
      prodMap[k].valor += item.total || 0;
    }
  }
  const topProdutos = Object.values(prodMap).sort((a, b) => b.qtd - a.qtd).slice(0, 5);

  const salvarObs = async () => {
    setSavingObs(true);
    await base44.entities.Cliente.update(cliente.id, { observacoes_relacionamento: obs });
    setSavingObs(false);
    setEditingObs(false);
    onSave?.({ ...cliente, observacoes_relacionamento: obs });
  };

  const adicionarInteracao = async () => {
    if (!novaInteracao.trim()) return;
    const novas = [
      { data: new Date().toISOString(), descricao: novaInteracao.trim(), usuario: 'Equipe' },
      ...(cliente.interacoes || []),
    ];
    await base44.entities.Cliente.update(cliente.id, { interacoes: novas });
    setNovaInteracao('');
    onSave?.({ ...cliente, interacoes: novas });
  };

  const adicionarPagamento = async () => {
    if (!novoPagamento.forma) return;
    const novas = [
      { data: new Date().toISOString(), forma: novoPagamento.forma, obs: novoPagamento.obs },
      ...(cliente.formas_pagamento || []),
    ];
    await base44.entities.Cliente.update(cliente.id, { formas_pagamento: novas });
    setNovoPagamento({ forma: '', obs: '' });
    onSave?.({ ...cliente, formas_pagamento: novas });
  };

  const interacoes = cliente.interacoes || [];

  const statusRisco = dias === null ? { label: 'Sem pedido', color: 'text-muted-foreground', bg: 'bg-muted' }
    : dias <= 30 ? { label: 'Cliente ativo', color: 'text-green-600', bg: 'bg-green-100' }
    : dias <= 90 ? { label: `${dias}d sem comprar`, color: 'text-orange-600', bg: 'bg-orange-100' }
    : { label: `${dias}d sem comprar — em risco`, color: 'text-red-600', bg: 'bg-red-100' };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-0 md:p-4">
      <div className="bg-card w-full md:max-w-2xl md:rounded-2xl rounded-t-2xl max-h-[90vh] flex flex-col shadow-2xl border border-border"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-4 px-5 py-4 border-b border-border flex-shrink-0">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-lg text-primary">
            {cliente.nome.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-foreground text-base truncate">{cliente.nome}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusRisco.bg} ${statusRisco.color}`}>
              {statusRisco.label}
            </span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl transition-colors">
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>

        {/* Info rápida */}
        <div className="flex flex-wrap gap-3 px-5 py-3 border-b border-border flex-shrink-0">
          {cliente.telefone && (
            <a href={`tel:${cliente.telefone}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
              <Phone size={12} />{cliente.telefone}
            </a>
          )}
          {cliente.email && (
            <a href={`mailto:${cliente.email}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
              <Mail size={12} />{cliente.email}
            </a>
          )}
          {(cliente.cidade || cliente.estado) && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin size={12} />{[cliente.cidade, cliente.estado].filter(Boolean).join(', ')}
            </span>
          )}
          {cliente.cnpj_cpf && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CreditCard size={12} />{cliente.cnpj_cpf}
            </span>
          )}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-2 px-5 py-3 border-b border-border flex-shrink-0">
          {[
            { icon: ShoppingCart, color: 'text-sky-600', bg: 'bg-sky-50', label: 'Pedidos', value: pedidos.length },
            { icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50', label: 'Total', value: fmtR(totalInvestido) },
            { icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50', label: 'Ticket Médio', value: fmtR(ticketMedio) },
            { icon: Package, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Produtos', value: Object.keys(prodMap).length },
          ].map(({ icon: Icon, color, bg, label, value }) => (
            <div key={label} className={`${bg} rounded-xl p-2.5 text-center`}>
              <Icon size={14} className={`${color} mx-auto mb-1`} />
              <p className="text-sm font-bold text-foreground truncate">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        {/* Abas */}
        <div className="flex gap-1 bg-muted m-4 mb-0 p-1 rounded-xl flex-shrink-0">
          {[{ key: 'pedidos', label: 'Pedidos' }, { key: 'produtos', label: 'Preferências' }, { key: 'crm', label: 'CRM' }].map(a => (
            <button key={a.key} onClick={() => setAbaAtiva(a.key)}
              className={`flex-1 px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${abaAtiva === a.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              {a.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Aba: Pedidos */}
          {abaAtiva === 'pedidos' && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Histórico de Pedidos</p>
              {loadingPedidos ? (
                <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded-xl" />)}</div>
              ) : pedidos.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum pedido encontrado.</p>
              ) : (
                <div className="space-y-2">
                  {pedidos.map(p => (
                    <div key={p.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{p.numero}</p>
                        <p className="text-xs text-muted-foreground">{fmtDate(p.data_pedido)} · {(p.itens || []).length} item(s)</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[p.status] || 'bg-muted text-muted-foreground'}`}>
                        {STATUS_LABEL[p.status] || p.status}
                      </span>
                      <p className="text-sm font-bold text-foreground">{fmtR(p.valor_total)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Aba: Produtos */}
          {abaAtiva === 'produtos' && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Produtos Mais Comprados</p>
              {topProdutos.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum pedido registrado.</p>
              ) : (
                <div className="space-y-2">
                  {topProdutos.map((p, i) => {
                    const maxQtd = topProdutos[0].qtd;
                    const pct = Math.round((p.qtd / maxQtd) * 100);
                    return (
                      <div key={p.nome} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-foreground">{i === 0 && '⭐ '}{p.nome}</span>
                          <span className="text-muted-foreground">{p.qtd} un · {fmtR(p.valor)}</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Aba: CRM */}
          {abaAtiva === 'crm' && (
            <div className="space-y-4">
              {/* Observações */}
              <div className="bg-muted/30 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Observações de Relacionamento</p>
                  {!editingObs && (
                    <button onClick={() => setEditingObs(true)} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
                      <Edit2 size={13} className="text-muted-foreground" />
                    </button>
                  )}
                </div>
                {editingObs ? (
                  <div className="space-y-2">
                    <textarea rows={3} value={obs} onChange={e => setObs(e.target.value)}
                      className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
                    <div className="flex gap-2">
                      <button onClick={salvarObs} disabled={savingObs}
                        className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-semibold">
                        <Check size={12} /> {savingObs ? 'Salvando...' : 'Salvar'}
                      </button>
                      <button onClick={() => { setEditingObs(false); setObs(cliente.observacoes_relacionamento || ''); }}
                        className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg border border-border">
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-foreground">{obs || <em className="text-muted-foreground">Nenhuma observação.</em>}</p>
                )}
              </div>

              {/* Interações */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <MessageSquare size={12} /> Histórico de Interações
                </p>
                <div className="flex gap-2">
                  <input value={novaInteracao} onChange={e => setNovaInteracao(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && adicionarInteracao()}
                    placeholder="Registrar nova interação..."
                    className="flex-1 border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                  <button onClick={adicionarInteracao} className="px-3 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold">
                    <Plus size={14} />
                  </button>
                </div>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {interacoes.map((i, idx) => (
                    <div key={idx} className="text-xs bg-muted/30 rounded-xl px-3 py-2">
                      <p className="font-medium text-foreground">{i.descricao}</p>
                      <p className="text-muted-foreground">{new Date(i.data).toLocaleDateString('pt-BR')} — {i.usuario}</p>
                    </div>
                  ))}
                  {interacoes.length === 0 && <p className="text-xs text-muted-foreground italic">Nenhuma interação registrada.</p>}
                </div>
              </div>

              {/* Formas de pagamento */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <CreditCard size={12} /> Formas de Pagamento
                </p>
                <div className="flex gap-2">
                  <input value={novoPagamento.forma} onChange={e => setNovoPagamento(p => ({ ...p, forma: e.target.value }))}
                    placeholder="Ex: Pix, Boleto, Cartão..."
                    className="flex-1 border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                  <input value={novoPagamento.obs} onChange={e => setNovoPagamento(p => ({ ...p, obs: e.target.value }))}
                    placeholder="Obs..."
                    className="w-28 border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                  <button onClick={adicionarPagamento} className="px-3 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold">
                    <Plus size={14} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(cliente.formas_pagamento || []).map((fp, idx) => (
                    <span key={idx} className="text-xs bg-muted px-2 py-1 rounded-lg text-muted-foreground">
                      {fp.forma}{fp.obs ? ` (${fp.obs})` : ''}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}