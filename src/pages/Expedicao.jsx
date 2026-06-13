import { useEffect, useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { gerarDANFEHTML } from '@/lib/danfeGenerator';
import {
  Truck, FileText, CheckCircle, Plus, Search, X, Send, Printer,
  RefreshCw, Package, ArrowRight, Eye, Tag, Filter, ChevronDown,
  Clock, AlertTriangle, ClipboardCheck
} from 'lucide-react';
import { getDestinoLabel, DestinoBadge } from '@/components/pedidos/DestinoPedido';
import { gerarNumero } from '@/lib/numeracao';
import { registrarLog } from '@/lib/audit';
import ModalConfirmacaoRecebimento from '@/components/expedicao/ModalConfirmacaoRecebimento';
import NovaExpedicaoModal from '@/components/expedicao/NovaExpedicaoModal';
import ModalConferencia from '@/components/expedicao/ModalConferencia';
import { usePermissoes } from '@/lib/usePermissoes.jsx';
import AlertaSeparacao from '@/components/expedicao/AlertaSeparacao';
import ModalItensPedido from '@/components/expedicao/ModalItensPedido';
import EtiquetaEndereco from '@/components/expedicao/EtiquetaEndereco';
import PainelExpedicaoRapida from '@/components/expedicao/PainelExpedicaoRapida';

// ── Status visuais ─────────────────────────────────────────────────────────
const STATUS_PEDIDO = {
  aguardando_separacao: { label: 'Ag. Separação',  bg: 'bg-amber-50',   border: 'border-amber-200',  dot: '#F59E0B', accent: '#F59E0B', icon: Clock },
  separacao:           { label: 'Em Separação',   bg: 'bg-blue-50',    border: 'border-blue-200',   dot: '#3B82F6', accent: '#3B82F6', icon: Package },
  separado:            { label: 'Separado',       bg: 'bg-green-50',   border: 'border-green-200',  dot: '#22C55E', accent: '#22C55E', icon: CheckCircle },
  emitida:             { label: 'NF Emitida',     bg: 'bg-purple-50',  border: 'border-purple-200', dot: '#A855F7', accent: '#A855F7', icon: FileText },
  enviada:             { label: 'Em Trânsito',    bg: 'bg-orange-50',  border: 'border-orange-200', dot: '#F97316', accent: '#F97316', icon: Truck },
  entregue:            { label: 'Entregue',       bg: 'bg-emerald-50', border: 'border-emerald-200',dot: '#10B981', accent: '#10B981', icon: CheckCircle },
  atrasado:            { label: 'Atrasado',       bg: 'bg-red-50',     border: 'border-red-200',    dot: '#EF4444', accent: '#EF4444', icon: AlertTriangle },
};

const COLUNAS_EXP = [
  { key: 'aguardando_separacao', label: 'Ag. Separação' },
  { key: 'separacao',            label: 'Em Separação' },
  { key: 'separado',             label: 'Separado' },
  { key: 'emitida',              label: 'NF Emitida' },
  { key: 'enviada',              label: 'Em Trânsito' },
  { key: 'entregue',             label: 'Entregue' },
  { key: 'atrasado',             label: 'Atrasados' },
];

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d.includes('T') ? d : d + 'T12:00:00').toLocaleDateString('pt-BR');
}
function fmtR(v) {
  return `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}
function isAtrasado(p) {
  if (!p.data_entrega_prevista) return false;
  if (['cancelado', 'entregue', 'expedido'].includes(p.status)) return false;
  return p.data_entrega_prevista < new Date().toISOString().split('T')[0];
}

// ── Card de Pedido ─────────────────────────────────────────────────────────
function PedidoCard({ pedido, expedicao, cliente, ordemProducao, statusKey, onVerPedido, onConferencia, onConfirmarRecebimento, onEmitirNF, emitindo, onAvancar, advancing, onImprimirNF, onEtiqueta, readonly }) {
  const st = STATUS_PEDIDO[statusKey] || STATUS_PEDIDO.separado;
  const Icon = st.icon;
  const totalItens = (pedido?.itens || expedicao?.itens || []).reduce((s, i) => s + (i.quantidade || 0), 0);
  const atrasado = isAtrasado(pedido || {});

  return (
    <div className={`rounded-2xl border shadow-sm hover:shadow-md transition-shadow overflow-hidden ${st.bg} ${st.border}`}>
      {/* Stripe colorida no topo */}
      <div className="h-1" style={{ background: st.accent }} />

      <div className="p-4 space-y-2.5">
        {/* Header do card */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold text-muted-foreground font-mono">
                #{pedido?.numero || expedicao?.pedido_numero}
              </span>
              {expedicao?.numero_nf && (
                <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-bold">
                  NF {expedicao.numero_nf}
                </span>
              )}
              {atrasado && (
                <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                  <AlertTriangle size={8} /> Atrasado
                </span>
              )}
              {pedido?.white_label && (
                <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                  <Tag size={8} /> WL
                </span>
              )}
            </div>
            <p className="text-sm font-bold text-foreground leading-tight mt-0.5 truncate">
              {pedido?.cliente_nome || expedicao?.cliente_nome}
            </p>
            {cliente?.telefone && (
              <p className="text-[10px] text-muted-foreground">📞 {cliente.telefone}</p>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: st.accent }}>
              {st.label}
            </span>
            <p className="text-xs font-bold text-foreground mt-1">{fmtR(pedido?.valor_total || expedicao?.valor_total)}</p>
          </div>
        </div>

        {/* Datas */}
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
          {pedido?.data_pedido && <span>📅 Pedido: {fmtDate(pedido.data_pedido)}</span>}
          {pedido?.data_entrega_prevista && (
            <span className={atrasado ? 'text-red-600 font-bold' : ''}>
              🎯 Entrega: {fmtDate(pedido.data_entrega_prevista)}
            </span>
          )}
          {expedicao?.data_emissao && <span>📄 NF: {fmtDate(expedicao.data_emissao)}</span>}
          {expedicao?.data_envio && <span>🚛 Envio: {fmtDate(expedicao.data_envio)}</span>}
          {expedicao?.data_entrega && <span>✅ Entregue: {fmtDate(expedicao.data_entrega)}</span>}
        </div>

        {/* Destino */}
        {pedido?.destino_tipo && <DestinoBadge pedido={pedido} />}

        {/* OP vinculada */}
        {ordemProducao?.numero && (
          <p className="text-[10px] text-muted-foreground">⚙️ OP: <strong className="text-foreground">{ordemProducao.numero}</strong></p>
        )}

        {/* Itens resumo */}
        {(pedido?.itens || expedicao?.itens || []).length > 0 && (
          <div className="bg-white/60 rounded-xl px-3 py-2">
            {(pedido?.itens || expedicao?.itens || []).slice(0, 2).map((item, i) => (
              <p key={i} className="text-[10px] text-foreground truncate">{item.produto_nome} × {item.quantidade}</p>
            ))}
            {(pedido?.itens || expedicao?.itens || []).length > 2 && (
              <p className="text-[10px] text-muted-foreground">+{(pedido?.itens || expedicao?.itens || []).length - 2} mais…</p>
            )}
            <p className="text-[10px] font-bold text-primary mt-0.5">{totalItens} unidades total</p>
          </div>
        )}

        {/* Observações */}
        {pedido?.observacoes && (
          <p className="text-[10px] text-muted-foreground italic truncate">💬 {pedido.observacoes}</p>
        )}

        {/* Ações — linha 1 (secundárias) */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {onVerPedido && (
            <button onClick={() => onVerPedido(pedido?.id || expedicao?.pedido_id)}
              className="flex items-center gap-1 text-[10px] border border-primary/30 bg-primary/5 text-primary px-2 py-1 rounded-lg hover:bg-primary/10 transition-colors font-medium">
              <Eye size={10} /> Ver Pedido
            </button>
          )}
          {onConferencia && (
            <button onClick={() => onConferencia()}
              className="flex items-center gap-1 text-[10px] border border-blue-200 bg-blue-50 text-blue-700 px-2 py-1 rounded-lg hover:bg-blue-100 transition-colors font-medium">
              <ClipboardCheck size={10} /> Conferência / NF
            </button>
          )}
          {expedicao && onImprimirNF && (
            <button onClick={() => onImprimirNF(expedicao)}
              className="flex items-center gap-1 text-[10px] border border-border px-2 py-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
              <Printer size={10} /> NF
            </button>
          )}
          {expedicao && onEtiqueta && (
            <button onClick={() => onEtiqueta(expedicao)}
              className="flex items-center gap-1 text-[10px] border border-border px-2 py-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
              <Tag size={10} /> Etiqueta
            </button>
          )}
        </div>

        {/* Ações — linha 2 (primárias) */}
        {!readonly && (
          <div className="flex flex-col gap-1.5">
            {statusKey === 'separado' && onEmitirNF && (
              <button onClick={() => onEmitirNF()}
                disabled={emitindo}
                className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl text-white transition-all disabled:opacity-50"
                style={{ background: '#A855F7' }}>
                {emitindo ? <RefreshCw size={11} className="animate-spin" /> : <ArrowRight size={11} />}
                Emitir NF
              </button>
            )}
            {expedicao && expedicao.status !== 'entregue' && onConfirmarRecebimento && (
              <button onClick={() => onConfirmarRecebimento()}
                className="w-full flex items-center justify-center gap-1.5 text-xs border border-green-200 bg-green-50 text-green-700 px-3 py-2 rounded-xl hover:bg-green-100 transition-colors font-semibold">
                <CheckCircle size={11} /> Confirmar Recebimento
              </button>
            )}
            {expedicao && expedicao.status === 'emitida' && onAvancar && (
              <button onClick={() => onAvancar(expedicao.id, 'enviada')}
                disabled={advancing}
                className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl text-white disabled:opacity-50"
                style={{ background: '#F97316' }}>
                {advancing ? <RefreshCw size={11} className="animate-spin" /> : <Send size={11} />}
                → Enviar
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Painel de filtros ──────────────────────────────────────────────────────
function PainelFiltros({ filtros, setFiltros, clientes, transportadoras, unidades, onClose }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-lg">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-foreground flex items-center gap-2"><Filter size={14} /> Filtros Avançados</p>
        <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg"><X size={14} className="text-muted-foreground" /></button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {[
          { key: 'cliente', label: 'Cliente', type: 'text', placeholder: 'Nome do cliente...' },
          { key: 'numero_pedido', label: 'Nº Pedido', type: 'text', placeholder: 'Ex: PED-001' },
          { key: 'numero_op', label: 'Nº OP', type: 'text', placeholder: 'Ex: OP-001' },
          { key: 'cidade', label: 'Cidade', type: 'text', placeholder: 'Cidade...' },
          { key: 'estado', label: 'Estado', type: 'text', placeholder: 'Ex: SP' },
          { key: 'data_pedido_de', label: 'Pedido de', type: 'date' },
          { key: 'data_pedido_ate', label: 'Pedido até', type: 'date' },
          { key: 'data_expedicao_de', label: 'Expedição de', type: 'date' },
          { key: 'data_expedicao_ate', label: 'Expedição até', type: 'date' },
        ].map(f => (
          <div key={f.key}>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">{f.label}</label>
            <input type={f.type || 'text'} placeholder={f.placeholder}
              value={filtros[f.key] || ''}
              onChange={e => setFiltros(prev => ({ ...prev, [f.key]: e.target.value }))}
              className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
        ))}

        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">Transportadora</label>
          <select value={filtros.transportadora || ''} onChange={e => setFiltros(p => ({ ...p, transportadora: e.target.value }))}
            className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="">Todas</option>
            {transportadoras.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">Unidade de Retirada</label>
          <select value={filtros.unidade || ''} onChange={e => setFiltros(p => ({ ...p, unidade: e.target.value }))}
            className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="">Todas</option>
            {unidades.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">White Label</label>
          <select value={filtros.white_label || ''} onChange={e => setFiltros(p => ({ ...p, white_label: e.target.value }))}
            className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="">Todos</option>
            <option value="sim">Somente WL</option>
            <option value="nao">Excluir WL</option>
          </select>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setFiltros({})}
          className="px-4 py-2 border border-border rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors">
          Limpar filtros
        </button>
      </div>
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────────────────
export default function Expedicao() {
  const { somenteLeitura } = usePermissoes();
  const readonly = somenteLeitura('Expedicao');

  const [expedicoes, setExpedicoes] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [ordens, setOrdens] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loadingForm, setLoadingForm] = useState(false);
  const [modalConfirmacao, setModalConfirmacao] = useState(null);
  const [modalConferencia, setModalConferencia] = useState(null); // { pedido, expedicao, cliente, ordemProducao }
  const [pedidoDetalhes, setPedidoDetalhes] = useState(null);
  const [etiquetaExpedicao, setEtiquetaExpedicao] = useState(null);
  const [busca, setBusca] = useState('');
  const [advancingId, setAdvancingId] = useState(null);
  const [emitindoId, setEmitindoId] = useState(null);
  const [aba, setAba] = useState('kanban');
  const [statusFiltro, setStatusFiltro] = useState('todos');
  const [showFiltros, setShowFiltros] = useState(false);
  const [filtros, setFiltros] = useState({});
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const [exps, peds, cls, ords] = await Promise.all([
      base44.entities.Expedicao.list('-created_date'),
      base44.entities.Pedido.list('-created_date'),
      base44.entities.Cliente.list(),
      base44.entities.OrdemProducao.list('-created_date'),
    ]);
    setExpedicoes(exps);
    setPedidos(peds);
    setClientes(cls);
    setOrdens(ords);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Mapas auxiliares
  const clienteMap = useMemo(() => {
    const m = {};
    for (const c of clientes) m[c.id] = c;
    return m;
  }, [clientes]);

  const expByPedidoId = useMemo(() => {
    const m = {};
    for (const e of expedicoes) if (e.pedido_id) m[e.pedido_id] = e;
    return m;
  }, [expedicoes]);

  const ordemByPedidoId = useMemo(() => {
    const m = {};
    for (const o of ordens) if (o.pedido_id) m[o.pedido_id] = o;
    return m;
  }, [ordens]);

  // Listas únicas para filtros
  const transportadorasUnicas = useMemo(() => {
    const s = new Set();
    for (const e of expedicoes) if (e.transportadora) s.add(e.transportadora);
    for (const p of pedidos) if (p.destino_transportadora) s.add(p.destino_transportadora);
    return [...s];
  }, [expedicoes, pedidos]);

  const unidadesUnicas = useMemo(() => {
    const s = new Set();
    for (const p of pedidos) if (p.destino_unidade) s.add(p.destino_unidade);
    return [...s];
  }, [pedidos]);

  // Mapear cada pedido ao seu status de "coluna"
  const hoje = new Date().toISOString().split('T')[0];

  const todosItens = useMemo(() => {
    const items = [];
    const expPedidoIds = new Set(expedicoes.map(e => e.pedido_id).filter(Boolean));

    // Pedidos que não foram expedidos ainda
    for (const p of pedidos) {
      if (['cancelado'].includes(p.status)) continue;
      const exp = expByPedidoId[p.id];
      const cliente = clienteMap[p.cliente_id];
      const op = ordemByPedidoId[p.id];

      let statusKey;
      if (exp) {
        statusKey = exp.status; // emitida | enviada | entregue
      } else if (isAtrasado(p)) {
        statusKey = 'atrasado';
      } else if (p.status === 'separado') {
        statusKey = 'separado';
      } else if (p.status === 'separacao') {
        statusKey = 'separacao';
      } else {
        statusKey = 'aguardando_separacao';
      }

      items.push({ pedido: p, expedicao: exp || null, cliente, ordemProducao: op, statusKey });
    }

    return items;
  }, [pedidos, expedicoes, clienteMap, expByPedidoId, ordemByPedidoId]);

  // Aplicar filtros
  const itensFiltrados = useMemo(() => {
    let list = todosItens;

    if (busca) {
      const b = busca.toLowerCase();
      list = list.filter(({ pedido, expedicao, cliente }) =>
        pedido?.numero?.toLowerCase().includes(b) ||
        pedido?.cliente_nome?.toLowerCase().includes(b) ||
        expedicao?.numero_nf?.toLowerCase().includes(b) ||
        cliente?.telefone?.includes(b)
      );
    }

    if (statusFiltro !== 'todos') {
      list = list.filter(i => i.statusKey === statusFiltro);
    }

    if (filtros.cliente) {
      const b = filtros.cliente.toLowerCase();
      list = list.filter(i => i.pedido?.cliente_nome?.toLowerCase().includes(b));
    }
    if (filtros.numero_pedido) {
      list = list.filter(i => i.pedido?.numero?.toLowerCase().includes(filtros.numero_pedido.toLowerCase()));
    }
    if (filtros.numero_op) {
      list = list.filter(i => i.ordemProducao?.numero?.toLowerCase().includes(filtros.numero_op.toLowerCase()));
    }
    if (filtros.cidade) {
      const b = filtros.cidade.toLowerCase();
      list = list.filter(i => i.cliente?.endereco?.toLowerCase().includes(b));
    }
    if (filtros.estado) {
      const b = filtros.estado.toLowerCase();
      list = list.filter(i => i.cliente?.endereco?.toLowerCase().includes(b));
    }
    if (filtros.transportadora) {
      list = list.filter(i =>
        i.expedicao?.transportadora === filtros.transportadora ||
        i.pedido?.destino_transportadora === filtros.transportadora
      );
    }
    if (filtros.unidade) {
      list = list.filter(i => i.pedido?.destino_unidade === filtros.unidade);
    }
    if (filtros.white_label === 'sim') {
      list = list.filter(i => i.pedido?.white_label);
    }
    if (filtros.white_label === 'nao') {
      list = list.filter(i => !i.pedido?.white_label);
    }
    if (filtros.data_pedido_de) {
      list = list.filter(i => (i.pedido?.data_pedido || '') >= filtros.data_pedido_de);
    }
    if (filtros.data_pedido_ate) {
      list = list.filter(i => (i.pedido?.data_pedido || '') <= filtros.data_pedido_ate);
    }
    if (filtros.data_expedicao_de) {
      list = list.filter(i => (i.expedicao?.data_emissao || '') >= filtros.data_expedicao_de);
    }
    if (filtros.data_expedicao_ate) {
      list = list.filter(i => (i.expedicao?.data_emissao || '') <= filtros.data_expedicao_ate);
    }

    return list;
  }, [todosItens, busca, statusFiltro, filtros]);

  // Contagens por status
  const counts = useMemo(() => {
    const c = {};
    for (const st of Object.keys(STATUS_PEDIDO)) {
      c[st] = todosItens.filter(i => i.statusKey === st).length;
    }
    c.todos = todosItens.length;
    return c;
  }, [todosItens]);

  const emitirNF = async (pedido) => {
    setEmitindoId(pedido.id);
    const numero_nf = gerarNumero('NF');
    const hoje = new Date().toISOString().split('T')[0];
    const exp = await base44.entities.Expedicao.create({
      numero_nf, pedido_id: pedido.id, pedido_numero: pedido.numero,
      cliente_nome: pedido.cliente_nome, itens: pedido.itens || [],
      status: 'emitida', data_emissao: hoje, valor_total: pedido.valor_total || 0,
    });
    await base44.entities.Pedido.update(pedido.id, { status: 'expedido' });
    await registrarLog('Expedicao', exp.id, 'EMISSAO', `NF ${numero_nf} emitida para pedido ${pedido.numero}`);
    await load();
    setEmitindoId(null);
  };

  const atualizarStatus = async (id, status) => {
    setAdvancingId(id);
    const updates = { status };
    if (status === 'enviada') updates.data_envio = new Date().toISOString().split('T')[0];
    if (status === 'entregue') updates.data_entrega = new Date().toISOString().split('T')[0];
    await base44.entities.Expedicao.update(id, updates);
    await registrarLog('Expedicao', id, 'STATUS', `Status → ${status}`);
    await load();
    setAdvancingId(null);
  };

  const criarExpedicao = async ({ pedidoId, transportadora, observacoes }) => {
    const p = pedidos.find(x => x.id === pedidoId);
    if (!p) return;
    setLoadingForm(true);
    const numero_nf = gerarNumero('NF');
    const hoje = new Date().toISOString().split('T')[0];
    const exp = await base44.entities.Expedicao.create({
      numero_nf, pedido_id: pedidoId, pedido_numero: p.numero,
      cliente_nome: p.cliente_nome, itens: p.itens || [],
      status: 'emitida', data_emissao: hoje, transportadora,
      valor_total: p.valor_total || 0, observacoes,
    });
    await base44.entities.Pedido.update(pedidoId, { status: 'expedido' });
    await registrarLog('Expedicao', exp.id, 'EMISSAO', `NF ${numero_nf} emitida`);
    await load();
    setLoadingForm(false);
    setShowForm(false);
  };

  const imprimirDANFE = (exp) => {
    const html = gerarDANFEHTML(exp, { nome: 'RAIO DO SOL', cnpj: '00000000000000', endereco: 'Velas e Cosméticos - Fone: (11) 9999-9999' });
    const win = window.open('', '_blank', 'width=960,height=1200');
    win.document.write(html); win.document.close();
  };

  const abrirPedido = async (pedidoId) => {
    const p = pedidos.find(x => x.id === pedidoId);
    if (p) setPedidoDetalhes(p);
  };

  const pedidosSeparados = useMemo(() => pedidos.filter(p => p.status === 'separado'), [pedidos]);
  const pedidosDisponiveis = useMemo(() =>
    pedidos.filter(p => p.status === 'separado' && !expByPedidoId[p.id])
      .map(p => ({ id: p.id, numero: p.numero, nome: p.cliente_nome, itens: p.itens, valor_total: p.valor_total })),
    [pedidos, expByPedidoId]);

  const filtrosAtivos = Object.values(filtros).filter(Boolean).length;

  return (
    <div className="flex flex-col h-full gap-4">
      <AlertaSeparacao />

      {/* ── Header ── */}
      <div className="bg-card border border-border rounded-2xl px-5 py-4 flex-shrink-0 space-y-4">
        {/* Título + ações */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 flex items-center justify-center">
              <Truck size={19} className="text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Expedição</h2>
              <p className="text-xs text-muted-foreground">
                {counts.aguardando_separacao} ag. sep. · {counts.separado} separados · {counts.emitida} emitidas · {counts.enviada} em trânsito · {counts.entregue} entregues
                {counts.atrasado > 0 && <span className="text-red-600 font-bold"> · {counts.atrasado} atrasados ⚠️</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={busca} onChange={e => setBusca(e.target.value)}
                placeholder="Buscar pedido, cliente, NF..."
                className="border border-border rounded-xl pl-8 pr-8 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary w-52" />
              {busca && <button onClick={() => setBusca('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"><X size={13} /></button>}
            </div>
            <button onClick={() => setShowFiltros(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${showFiltros || filtrosAtivos > 0 ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted'}`}>
              <Filter size={14} />
              Filtros
              {filtrosAtivos > 0 && <span className="text-xs bg-white/30 px-1 rounded-full">{filtrosAtivos}</span>}
            </button>
            <button onClick={load} className="p-2.5 border border-border rounded-xl hover:bg-muted transition-colors">
              <RefreshCw size={15} className={`text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
            </button>
            {!readonly && (
              <button onClick={() => setShowForm(true)}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm">
                <Plus size={16} /> Nova NF
              </button>
            )}
          </div>
        </div>

        {/* Filtros avançados */}
        {showFiltros && (
          <PainelFiltros
            filtros={filtros} setFiltros={setFiltros}
            clientes={clientes} transportadoras={transportadorasUnicas} unidades={unidadesUnicas}
            onClose={() => setShowFiltros(false)}
          />
        )}

        {/* Filtro por status (chips) */}
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setStatusFiltro('todos')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${statusFiltro === 'todos' ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:bg-border'}`}>
            Todos <span className="opacity-70">({counts.todos})</span>
          </button>
          {Object.entries(STATUS_PEDIDO).map(([key, st]) => {
            const Icon = st.icon;
            const c = counts[key] || 0;
            return (
              <button key={key} onClick={() => setStatusFiltro(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${statusFiltro === key ? 'text-white shadow-sm' : 'bg-muted text-muted-foreground hover:bg-border'}`}
                style={statusFiltro === key ? { background: st.accent } : {}}>
                <Icon size={10} />{st.label} <span className="opacity-70">({c})</span>
              </button>
            );
          })}
        </div>

        {/* Abas */}
        <div className="flex gap-2 border-b border-border pb-1">
          {[
            { key: 'kanban', label: '📦 Painel de Expedição' },
            { key: 'rapida', label: `🏷️ Etiquetas em Lote${pedidosSeparados.length > 0 ? ` (${pedidosSeparados.length})` : ''}` },
          ].map(a => (
            <button key={a.key} onClick={() => setAba(a.key)}
              className={`text-xs font-semibold px-4 py-2 rounded-t-lg transition-colors border-b-2 ${aba === a.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Aba: Etiquetas ── */}
      {aba === 'rapida' && (
        <div className="flex-1 bg-card border border-border rounded-2xl p-5 overflow-auto">
          <PainelExpedicaoRapida pedidos={pedidosSeparados} />
        </div>
      )}

      {/* ── Aba: Kanban / Painel ── */}
      {aba === 'kanban' && (
        <>
          {itensFiltrados.length === 0 ? (
            <div className="flex-1 bg-card border border-border rounded-2xl flex items-center justify-center">
              <div className="text-center py-16 text-muted-foreground">
                <Truck size={40} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm font-bold">Nenhum pedido encontrado</p>
                <p className="text-xs mt-1">Tente ajustar os filtros.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-4 overflow-y-auto flex-1">
              {itensFiltrados.map(({ pedido, expedicao, cliente, ordemProducao, statusKey }) => (
                <PedidoCard
                  key={pedido?.id || expedicao?.id}
                  pedido={pedido}
                  expedicao={expedicao}
                  cliente={cliente}
                  ordemProducao={ordemProducao}
                  statusKey={statusKey}
                  readonly={readonly}
                  onVerPedido={abrirPedido}
                  onConferencia={() => setModalConferencia({ pedido, expedicao, cliente, ordemProducao })}
                  onEmitirNF={statusKey === 'separado' ? () => emitirNF(pedido) : null}
                  emitindo={emitindoId === pedido?.id}
                  onAvancar={atualizarStatus}
                  advancing={advancingId === expedicao?.id}
                  onConfirmarRecebimento={expedicao ? () => setModalConfirmacao(expedicao) : null}
                  onImprimirNF={imprimirDANFE}
                  onEtiqueta={expedicao ? (exp) => setEtiquetaExpedicao(exp) : null}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Modais ── */}
      {showForm && (
        <NovaExpedicaoModal
          pedidos={pedidosDisponiveis}
          loading={loadingForm}
          onCriar={criarExpedicao}
          onClose={() => setShowForm(false)}
        />
      )}
      {modalConfirmacao && (
        <ModalConfirmacaoRecebimento
          expedicao={modalConfirmacao}
          onClose={() => setModalConfirmacao(null)}
          onConfirmed={() => { setModalConfirmacao(null); load(); }}
        />
      )}
      {modalConferencia && (
        <ModalConferencia
          {...modalConferencia}
          onClose={() => setModalConferencia(null)}
        />
      )}
      {etiquetaExpedicao && (
        <EtiquetaEndereco
          expedicao={etiquetaExpedicao}
          onClose={() => setEtiquetaExpedicao(null)}
        />
      )}
      {pedidoDetalhes && (
        <ModalItensPedido
          pedido={pedidoDetalhes}
          onClose={() => setPedidoDetalhes(null)}
        />
      )}
    </div>
  );
}