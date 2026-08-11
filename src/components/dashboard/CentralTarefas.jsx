import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import {
  ClipboardList, Package, Truck, AlertTriangle, Lock, CheckCircle2,
  TrendingUp, Users, Clock, ArrowRight, PartyPopper, Factory,
} from 'lucide-react';

function hojeStr() {
  return new Date().toISOString().split('T')[0];
}
function ehHoje(iso) {
  if (!iso) return false;
  return iso.split('T')[0] === hojeStr();
}

function ProgressoHoje({ concluidos, pendentes, corBase = '#0D3B45' }) {
  const total = concluidos + pendentes;
  const pct = total > 0 ? Math.round((concluidos / total) * 100) : 0;
  return (
    <div className="bg-white rounded-2xl border border-border px-5 py-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <PartyPopper size={16} style={{ color: corBase }} />
          <p className="text-sm font-bold text-foreground">Progresso de hoje</p>
        </div>
        <p className="text-xs font-semibold text-muted-foreground">{concluidos} de {total} concluídos</p>
      </div>
      <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: corBase }} />
      </div>
      {pendentes === 0 && total > 0 && (
        <p className="text-xs font-semibold text-emerald-600 mt-2">🎉 Tudo em dia por aqui!</p>
      )}
    </div>
  );
}

