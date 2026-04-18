import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Edit2, Check, ShoppingCart, TrendingUp, Star, Plus, Phone, Mail, MapPin, Package, DollarSign, User } from 'lucide-react';

const fmtR = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';

const STATUS_LABEL = {
  rascunho: 'Rascunho', aguardando_estoque: 'Ag. Estoque',
  separacao: 'Separação', separado: 'Separado', expedido: 'Expedido', cancelado: 'Cancelado',
};
const STATUS_COLOR = {
  rascunho: 'bg-muted text-muted-foreground', aguardando_estoque: 'bg-amber-100 text-amber-700',
  separacao: 'bg-blue-100 text-blue-700', separado: 'bg-green-100 text-green-700',
  expedido: 'bg-purple-100 text-purple-700', cancelado: 'bg-red-100 text-red-600',
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
      if (!prodMap[item.produto_nome]) prodMap[item.produto_nome] = { nome: item.produto_nome, qtd: 0, valor: 0 };
      prodMap[item.produto_nome].qtd += item.quantidade || 0;
      prodMap[item.produto_nome].valor += item.total || 0;
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
    const novas = [{ data: new Date().toISOString(), descricao: novaInteracao.trim(), usuario: 'Equipe' }, ...(cliente.interacoes || [])];
    await base44.entities.Cliente.update(cliente.id, { interacoes: novas });
    setNovaInteracao('');
    onSave?.({ ...cliente, interacoes: novas });
  };

  const statusRisco = dias === null ? { label: 'Sem pedido', color: 'text-muted-foreground', bg: 'bg-muted' }
    : dias <= 30 ? { label: 'Cliente ativo', color: 'text-green-600', bg: 'bg-green-100' }
    : dias <= 90 ? { label: `${dias}d sem comprar`, color: 'text-amber-600', bg: 'bg-amber-100' }
    : { label: `${dias}d sem comprar — em risco`, color: 'text-red-600', bg: 'bg-red-100' };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-0 md:p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-t-2xl md:rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-lg">
              {cliente.nome.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="font-bold text-foreground">{cliente.nome}</h2>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusRisco.bg} ${statusRisco.color}`}>{statusRisco.label}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg"><X size={16} className="text-muted-foreground" /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Contato */}
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {cliente.telefone && <a href={`tel:${cliente.telefone}`} className="flex items-center gap-1 hover:text-foreground"><Phone size={12} />{cliente.telefone}</a>}
            {cliente.email && <a href={`mailto:${cliente.email}`} className="flex items-center gap-1 hover:text-foreground"><Mail size={12} />{cliente.email}</a>}
            {(cliente.cidade || cliente.estado) && <span className="flex items-center gap-1"><MapPin size={12} />{[cliente.cidade, cliente.estado].filter(Boolean).join(', ')}</span>}
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: ShoppingCart, label: 'Pedidos', value: pedidos.length, color: 'bg-blue-100 text-blue-600' },
              { icon: DollarSign, label: 'Total', value: fmtR(totalInvestido), color: 'bg-green-100 text-green-600' },
              { icon: TrendingUp, label: 'Ticket Médio', value: fmtR(ticketMedio), color: 'bg-purple-100 text-purple-600' },
              { icon: Package, label: 'Produtos', value: Object.keys(prodMap).length, color: 'bg-amber-100 text-amber-600' },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="bg-muted/30 rounded-xl p-3 text-center">
                <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center mx-auto mb-1.5`}>
                  <Icon size={15} />
                </div>
                <p className="text-base font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>

          {/* Abas */}
          <div className="flex gap-1 bg-muted p-1 rounded-xl">
            {[['pedidos', 'Pedidos'], ['produtos', 'Preferências'], ['crm', 'CRM']].map(([key, label]) => (
              <button key={key} onClick={() => setAbaAtiva(key)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${abaAtiva === key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                {label}
              </button>
            ))}
          </div>

          {abaAtiva === 'pedidos' && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Histórico de Pedidos</h3>
              {loadingPedidos ? <div className="animate-pulse h-20 bg-muted rounded-xl" /> : pedidos.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhum pedido encontrado.</p>
              ) : pedidos.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{p.numero}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[p.status] || 'bg-muted text-muted-foreground'}`}>{STATUS_LABEL[p.status] || p.status}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{fmtDate(p.data_pedido)} · {(p.itens || []).length} item(s)</p>
                  </div>
                  <p className="font-bold text-foreground text-sm">{fmtR(p.valor_total)}</p>
                </div>
              ))}
            </div>
          )}

          {abaAtiva === 'produtos' && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Produtos Mais Comprados</h3>
              {topProdutos.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">Nenhum pedido.</p> : topProdutos.map((p, i) => {
                const pct = Math.round((p.qtd / topProdutos[0].qtd) * 100);
                return (
                  <div key={p.nome}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-foreground">{i === 0 && '⭐ '}{p.nome}</span>
                      <span className="text-muted-foreground">{p.qtd} un · {fmtR(p.valor)}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full"><div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} /></div>
                  </div>
                );
              })}
            </div>
          )}

          {abaAtiva === 'crm' && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-foreground">Observações</h3>
                  {!editingObs && <button onClick={() => setEditingObs(true)} className="p-1 hover:bg-muted rounded-lg"><Edit2 size={13} className="text-muted-foreground" /></button>}
                </div>
                {editingObs ? (
                  <div className="space-y-2">
                    <textarea value={obs} onChange={e => setObs(e.target.value)} rows={3}
                      className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
                    <div className="flex gap-2">
                      <button onClick={salvarObs} disabled={savingObs} className="bg-primary text-primary-foreground px-4 py-1.5 rounded-lg text-xs font-medium hover:opacity-90">
                        {savingObs ? 'Salvando...' : 'Salvar'}
                      </button>
                      <button onClick={() => setEditingObs(false)} className="border border-border px-4 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-muted">Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground bg-muted/30 rounded-xl p-3">{obs || 'Nenhuma observação.'}</p>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Interações</h3>
                <div className="flex gap-2 mb-3">
                  <input value={novaInteracao} onChange={e => setNovaInteracao(e.target.value)}
                    placeholder="Registrar contato, visita, ligação..."
                    className="flex-1 border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                  <button onClick={adicionarInteracao} className="bg-primary text-primary-foreground px-3 py-2 rounded-xl text-sm font-medium hover:opacity-90">
                    <Plus size={15} />
                  </button>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {(cliente.interacoes || []).map((int, i) => (
                    <div key={i} className="text-xs bg-muted/30 rounded-xl p-2.5">
                      <div className="flex justify-between text-muted-foreground mb-0.5">
                        <span>{int.usuario}</span>
                        <span>{fmtDate(int.data)}</span>
                      </div>
                      <p className="text-foreground">{int.descricao}</p>
                    </div>
                  ))}
                  {(!cliente.interacoes || cliente.interacoes.length === 0) && (
                    <p className="text-xs text-muted-foreground text-center py-3">Nenhuma interação.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}