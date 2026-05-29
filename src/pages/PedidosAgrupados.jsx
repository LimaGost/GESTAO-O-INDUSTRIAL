import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link2, Plus, Users, Package, Trash2, RefreshCw, ChevronDown, ChevronUp, Unlink } from 'lucide-react';
import ModalCriarGrupo from '@/components/pedidos/ModalCriarGrupo';

const STATUS_LABELS = {
  rascunho: 'Rascunho', aguardando_estoque: 'Ag. Estoque',
  separacao: 'Separação', separado: 'Separado',
  expedido: 'Expedido', entregue: 'Entregue', cancelado: 'Cancelado',
};

const STATUS_COLORS = {
  rascunho: 'bg-gray-100 text-gray-600',
  aguardando_estoque: 'bg-yellow-100 text-yellow-700',
  separacao: 'bg-blue-100 text-blue-700',
  separado: 'bg-indigo-100 text-indigo-700',
  expedido: 'bg-purple-100 text-purple-700',
  entregue: 'bg-green-100 text-green-700',
  cancelado: 'bg-red-100 text-red-700',
};

function GrupoCard({ grupo, pedidosMap, onDesfazer, user }) {
  const [expandido, setExpandido] = useState(false);
  const [desfazendo, setDesfazendo] = useState(false);
  const pedidos = (grupo.pedidos_ids || []).map(id => pedidosMap[id]).filter(Boolean);

  const itensConsolidados = (() => {
    const mapa = {};
    pedidos.forEach(ped => {
      (ped.itens || []).forEach(item => {
        const key = item.produto_id || item.produto_nome;
        if (!mapa[key]) mapa[key] = { ...item, quantidade: 0 };
        mapa[key].quantidade += (item.quantidade || 0);
      });
    });
    return Object.values(mapa);
  })();

  const handleDesfazer = async () => {
    if (!window.confirm(`Desfazer o agrupamento "${grupo.nome}"? Os pedidos originais não serão afetados.`)) return;
    setDesfazendo(true);
    await base44.entities.GrupoPedido.update(grupo.id, { status: 'desfeito' });
    await base44.entities.LogAuditoria.create({
      entidade: 'GrupoPedido',
      entidade_id: grupo.id,
      acao: 'desfazer',
      descricao: `Agrupamento desfeito: ${grupo.nome}`,
      usuario: user?.full_name || user?.email || 'Sistema',
    });
    setDesfazendo(false);
    onDesfazer(grupo.id);
  };

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-md transition-all">
      {/* Header do grupo */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Link2 size={16} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-bold text-foreground text-sm">{grupo.cliente_nome}</p>
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">
                  {grupo.pedidos_ids?.length || 0} pedidos
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pedidos: #{(grupo.pedidos_numeros || []).join(', #')}
              </p>
              <p className="text-xs text-muted-foreground">
                Criado por {grupo.criado_por} · {new Date(grupo.created_date).toLocaleDateString('pt-BR')}
              </p>
              {grupo.observacoes && (
                <p className="text-xs text-muted-foreground italic mt-1">"{grupo.observacoes}"</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <p className="font-bold text-primary text-sm">
              {(grupo.total_consolidado || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
        </div>

        {/* Status dos pedidos */}
        <div className="flex gap-1.5 flex-wrap mt-3">
          {pedidos.map(p => (
            <span key={p.id} className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[p.status] || 'bg-gray-100 text-gray-600'}`}>
              #{p.numero || p.id.slice(-4)} · {STATUS_LABELS[p.status] || p.status}
            </span>
          ))}
        </div>

        {/* Ações */}
        <div className="flex items-center gap-2 mt-3">
          <button onClick={() => setExpandido(v => !v)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            {expandido ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {expandido ? 'Ocultar detalhes' : 'Ver itens consolidados'}
          </button>
          <div className="flex-1" />
          <button onClick={handleDesfazer} disabled={desfazendo}
            className="flex items-center gap-1.5 text-xs text-red-600 hover:bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
            <Unlink size={12} /> {desfazendo ? 'Desfazendo...' : 'Desfazer vínculo'}
          </button>
        </div>
      </div>

      {/* Detalhes expandidos */}
      {expandido && (
        <div className="border-t border-border bg-muted/20 p-4 space-y-4">
          {/* Itens consolidados */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Itens Consolidados</p>
            <div className="bg-white border border-border rounded-xl overflow-hidden">
              {itensConsolidados.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-4">Sem itens cadastrados nos pedidos.</p>
              ) : (
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="text-left px-3 py-2 text-muted-foreground font-semibold">Produto</th>
                      <th className="text-right px-3 py-2 text-muted-foreground font-semibold">Qtd Total</th>
                      <th className="text-right px-3 py-2 text-muted-foreground font-semibold">Unit.</th>
                      <th className="text-right px-3 py-2 text-muted-foreground font-semibold">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {itensConsolidados.map((item, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 text-foreground font-medium">{item.produto_nome}</td>
                        <td className="px-3 py-2 text-right font-bold text-foreground">{item.quantidade}</td>
                        <td className="px-3 py-2 text-right text-muted-foreground">
                          {(item.preco_unitario || item.preco || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="px-3 py-2 text-right text-foreground">
                          {((item.preco_unitario || item.preco || 0) * item.quantidade).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted/30 border-t border-border">
                    <tr>
                      <td colSpan={3} className="px-3 py-2 text-right font-bold text-foreground text-xs">Total Consolidado</td>
                      <td className="px-3 py-2 text-right font-bold text-primary">
                        {(grupo.total_consolidado || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </div>

          {/* Pedidos individuais */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Pedidos Individuais</p>
            <div className="space-y-2">
              {pedidos.map(ped => (
                <div key={ped.id} className="bg-white border border-border rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-foreground">Pedido #{ped.numero || ped.id.slice(-6)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[ped.status]}`}>
                      {STATUS_LABELS[ped.status] || ped.status}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {(ped.itens || []).map((item, i) => (
                      <div key={i} className="flex justify-between text-xs text-muted-foreground">
                        <span>{item.produto_nome}</span>
                        <span>{item.quantidade} × {(item.preco_unitario || item.preco || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-border/50 pt-1.5 mt-1.5 flex justify-between text-xs font-bold">
                    <span className="text-muted-foreground">Total</span>
                    <span className="text-foreground">{(ped.valor_total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PedidosAgrupados() {
  const [grupos, setGrupos] = useState([]);
  const [pedidosMap, setPedidosMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filtro, setFiltro] = useState('ativos');
  const [user, setUser] = useState(null);

  const load = async () => {
    setLoading(true);
    const [gs, ps, u] = await Promise.all([
      base44.entities.GrupoPedido.list('-created_date'),
      base44.entities.Pedido.list('-created_date', 300),
      base44.auth.me(),
    ]);
    setGrupos(gs);
    const mapa = {};
    ps.forEach(p => { mapa[p.id] = p; });
    setPedidosMap(mapa);
    setUser(u);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const gruposFiltrados = grupos.filter(g =>
    filtro === 'todos' ? true : g.status === filtro
  );

  const handleDesfazer = (id) => {
    setGrupos(prev => prev.map(g => g.id === id ? { ...g, status: 'desfeito' } : g));
  };

  const handleCriado = (novoGrupo) => {
    setShowModal(false);
    load();
  };

  const ativos = grupos.filter(g => g.status === 'ativo').length;
  const desfeitos = grupos.filter(g => g.status === 'desfeito').length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Link2 size={19} className="text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Pedidos Agrupados</h2>
            <p className="text-xs text-muted-foreground">{ativos} grupo(s) ativo(s) · {desfeitos} desfeito(s)</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 border border-border rounded-xl hover:bg-muted transition-colors">
            <RefreshCw size={15} className="text-muted-foreground" />
          </button>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
            <Plus size={14} /> Novo Agrupamento
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {[
          { k: 'ativos', l: 'Ativos', count: ativos },
          { k: 'desfeito', l: 'Desfeitos', count: desfeitos },
          { k: 'todos', l: 'Todos', count: grupos.length },
        ].map(f => (
          <button key={f.k} onClick={() => setFiltro(f.k)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${filtro === f.k ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground hover:bg-muted'}`}>
            {f.l} <span className="ml-1 opacity-70">{f.count}</span>
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">
          {[1,2].map(i => <div key={i} className="h-32 animate-pulse bg-muted rounded-2xl" />)}
        </div>
      ) : gruposFiltrados.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Link2 size={40} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium">Nenhum agrupamento encontrado.</p>
          <p className="text-xs mt-1 opacity-70">Crie um agrupamento para vincular pedidos do mesmo cliente.</p>
          <button onClick={() => setShowModal(true)}
            className="mt-4 flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity mx-auto">
            <Plus size={14} /> Criar primeiro agrupamento
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {gruposFiltrados.map(grupo => (
            <GrupoCard key={grupo.id} grupo={grupo} pedidosMap={pedidosMap}
              onDesfazer={handleDesfazer} user={user} />
          ))}
        </div>
      )}

      {showModal && (
        <ModalCriarGrupo onClose={() => setShowModal(false)} onCriado={handleCriado} />
      )}
    </div>
  );
}