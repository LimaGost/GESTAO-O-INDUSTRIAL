import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import {
  X, Edit2, Check, ShoppingCart, TrendingUp,
  Star, MessageSquare, Plus, Clock, Phone, Mail,
  MapPin, Package, DollarSign, User, CreditCard
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
  aguardando_estoque: 'bg-rainbow-orange/10 text-rainbow-orange',
  separacao: 'bg-sky-blue/10 text-sky-blue',
  separado: 'bg-rainbow-green/10 text-rainbow-green',
  expedido: 'bg-rainbow-purple/10 text-rainbow-purple',
  cancelado: 'bg-rainbow-red/10 text-rainbow-red',
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
    : dias <= 30  ? { label: 'Cliente ativo', color: 'text-rainbow-green', bg: 'bg-rainbow-green/10' }
    : dias <= 90  ? { label: `${dias}d sem comprar`, color: 'text-rainbow-orange', bg: 'bg-rainbow-orange/10' }
    : { label: `${dias}d sem comprar — em risco`, color: 'text-rainbow-red', bg: 'bg-rainbow-red/10' };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="h-full w-full max-w-2xl bg-background shadow-2xl overflow-y-auto" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="sticky top-0 z-10" style={{ background: '#2D2420' }}>
          <div className="px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center font-bold text-primary-foreground text-lg flex-shrink-0">
                {cliente.nome.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="font-bold text-base text-white leading-tight">{cliente.nome}</h2>
                <div className={`inline-flex items-center gap-1.5 mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${statusRisco.bg} ${statusRisco.color}`}>
                  <Clock size={10} /> {statusRisco.label}
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
              <X size={18} className="text-white/70" />
            </button>
          </div>

          {/* Info rápida */}
          <div className="px-6 pb-4 flex flex-wrap gap-3">
            {cliente.telefone && (
              <a href={`tel:${cliente.telefone}`} className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors">
                <Phone size={11} /> {cliente.telefone}
              </a>
            )}
            {cliente.email && (
              <a href={`mailto:${cliente.email}`} className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors">
                <Mail size={11} /> {cliente.email}
              </a>
            )}
            {(cliente.cidade || cliente.estado) && (
              <span className="flex items-center gap-1.5 text-xs text-white/60">
                <MapPin size={11} /> {[cliente.cidade, cliente.estado].filter(Boolean).join(', ')}
              </span>
            )}
            {cliente.cnpj_cpf && (
              <span className="flex items-center gap-1.5 text-xs text-white/60">
                <User size={11} /> {cliente.cnpj_cpf}
              </span>
            )}
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: ShoppingCart, color: 'text-sky-blue', bg: 'bg-sky-blue/10', label: 'Pedidos', value: pedidos.length },
              { icon: DollarSign, color: 'text-rainbow-green', bg: 'bg-rainbow-green/10', label: 'Total', value: fmtR(totalInvestido) },
              { icon: TrendingUp, color: 'text-rainbow-purple', bg: 'bg-rainbow-purple/10', label: 'Ticket Médio', value: fmtR(ticketMedio) },
              { icon: Package, color: 'text-sun-yellow', bg: 'bg-sun-yellow/10', label: 'Produtos', value: Object.keys(prodMap).length },
            ].map(({ icon: Icon, color, bg, label, value }) => (
              <div key={label} className="bg-card border border-border rounded-2xl p-4">
                <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center mb-2`}>
                  <Icon size={15} className={color} />
                </div>
                <p className="text-base font-bold text-foreground leading-tight">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Abas */}
          <div className="flex gap-1 bg-muted rounded-xl p-1 w-fit">
            {[
              { key: 'pedidos', label: 'Pedidos' },
              { key: 'produtos', label: 'Preferências' },
              { key: 'crm', label: 'CRM' },
            ].map(a => (
              <button key={a.key} onClick={() => setAbaAtiva(a.key)}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${abaAtiva === a.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                {a.label}
              </button>
            ))}
          </div>

          {/* Aba: Pedidos */}
          {abaAtiva === 'pedidos' && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/40">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Histórico de Pedidos</p>
              </div>
              {loadingPedidos ? (
                <div className="p-4 animate-pulse space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-muted rounded-xl" />)}</div>
              ) : pedidos.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground text-sm">Nenhum pedido encontrado.</div>
              ) : (
                <div className="divide-y divide-border max-h-80 overflow-y-auto">
                  {pedidos.map(p => (
                    <div key={p.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono font-bold text-foreground">{p.numero}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${STATUS_COLOR[p.status] || 'bg-muted text-muted-foreground'}`}>
                            {STATUS_LABEL[p.status] || p.status}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{fmtDate(p.data_pedido)} · {(p.itens || []).length} item(s)</p>
                      </div>
                      <p className="text-sm font-bold text-foreground flex-shrink-0">{fmtR(p.valor_total)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Aba: Produtos preferidos */}
          {abaAtiva === 'produtos' && (
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Star size={15} className="text-sun-yellow" />
                <h3 className="font-semibold text-sm text-foreground">Produtos Mais Comprados</h3>
              </div>
              {topProdutos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum pedido registrado.</p>
              ) : (
                <div className="space-y-3">
                  {topProdutos.map((p, i) => {
                    const maxQtd = topProdutos[0].qtd;
                    const pct = Math.round((p.qtd / maxQtd) * 100);
                    return (
                      <div key={i}>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="font-semibold text-foreground truncate flex-1 flex items-center gap-1.5">
                            {i === 0 && <span>⭐</span>} {p.nome}
                          </span>
                          <span className="text-muted-foreground ml-2 flex-shrink-0">{p.qtd} un · {fmtR(p.valor)}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
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
              <div className="bg-card border border-border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <MessageSquare size={15} className="text-muted-foreground" />
                    <h3 className="font-semibold text-sm text-foreground">Observações de Relacionamento</h3>
                  </div>
                  {!editingObs && (
                    <button onClick={() => setEditingObs(true)} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
                      <Edit2 size={13} className="text-muted-foreground" />
                    </button>
                  )}
                </div>
                {editingObs ? (
                  <div className="space-y-3">
                    <textarea rows={4} value={obs} onChange={e => setObs(e.target.value)}
                      placeholder="Preferências, forma de contato, acordos comerciais..."
                      className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
                    <div className="flex gap-2">
                      <button onClick={salvarObs} disabled={savingObs}
                        className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-xs font-semibold hover:opacity-90 disabled:opacity-50">
                        <Check size={13} /> {savingObs ? 'Salvando...' : 'Salvar'}
                      </button>
                      <button onClick={() => { setEditingObs(false); setObs(cliente.observacoes_relacionamento || ''); }}
                        className="flex items-center gap-1.5 border border-border px-4 py-2 rounded-xl text-xs text-muted-foreground hover:bg-muted">
                        <X size={13} /> Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-foreground whitespace-pre-wrap min-h-[40px]">
                    {obs || <span className="text-muted-foreground italic">Nenhuma observação. Clique no lápis para adicionar.</span>}
                  </p>
                )}
              </div>

              {/* Formas de Pagamento */}
              <div className="bg-card border border-border rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <CreditCard size={15} className="text-rainbow-green" />
                  <h3 className="font-semibold text-sm text-foreground">Formas de Pagamento</h3>
                </div>
                <div className="flex gap-2 mb-3 flex-wrap">
                  <select value={novoPagamento.forma} onChange={e => setNovoPagamento(p => ({ ...p, forma: e.target.value }))}
                    className="border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                    <option value="">Selecionar forma...</option>
                    {['Dinheiro','PIX','Boleto','Cartão de Crédito','Cartão de Débito','Transferência','Cheque','A prazo'].map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                  <input value={novoPagamento.obs} onChange={e => setNovoPagamento(p => ({ ...p, obs: e.target.value }))}
                    placeholder="Observação (ex: 30/60 dias, 3x sem juros...)"
                    className="flex-1 min-w-40 border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                  <button onClick={adicionarPagamento} disabled={!novoPagamento.forma}
                    className="flex items-center gap-1.5 bg-rainbow-green text-white px-3 py-2 rounded-xl text-xs font-semibold hover:opacity-90 disabled:opacity-40 flex-shrink-0">
                    <Plus size={13} /> Registrar
                  </button>
                </div>
                {!(cliente.formas_pagamento?.length) ? (
                  <p className="text-xs text-muted-foreground">Nenhuma forma de pagamento registrada.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {(cliente.formas_pagamento || []).map((pg, i) => (
                      <div key={i} className="flex items-center gap-3 bg-rainbow-green/5 border border-rainbow-green/20 rounded-xl px-4 py-2.5">
                        <CreditCard size={13} className="text-rainbow-green flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-semibold text-foreground">{pg.forma}</span>
                          {pg.obs && <span className="text-xs text-muted-foreground ml-2">{pg.obs}</span>}
                        </div>
                        <span className="text-[10px] text-muted-foreground flex-shrink-0">{fmtDate(pg.data)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Interações */}
              <div className="bg-card border border-border rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Clock size={15} className="text-muted-foreground" />
                  <h3 className="font-semibold text-sm text-foreground">Histórico de Interações</h3>
                </div>
                <div className="flex gap-2 mb-4">
                  <input value={novaInteracao} onChange={e => setNovaInteracao(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && adicionarInteracao()}
                    placeholder="Ex: Ligação realizada, proposta enviada, visita agendada..."
                    className="flex-1 border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                  <button onClick={adicionarInteracao}
                    className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-2 rounded-xl text-xs font-semibold hover:opacity-90 flex-shrink-0">
                    <Plus size={13} /> Registrar
                  </button>
                </div>
                {interacoes.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhuma interação registrada.</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {interacoes.map((inter, i) => (
                      <div key={i} className="flex gap-3 bg-muted/40 rounded-xl px-4 py-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground">{inter.descricao}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{fmtDate(inter.data)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}