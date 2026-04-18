import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, X, CheckCircle, AlertTriangle, Search, ShoppingCart, Clock, Package, Truck, Ban, FileText, Eye } from 'lucide-react';
import SeletorProdutos from '@/components/pedidos/SeletorProdutos';
import { gerarNumero, gerarLote } from '@/lib/numeracao';
import { registrarLog } from '@/lib/audit';
import { usePermissoes } from '@/lib/usePermissoes.jsx';

const STATUS_LABELS = {
  rascunho:          { label: 'Rascunho',       color: 'bg-slate-100 text-slate-600',     border: 'border-l-slate-300',   icon: FileText },
  aguardando_estoque:{ label: 'Ag. Estoque',    color: 'bg-amber-100 text-amber-700',     border: 'border-l-amber-400',   icon: Clock },
  separacao:         { label: 'Em Separação',   color: 'bg-blue-100 text-blue-700',       border: 'border-l-blue-400',    icon: Package },
  separado:          { label: 'Separado',       color: 'bg-green-100 text-green-700',     border: 'border-l-green-400',   icon: CheckCircle },
  expedido:          { label: 'Expedido',       color: 'bg-amber-100 text-amber-700',     border: 'border-l-amber-500',   icon: Truck },
  entregue:          { label: 'Entregue',       color: 'bg-emerald-100 text-emerald-700', border: 'border-l-emerald-500', icon: CheckCircle },
  cancelado:         { label: 'Cancelado',      color: 'bg-red-100 text-red-600',         border: 'border-l-red-400',     icon: Ban },
};

