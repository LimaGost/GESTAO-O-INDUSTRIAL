import { useEffect, useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import {
  X, Edit2, Check, ShoppingCart, TrendingUp, Plus,
  Phone, Mail, MapPin, Package, DollarSign, AlertTriangle,
  CheckCircle, Clock, Building2
} from 'lucide-react';

const fmtR    = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
const fmtRk   = (v) => v >= 1000 ? `R$ ${(v / 1000).toFixed(1)}k` : `R$ ${(v || 0).toFixed(0)}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';

const STATUS_LABEL = {
  rascunho: 'Rascunho', aguardando_estoque: 'Ag. Estoque',
  separacao: 'Separação', separado: 'Separado',
  expedido: 'Expedido', entregue: 'Entregue', cancelado: 'Cancelado',
};
const STATUS_COLOR = {
  rascunho: 'bg-muted text-muted-foreground',
  aguardando_estoque: 'bg-amber-100 text-amber-700',
  separacao: 'bg-blue-100 text-blue-700',
  separado: 'bg-green-100 text-green-700',
  expedido: 'bg-purple-100 text-purple-700',
  entregue: 'bg-green-100 text-green-700',
  cancelado: 'bg-red-100 text-red-600',
};

function diasSemComprar(pedidos) {
  const ativos = pedidos.filter(p => p.status !== 'cancelado');
  if (ativos.length === 0) return null;
  const datas = ativos.map(p => new Date(p.data_pedido || p.created_date)).filter(d => !isNaN(d));
  if (datas.length === 0) return null;
  return Math.floor((Date.now() - Math.max(...datas)) / 86400000);
}

function getRiscoConfig(dias) {
  if (dias === null) return { label: 'Sem pedido', color: 'text-slate-500', bg: 'bg-muted', icon: Clock };
  if (dias <= 30)    return { label: 'Cliente ativo', color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle };
  if (dias <= 90)    return { label: `${dias}d sem comprar`, color: 'text-amber-600', bg: 'bg-amber-100', icon: AlertTriangle };
  return { label: `Em risco — ${dias}d sem comprar`, color: 'text-red-600', bg: 'bg-red-100', icon: AlertTriangle };
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
  const riscoConfig = getRiscoConfig(dias);
  const RiscoIcon = riscoConfig.icon;

  const topProdutos = useMemo(() => {
    const prodMap = {};
    for (const ped of pedidosAtivos) {
      for (const item of ped.itens || []) {
        if (!prodMap[item.produto_nome]) prodMap[item.produto_nome] = { nome: item.produto_nome, qtd: 0, valor: 0 };
        prodMap[item.produto_nome].qtd += item.quantidade || 0;
        prodMap[item.produto_nome].valor += item.total || 0;
      }
    }
    return Object.values(prodMap).sort((a, b) => b.qtd - a.qtd).slice(0, 5);
  }, [pedidosAtivos]);

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

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-0 md:p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-t-2xl md:rounded-2xl w-full max-w-2xl shadow-2xl max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

        {/* Header reformulado */}
        <div className="sticky top-0 bg-card border-b border-border z-10">
          {/* Linha 1: avatar + nome + fechar */}
          <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center font-bold text-primary text-xl flex-shrink-0">
                {cliente.nome.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="font-bold text-foreground text-base leading-tight">{cliente.nome}</h2>
                <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium mt-0.5 ${riscoConfig.bg} ${riscoConfig.color}`}>
                  <RiscoIcon size={10} />{riscoConfig.label}
                </span>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg flex-shrink-0">
              <X size={16} className="text-muted-foreground" />
            </button>
          </div>

          {/* Linha 2: contato rápido */}
          <div className="px-5 pb-3 flex flex-wrap gap-x-4 gap-y-1.5">
            {cliente.telefone && (
              <a href={`tel:${cliente.telefone}`} className="flex items-center gap-1.5 text-xs text-sky-blue hover:underline font-medium">
                <Phone size={11} />{cliente.telefone}
              </a>
            )}
            {cliente.email && (
              <a href={`mailto:${cliente.email}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <Mail size={11} />{cliente.email}
              </a>
            )}
            {(cliente.cidade || cliente.estado) && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin size={11} />{[cliente.cidade, cliente.estado].filter(Boolean).join(' — ')}
              </span>
            )}
            {cliente.cnpj_cpf && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Building2 size={11} />{cliente.cnpj_cpf}
              </span>
            )}
          </div>

          {/* Linha 3: KPIs inline */}
          <div className="px-5 pb-4 grid grid-cols-4 gap-2">
            {[
              { icon: ShoppingCart, label: 'Pedidos',      value: pedidos.length,        color: 'text-sky-blue',         bg: 'bg-sky-blue/10' },
              { icon: DollarSign,   label: 'Total',        value: fmtRk(totalInvestido), color: 'text-rainbow-green',    bg: 'bg-rainbow-green/10' },
              { icon: TrendingUp,   label: 'Ticket Médio', value: fmtRk(ticketMedio),    color: 'text-rainbow-purple',   bg: 'bg-rainbow-purple/10' },
              { icon: Package,      label: 'Produtos',     value: topProdutos.length,     color: 'text-sun-yellow',       bg: 'bg-sun-yellow/10' },
            ].map(({ icon: Icon, label, value, color, bg }) => (
              <div key={label} className={`rounded-xl p-2.5 text-center ${bg}`}>
                <Icon size={13} className={`${color} mx-auto mb-1`} />
                <p className="text-sm font-bold text-foreground">{value}</p>
                <p className="text-[10px] text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>

          {/* Abas */}
          <div className="flex gap-1 mx-5 mb-3 bg-muted p-1 rounded-xl">
            {[['pedidos','Pedidos'],['produtos','Preferências'],['crm','CRM']].map(([key, label]) => (
              <button key={key} onClick={() => setAbaAtiva(key)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${abaAtiva === key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Conteúdo das abas */}
        <div className="p-5 space-y-4">

          {/* Aba Pedidos */}
          {abaAtiva === 'pedidos' && (
            <div className="space-y-2">
              {loadingPedidos ? (
                <div className="space-y-2">
                  {[1,2,3].map(i => <div key={i} className="animate-pulse h-16 bg-muted rounded-xl" />)}
                </div>
              ) : pedidos.length === 0 ? (
                <div className="text-center py-10">
                  <ShoppingCart size={32} className="text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhum pedido encontrado.</p>
                </div>
              ) : pedidos.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-foreground">{p.numero}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLOR[p.status] || 'bg-muted text-muted-foreground'}`}>
                        {STATUS_LABEL[p.status] || p.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{fmtDate(p.data_pedido)} · {(p.itens || []).length} item(s)</p>
                  </div>
                  <p className="font-bold text-foreground text-sm">{fmtR(p.valor_total)}</p>
                </div>
              ))}
            </div>
          )}

          {/* Aba Preferências */}
          {abaAtiva === 'produtos' && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Produtos Mais Comprados</h3>
              {topProdutos.length === 0 ? (
                <div className="text-center py-10">
                  <Package size={32} className="text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhum pedido para calcular preferências.</p>
                </div>
              ) : topProdutos.map((p, i) => {
                const pct = Math.round((p.qtd / topProdutos[0].qtd) * 100);
                return (
                  <div key={p.nome}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-foreground font-medium">{i === 0 && '⭐ '}{p.nome}</span>
                      <span className="text-muted-foreground text-xs">{p.qtd} un · {fmtRk(p.valor)}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Aba CRM */}
          {abaAtiva === 'crm' && (
            <div className="space-y-5">
              {/* Observações */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-foreground">Observações</h3>
                  {!editingObs && (
                    <button onClick={() => setEditingObs(true)} className="p-1 hover:bg-muted rounded-lg">
                      <Edit2 size={13} className="text-muted-foreground" />
                    </button>
                  )}
                </div>
                {editingObs ? (
                  <div className="space-y-2">
                    <textarea value={obs} onChange={e => setObs(e.target.value)} rows={3}
                      className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
                    <div className="flex gap-2">
                      <button onClick={salvarObs} disabled={savingObs}
                        className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-1.5 rounded-lg text-xs font-medium hover:opacity-90 disabled:opacity-50">
                        <Check size={12} />{savingObs ? 'Salvando...' : 'Salvar'}
                      </button>
                      <button onClick={() => setEditingObs(false)}
                        className="border border-border px-4 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-muted">
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground bg-muted/30 rounded-xl p-3 min-h-[60px]">
                    {obs || 'Nenhuma observação. Clique no lápis para adicionar.'}
                  </p>
                )}
              </div>

              {/* Interações */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Interações</h3>
                <div className="flex gap-2 mb-3">
                  <input value={novaInteracao} onChange={e => setNovaInteracao(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && adicionarInteracao()}
                    placeholder="Registrar contato, visita, ligação..."
                    className="flex-1 border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                  <button onClick={adicionarInteracao}
                    className="bg-primary text-primary-foreground px-3 py-2 rounded-xl text-sm font-medium hover:opacity-90">
                    <Plus size={15} />
                  </button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {(cliente.interacoes || []).map((int, i) => (
                    <div key={i} className="text-xs bg-muted/30 rounded-xl p-2.5">
                      <div className="flex justify-between text-muted-foreground mb-0.5">
                        <span className="font-medium">{int.usuario}</span>
                        <span>{fmtDate(int.data)}</span>
                      </div>
                      <p className="text-foreground">{int.descricao}</p>
                    </div>
                  ))}
                  {(!cliente.interacoes || cliente.interacoes.length === 0) && (
                    <p className="text-xs text-muted-foreground text-center py-4">Nenhuma interação registrada.</p>
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