function TaskCard({ icon: Icon, cor, titulo, itens, vazio, linkBase, renderLabel }) {
  return (
    <div className="bg-white rounded-2xl border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between" style={{ background: `${cor}0D` }}>
        <div className="flex items-center gap-2">
          <Icon size={15} style={{ color: cor }} />
          <p className="text-sm font-bold text-foreground">{titulo}</p>
        </div>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: cor, opacity: itens.length === 0 ? 0.35 : 1 }}>
          {itens.length}
        </span>
      </div>
      <div className="max-h-64 overflow-y-auto divide-y divide-border">
        {itens.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">{vazio}</p>
        ) : (
          itens.map((item, i) => (
            <div key={i} className="px-4 py-2.5 flex items-center justify-between gap-2 text-xs hover:bg-muted/40 transition-colors">
              {renderLabel(item)}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function CentralTarefas() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dados, setDados] = useState(null);

  useEffect(() => {
    if (user?.role) carregar(user.role, user.id);
  }, [user?.role, user?.id]);

  async function carregar(role, userId) {
    setLoading(true);
    try {
      if (role === 'gerente_producao') {
        const [seps, ops, maquinas, caixas, pedidos] = await Promise.all([
          base44.entities.Separacao.list('-created_date'),
          base44.entities.OrdemProducao.filter({ status: 'a_produzir' }),
          base44.entities.Maquina.list(),
          base44.entities.ModeloCaixa.list().catch(() => []),
          base44.entities.Pedido.filter({ status: 'rascunho', origem: 'pedido' }),
        ]);
        const bloqueadas = seps.filter(s => s.status === 'separado' && s.separacao_irma_id);
        const liberadasHoje = seps.filter(s => s.liberado_sem_irma && ehHoje(s.liberado_sem_irma_em));
        const mescladasHoje = seps.filter(s => s.status === 'mesclada' && ehHoje(s.updated_date));
        const tarugo = maquinas.find(m => m.tipo_produto === 'tarugo');
        const caixasZeradas = caixas.filter(c => (c.estoque_atual || 0) <= 0);
        setDados({
          bloqueadas, liberadasHoje, mescladasHoje, tarugo, caixasZeradas, opsFila: ops, pedidosRepresados: pedidos,
        });
      } else if (['vendedor', 'vendedor_industria', 'vendedor_loja'].includes(role)) {
        const pedidos = await base44.entities.Pedido.filter({ created_by_id: userId });
        const represados = pedidos.filter(p => p.status === 'rascunho');
        const aguardandoPagamento = pedidos.filter(p => p.status_pagamento === 'pendente' && p.status !== 'cancelado');
        const criadosHoje = pedidos.filter(p => ehHoje(p.created_date));
        const entreguesHoje = pedidos.filter(p => p.status === 'entregue' && ehHoje(p.updated_date));
        setDados({ represados, aguardandoPagamento, criadosHoje, entreguesHoje, totalPedidos: pedidos.length });
      } else if (['estoquista', 'estoquista_industria'].includes(role)) {
        const [pedidos, produtos, seps] = await Promise.all([
          base44.entities.Pedido.filter({ status: 'rascunho', origem: 'pedido' }),
          base44.entities.Produto.list(),
          base44.entities.Separacao.list('-created_date'),
        ]);
        const baixoEstoque = produtos.filter(p => p.controla_estoque !== false && (p.estoque_minimo || 0) > 0 && (p.estoque_atual || 0) <= p.estoque_minimo);
        const filaSeparacao = seps.filter(s => ['aguardando_separacao', 'em_separacao'].includes(s.status));
        const reservadasHoje = seps.filter(s => s.estoque_ja_reservado && ehHoje(s.created_date));
        setDados({ pedidosRepresados: pedidos, baixoEstoque, filaSeparacao, reservadasHoje });
      } else if (role === 'motorista') {
        const exps = await base44.entities.Expedicao.list('-created_date');
        const prontas = exps.filter(e => e.status === 'emitida');
        const emTransito = exps.filter(e => e.status === 'enviada');
        const entreguesHoje = exps.filter(e => e.status === 'entregue' && ehHoje(e.data_entrega));
        setDados({ prontas, emTransito, entreguesHoje });
      } else if (role === 'embalador') {
        const [paraEmbalar, paraEtiquetar, modelosCaixa] = await Promise.all([
          base44.entities.OrdemProducao.filter({ status: 'em_embalagem' }),
          base44.entities.OrdemProducao.filter({ status: 'em_etiquetagem' }),
          base44.entities.ModeloCaixa.list().catch(() => []),
        ]);
        const caixasZeradas = modelosCaixa.filter(c => (c.estoque_atual || 0) <= 0);
        const embaladasHoje = [...paraEmbalar, ...paraEtiquetar].filter(o => ehHoje(o.data_embalagem));
        setDados({ paraEmbalar, paraEtiquetar, caixasZeradas, embaladasHoje });
      }
    } finally {
      setLoading(false);
    }
  }

  if (!user?.role) return null;
  if (loading || !dados) {
    return <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">Carregando sua central de tarefas...</div>;
  }

  // ── Gerente de Produção ──────────────────────────────────────────────
  if (user.role === 'gerente_producao') {
    const concluidos = dados.liberadasHoje.length + dados.mescladasHoje.length;
    const pendentes = dados.bloqueadas.length;
    return (
      <div>
        <ProgressoHoje concluidos={concluidos} pendentes={pendentes} />
        <div className="grid md:grid-cols-2 gap-3">
          <TaskCard icon={Lock} cor="#F59E0B" titulo="Separações bloqueadas (aguardando irmã)" itens={dados.bloqueadas} vazio="Nenhuma bloqueada — tudo fluindo 🎉"
            renderLabel={s => (<><span className="truncate flex-1 font-medium text-foreground">{s.cliente_nome} · {s.numero}</span><Link to="/KanbanSeparacao" className="text-amber-600 font-semibold flex-shrink-0">Resolver <ArrowRight size={10} className="inline" /></Link></>)} />
          <TaskCard icon={ClipboardList} cor="#2563EB" titulo="Pedidos represados (sem reserva)" itens={dados.pedidosRepresados} vazio="Nenhum pedido represado"
            renderLabel={p => (<><span className="truncate flex-1 font-medium text-foreground">{p.cliente_nome} · {p.numero}</span></>)} />
          <TaskCard icon={Factory} cor="#16A34A" titulo="Fila de Produção (a produzir)" itens={dados.opsFila} vazio="Fila de produção vazia"
            renderLabel={o => (<><span className="truncate flex-1 font-medium text-foreground">{o.produto_nome} · {o.numero}</span><span className="text-muted-foreground flex-shrink-0">{o.quantidade} un</span></>)} />
          <TaskCard icon={AlertTriangle} cor="#DC2626" titulo="Estoque crítico" itens={dados.caixasZeradas} vazio="Nenhuma caixa zerada"
            renderLabel={c => (<><span className="truncate flex-1 font-medium text-foreground">{c.nome}</span><span className="text-red-600 font-bold flex-shrink-0">0 un</span></>)} />
        </div>
        {dados.tarugo && (
          <div className={`mt-3 rounded-2xl border px-4 py-3 flex items-center justify-between ${(dados.tarugo.estoque_atual || 0) <= 0 ? 'bg-red-50 border-red-200' : 'bg-white border-border'}`}>
            <p className="text-sm font-semibold text-foreground">Estoque de Tarugo</p>
            <p className={`text-lg font-black ${(dados.tarugo.estoque_atual || 0) <= 0 ? 'text-red-600' : 'text-foreground'}`}>{dados.tarugo.estoque_atual || 0} un</p>
          </div>
        )}
      </div>
    );
  }

  // ── Vendedor ──────────────────────────────────────────────────────────
  if (['vendedor', 'vendedor_industria', 'vendedor_loja'].includes(user.role)) {
    const concluidos = dados.criadosHoje.length + dados.entreguesHoje.length;
    const pendentes = dados.represados.length + dados.aguardandoPagamento.length;
    return (
      <div>
        <ProgressoHoje concluidos={concluidos} pendentes={pendentes} corBase="#2563EB" />
        <div className="grid md:grid-cols-2 gap-3">
          <TaskCard icon={ClipboardList} cor="#F59E0B" titulo="Meus pedidos represados" itens={dados.represados} vazio="Nenhum represado — tudo confirmado"
            renderLabel={p => (<><span className="truncate flex-1 font-medium text-foreground">{p.cliente_nome} · {p.numero}</span><Link to="/Pedidos" className="text-amber-600 font-semibold flex-shrink-0">Ver</Link></>)} />
          <TaskCard icon={TrendingUp} cor="#DC2626" titulo="Aguardando pagamento" itens={dados.aguardandoPagamento} vazio="Nenhum pedido pendente de pagamento"
            renderLabel={p => (<><span className="truncate flex-1 font-medium text-foreground">{p.cliente_nome} · {p.numero}</span><span className="text-muted-foreground flex-shrink-0">R$ {(p.valor_total || 0).toFixed(0)}</span></>)} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl border border-border px-4 py-3 text-center">
            <p className="text-2xl font-black text-foreground">{dados.criadosHoje.length}</p>
            <p className="text-xs text-muted-foreground">Pedidos criados hoje</p>
          </div>
          <div className="bg-white rounded-2xl border border-border px-4 py-3 text-center">
            <p className="text-2xl font-black text-foreground">{dados.totalPedidos}</p>
            <p className="text-xs text-muted-foreground">Total de pedidos meus</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Estoquista ────────────────────────────────────────────────────────
  if (['estoquista', 'estoquista_industria'].includes(user.role)) {
    const concluidos = dados.reservadasHoje.length;
    const pendentes = dados.pedidosRepresados.length;
    return (
      <div>
        <ProgressoHoje concluidos={concluidos} pendentes={pendentes} corBase="#16A34A" />
        <div className="grid md:grid-cols-2 gap-3">
          <TaskCard icon={ClipboardList} cor="#F59E0B" titulo="Pedidos aguardando reserva" itens={dados.pedidosRepresados} vazio="Nenhum pedido esperando"
            renderLabel={p => (<><span className="truncate flex-1 font-medium text-foreground">{p.cliente_nome} · {p.numero}</span><Link to="/Estoque" className="text-amber-600 font-semibold flex-shrink-0">Resolver</Link></>)} />
          <TaskCard icon={AlertTriangle} cor="#DC2626" titulo="Produtos abaixo do mínimo" itens={dados.baixoEstoque} vazio="Estoque saudável"
            renderLabel={p => (<><span className="truncate flex-1 font-medium text-foreground">{p.nome}</span><span className="text-red-600 font-bold flex-shrink-0">{p.estoque_atual}/{p.estoque_minimo}</span></>)} />
          <TaskCard icon={Package} cor="#0EA5E9" titulo="Fila de Separação" itens={dados.filaSeparacao} vazio="Fila de separação vazia"
            renderLabel={s => (<><span className="truncate flex-1 font-medium text-foreground">{s.cliente_nome} · {s.numero}</span><Link to="/KanbanSeparacao" className="text-sky-600 font-semibold flex-shrink-0">Ver</Link></>)} />
        </div>
      </div>
    );
  }

  // ── Motorista ─────────────────────────────────────────────────────────
  if (user.role === 'motorista') {
    const concluidos = dados.entreguesHoje.length;
    const pendentes = dados.prontas.length + dados.emTransito.length;
    return (
      <div>
        <ProgressoHoje concluidos={concluidos} pendentes={pendentes} corBase="#14B8A6" />
        <div className="grid md:grid-cols-2 gap-3">
          <TaskCard icon={Package} cor="#2563EB" titulo="Prontas para sair (NF emitida)" itens={dados.prontas} vazio="Nada esperando envio"
            renderLabel={e => (<><span className="truncate flex-1 font-medium text-foreground">{e.cliente_nome} · NF {e.numero_nf}</span><Link to="/Expedicao" className="text-blue-600 font-semibold flex-shrink-0">Ver</Link></>)} />
          <TaskCard icon={Truck} cor="#F59E0B" titulo="Em trânsito" itens={dados.emTransito} vazio="Nada em trânsito agora"
            renderLabel={e => (<><span className="truncate flex-1 font-medium text-foreground">{e.cliente_nome} · NF {e.numero_nf}</span></>)} />
        </div>
        <div className="mt-3 bg-white rounded-2xl border border-border px-4 py-3 text-center">
          <p className="text-2xl font-black text-emerald-600">{dados.entreguesHoje.length}</p>
          <p className="text-xs text-muted-foreground">Entregas concluídas hoje</p>
        </div>
      </div>
    );
  }

  return null;
}