export default function Pedidos() {
  const { somenteLeitura } = usePermissoes();
  const readonly = somenteLeitura('Pedidos');
  const [pedidos, setPedidos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [expedicoes, setExpedicoes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ cliente_id: '', cliente_nome: '', data_pedido: new Date().toISOString().split('T')[0], data_entrega_prevista: '', observacoes: '', itens: [] });
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');
  const [pedidoConfirmado, setPedidoConfirmado] = useState(null);

  const load = async () => {
    const [p, c, pr, exp] = await Promise.all([
      base44.entities.Pedido.list('-created_date'),
      base44.entities.Cliente.list(),
      base44.entities.Produto.list(),
      base44.entities.Expedicao.list(),
    ]);
    setPedidos(p); setClientes(c); setProdutos(pr); setExpedicoes(exp);
  };

  useEffect(() => { load(); }, []);

  const confirmarPedido = async () => {
    if (!form.cliente_nome || form.itens.length === 0) return alert('Preencha cliente e ao menos um item.');
    setLoading(true);

    const mapaItens = {};
    for (const item of form.itens) {
      if (!item.produto_id || item.quantidade <= 0) continue;
      if (mapaItens[item.produto_id]) {
        mapaItens[item.produto_id].quantidade += item.quantidade;
        mapaItens[item.produto_id].total = (mapaItens[item.produto_id].total || 0) + (item.total || 0);
      } else {
        mapaItens[item.produto_id] = { ...item };
      }
    }
    const itensAgrupados = Object.values(mapaItens);

    const itensComEstoque = [];
    const itensSemEstoque = [];
    for (const item of itensAgrupados) {
      const p = produtos.find(pr => pr.id === item.produto_id);
      if (!p) continue;
      if ((p.estoque_atual || 0) >= item.quantidade) {
        itensComEstoque.push({ ...item, produto: p });
      } else {
        itensSemEstoque.push({ ...item, produto: p, quantidadeFalta: item.quantidade - (p.estoque_atual || 0) });
      }
    }

    const numero = gerarNumero('PED');
    const valorTotal = form.itens.reduce((s, i) => s + (i.total || 0), 0);
    // Pedido sempre começa em aguardando_estoque — só avança para separacao quando todas as OPs forem finalizadas
    const pedido = await base44.entities.Pedido.create({ ...form, numero, status: 'aguardando_estoque', valor_total: valorTotal, ordens_producao_ids: [] });
    const idsOrdens = [];

    // Itens com estoque: criar OP já em "a_produzir" no kanban, dar baixa no estoque agora
    if (itensComEstoque.length > 0) {
      const op = await base44.entities.OrdemProducao.create({
        numero: gerarNumero('OP'),
        produto_nome: `Pedido ${numero}`,
        quantidade: itensComEstoque.reduce((s, i) => s + i.quantidade, 0),
        itens: itensComEstoque.map(i => ({ produto_id: i.produto_id, produto_nome: i.produto_nome, quantidade: i.quantidade })),
        status: 'a_produzir', pedido_id: pedido.id, pedido_numero: numero,
        origem: 'pedido',
      });
      idsOrdens.push(op.id);
      for (const item of itensComEstoque) {
        const novoEstoque = (item.produto.estoque_atual || 0) - item.quantidade;
        await base44.entities.Produto.update(item.produto_id, { estoque_atual: novoEstoque });
        await registrarLog('Produto', item.produto_id, 'BAIXA_ESTOQUE', `Baixa de ${item.quantidade} para pedido ${numero}`);
      }
    }

    // Itens sem estoque: criar OP para produção
    if (itensSemEstoque.length > 0) {
      const ordem = await base44.entities.OrdemProducao.create({
        numero: gerarNumero('OP'),
        produto_nome: `Pedido ${numero}`,
        quantidade: itensSemEstoque.reduce((s, i) => s + i.quantidadeFalta, 0),
        itens: itensSemEstoque.map(i => ({ produto_id: i.produto_id, produto_nome: i.produto_nome, quantidade: i.quantidadeFalta })),
        status: 'a_produzir', pedido_id: pedido.id, pedido_numero: numero,
        origem: 'pedido',
      });
      idsOrdens.push(ordem.id);
    }

    if (idsOrdens.length > 0) {
      await base44.entities.Pedido.update(pedido.id, { ordens_producao_ids: idsOrdens });
    }
    await registrarLog('Pedido', pedido.id, 'CRIACAO', `Pedido ${numero} criado. Status: ${status}`);
    setShowForm(false);
    setForm({ cliente_id: '', cliente_nome: '', data_pedido: new Date().toISOString().split('T')[0], data_entrega_prevista: '', observacoes: '', itens: [] });
    await load();
    setLoading(false);
    setPedidoConfirmado({ numero, cliente: form.cliente_nome, status: 'aguardando_estoque', itens: itensAgrupados, valorTotal, precisaProducao: true, itensComEstoque: itensComEstoque.length, itensSemEstoque: itensSemEstoque.length });
  };

  const marcarSeparado = async (id, numero) => {
    await base44.entities.Pedido.update(id, { status: 'separado' });
    await registrarLog('Pedido', id, 'STATUS', `Pedido ${numero} marcado como separado.`);
    await load();
  };

  const cancelarPedido = async (id, numero) => {
    if (!confirm(`Cancelar pedido ${numero}?`)) return;
    await base44.entities.Pedido.update(id, { status: 'cancelado' });
    await registrarLog('Pedido', id, 'CANCELAMENTO', `Pedido ${numero} cancelado.`);
    await load();
  };

  const statusEfetivo = (pedido) => {
    if (pedido.status === 'expedido') {
      const exp = expedicoes.find(e => e.pedido_id === pedido.id);
      if (exp?.confirmado_pelo_cliente || exp?.status === 'entregue') return 'entregue';
    }
    return pedido.status;
  };

  const pedidosFiltrados = pedidos.filter(p => {
    if (!busca.trim()) return true;
    const b = busca.toLowerCase();
    return (p.numero || '').toLowerCase().includes(b) ||
      (p.cliente_nome || '').toLowerCase().includes(b) ||
      (p.itens || []).some(i => (i.produto_nome || '').toLowerCase().includes(b));
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-100 flex items-center justify-center">
            <ShoppingCart size={19} className="text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Pedidos</h2>
            <p className="text-xs text-muted-foreground">{pedidos.filter(p => !['expedido','cancelado'].includes(p.status)).length} pedido(s) ativo(s)</p>
          </div>
        </div>
        {!readonly ? (
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-amber-500 transition-colors shadow-sm">
            <Plus size={16} /> Novo Pedido
          </button>
        ) : (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-3 py-2 rounded-xl">
            <Eye size={13} /> Somente visualização
          </span>
        )}
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={busca} onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por número, cliente ou produto..."
          className="w-full border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
      </div>

      {showForm && (
        <div className="bg-white border border-border rounded-xl p-6 space-y-5 shadow-sm">
          <h3 className="font-semibold text-foreground text-base">Novo Pedido</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Cliente *</label>
              <select value={form.cliente_id} onChange={e => {
                const c = clientes.find(c => c.id === e.target.value);
                setForm(f => ({ ...f, cliente_id: e.target.value, cliente_nome: c ? c.nome : '' }));
              }} className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60">
                <option value="">Selecione...</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Data do Pedido *</label>
              <input type="date" value={form.data_pedido} onChange={e => setForm(f => ({ ...f, data_pedido: e.target.value }))}
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Entrega Prevista</label>
              <input type="date" value={form.data_entrega_prevista} onChange={e => setForm(f => ({ ...f, data_entrega_prevista: e.target.value }))}
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60" />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-foreground">Itens do Pedido</label>
            </div>
            <SeletorProdutos produtos={produtos} itens={form.itens} onChange={itens => setForm(f => ({ ...f, itens }))} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Observações</label>
            <textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} rows={3}
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 resize-none" />
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-border">
            <p className="text-sm font-semibold text-foreground">
              Total: R$ {form.itens.reduce((s, i) => s + (i.total || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <div className="flex gap-3">
              <button onClick={confirmarPedido} disabled={loading}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-amber-500 active:bg-amber-600 transition-colors disabled:opacity-50 shadow-sm">
                <CheckCircle size={15} /> {loading ? 'Processando...' : 'Confirmar Pedido'}
              </button>
              <button onClick={() => setShowForm(false)} className="border border-border px-5 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2.5">
        {pedidosFiltrados.map(p => {
          const st = STATUS_LABELS[statusEfetivo(p)] || STATUS_LABELS.rascunho;
          const StIcon = st.icon;
          return (
            <div key={p.id} className={`bg-white border border-border border-l-4 ${st.border} rounded-xl overflow-hidden hover:shadow-md transition-all`}>
              <div className="p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button
                      onClick={() => setPedidoConfirmado({ numero: p.numero, cliente: p.cliente_nome, status: p.status, itens: p.itens || [], valorTotal: p.valor_total || 0, fromList: true })}
                      className="font-bold text-foreground hover:text-primary transition-colors text-base">
                      {p.numero || 'Rascunho'}
                    </button>
                    <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold ${st.color}`}>
                      <StIcon size={10} /> {st.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!readonly && p.status === 'separacao' && (
                      <button onClick={() => marcarSeparado(p.id, p.numero)}
                        className="text-xs bg-green-600 text-white hover:bg-green-700 transition-colors px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1">
                        <CheckCircle size={12} /> Separado
                      </button>
                    )}
                    {!readonly && !['expedido', 'cancelado', 'separado', 'separacao'].includes(p.status) && (
                      <button onClick={() => cancelarPedido(p.id, p.numero)} className="text-xs text-muted-foreground hover:text-destructive transition-colors px-2 py-1.5 rounded-lg hover:bg-destructive/10">
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {(p.cliente_nome || 'C').charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-foreground">{p.cliente_nome}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground ml-auto flex-wrap">
                    <span className="flex items-center gap-1"><Clock size={11}/> {p.data_pedido}</span>
                    <span className="flex items-center gap-1"><Package size={11}/> {(p.itens || []).length} item(s)</span>
                    <span className="font-bold text-foreground text-sm">R$ {(p.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
                {p.status === 'aguardando_estoque' && (
                  <div className="mt-3 text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-xl p-2.5 flex items-center gap-2">
                    <AlertTriangle size={12} /> Aguardando finalização da produção no Kanban
                  </div>
                )}
                {p.status === 'separacao' && (
                  <div className="mt-3 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-xl p-2.5 flex items-center gap-2">
                    <Package size={12} /> Produção finalizada — pronto para separação. Clique em "Separado" quando concluir.
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {pedidosFiltrados.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-5xl mb-3">📋</p>
            <p className="text-sm">
              {busca ? 'Nenhum pedido encontrado.' : <>Nenhum pedido ainda. Clique em <span className="text-primary font-medium">"Novo Pedido"</span> para começar.</>}
            </p>
          </div>
        )}
      </div>

      {pedidoConfirmado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setPedidoConfirmado(null)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle size={20} className="text-green-600" />
                </div>
                <div>
                  <p className="font-bold text-foreground text-lg">{pedidoConfirmado.fromList ? 'Resumo do Pedido' : 'Pedido Confirmado!'}</p>
                  <p className="text-xs text-muted-foreground">{pedidoConfirmado.numero}</p>
                </div>
              </div>
              <div className="bg-muted rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cliente</span>
                  <span className="font-medium text-foreground">{pedidoConfirmado.cliente}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-bold text-foreground">R$ {(pedidoConfirmado.valorTotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_LABELS[pedidoConfirmado.status]?.color}`}>
                    {STATUS_LABELS[pedidoConfirmado.status]?.label}
                  </span>
                </div>
              </div>
              <button onClick={() => setPedidoConfirmado(null)}
                className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}