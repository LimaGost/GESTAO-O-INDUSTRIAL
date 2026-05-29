import { useEffect, useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { gerarDANFEHTML } from '@/lib/danfeGenerator';
import { Truck, FileText, CheckCircle, Plus, Search, X, Send, Printer, ExternalLink, RefreshCw, Package, ArrowRight, Link2 } from 'lucide-react';
import { gerarNumero } from '@/lib/numeracao';
import { registrarLog } from '@/lib/audit';
import ModalConfirmacaoRecebimento from '@/components/expedicao/ModalConfirmacaoRecebimento';
import NovaExpedicaoModal from '@/components/expedicao/NovaExpedicaoModal';
import { usePermissoes } from '@/lib/usePermissoes.jsx';
import AlertaSeparacao from '@/components/expedicao/AlertaSeparacao';
import { getExpedicaoColunasConfig } from '@/components/configuracoes/AbaExpedicao';
import { getWhatsappKanbanConfig, getWhatsappExpedicaoConfig } from '@/components/configuracoes/AbaWhatsapp';
import EtiquetaEndereco from '@/components/expedicao/EtiquetaEndereco';

const CORES_MAP = [
  { accent: '#64748B', bg: '#F8FAFC', border: '#CBD5E1', dot: '#94A3B8' },
  { accent: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE', dot: '#3B82F6' },
  { accent: '#22C55E', bg: '#F0FDF4', border: '#86EFAC', dot: '#22C55E' },
  { accent: '#F59E0B', bg: '#FFFBEB', border: '#FCD34D', dot: '#F59E0B' },
  { accent: '#A855F7', bg: '#FAF5FF', border: '#D8B4FE', dot: '#A855F7' },
  { accent: '#EF4444', bg: '#FFF5F5', border: '#FCA5A5', dot: '#EF4444' },
  { accent: '#F97316', bg: '#FFF7ED', border: '#FDBA74', dot: '#F97316' },
  { accent: '#14B8A6', bg: '#F0FDFA', border: '#99F6E4', dot: '#14B8A6' },
];

const ICON_MAP = {
  a_expedir: Package,
  emitida: FileText,
  enviada: Truck,
  entregue: CheckCircle,
};

function buildColunasExp() {
  const config = getExpedicaoColunasConfig();
  return config.map((c, i) => {
    const cores = CORES_MAP[c.cor] || CORES_MAP[0];
    const nextCol = config[i + 1];
    return {
      ...c,
      ...cores,
      icon: ICON_MAP[c.key] || Package,
      proximo: nextCol && c.key !== 'a_expedir' ? nextCol.key : null,
      proximoLabel: nextCol && c.key !== 'a_expedir' ? `→ ${nextCol.label}` : null,
    };
  });
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d.includes('T') ? d : d + 'T12:00:00').toLocaleDateString('pt-BR');
}
function fmtR(v) {
  return `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

// Card para OPs finalizadas (ainda sem NF)
function OPFinalizadaCard({ op, clienteNome, onEmitirNF, emitindo }) {
  const qtdTotal = op.itens?.length > 0
    ? op.itens.reduce((s, i) => s + (i.quantidade || 0), 0)
    : (op.quantidade || 0);

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm p-4 space-y-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-muted-foreground">{op.numero}</p>
          <p className="text-sm font-bold text-foreground leading-tight mt-0.5">{op.produto_nome}</p>
          {clienteNome && (
            <p className="text-xs text-purple-600 mt-0.5">👤 {clienteNome}</p>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-semibold">Finalizado</span>
          <p className="text-xs text-muted-foreground mt-1">{qtdTotal} un</p>
        </div>
      </div>

      {op.pedido_numero && (
        <p className="text-xs text-muted-foreground">📦 Pedido <strong className="text-foreground">#{op.pedido_numero}</strong></p>
      )}
      {op.data_finalizacao && (
        <p className="text-xs text-muted-foreground">✅ Finalizado em: <strong className="text-foreground">{fmtDate(op.data_finalizacao)}</strong></p>
      )}

      {op.itens?.length > 0 && (
        <div className="bg-muted/30 rounded-xl px-3 py-2">
          {op.itens.slice(0, 2).map((item, i) => (
            <p key={i} className="text-xs text-foreground truncate">{item.produto_nome} × {item.quantidade}</p>
          ))}
          {op.itens.length > 2 && <p className="text-xs text-muted-foreground">+{op.itens.length - 2} mais...</p>}
        </div>
      )}

      {onEmitirNF && (
        <button
          onClick={() => onEmitirNF(op)}
          disabled={emitindo}
          className="w-full flex items-center justify-center gap-2 text-sm font-semibold px-3 py-2 rounded-xl text-white transition-all disabled:opacity-50"
          style={{ background: '#A855F7' }}
        >
          {emitindo ? <RefreshCw size={13} className="animate-spin" /> : <ArrowRight size={13} />}
          Emitir NF
        </button>
      )}
    </div>
  );
}

// Card para expedições existentes
function ExpedicaoCard({ exp, coluna, onAvancar, onImprimirNF, onImprimirEtiqueta, onConfirmarRecebimento, advancing }) {
  const totalItens = (exp.itens || []).reduce((s, i) => s + (i.quantidade || 0), 0);

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm p-4 space-y-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-muted-foreground">NF {exp.numero_nf}</p>
          <p className="text-sm font-bold text-foreground leading-tight mt-0.5">{exp.cliente_nome}</p>
        </div>
        <div className="flex-shrink-0 text-right">
          <p className="text-sm font-bold text-foreground">{fmtR(exp.valor_total)}</p>
          <p className="text-xs text-muted-foreground">{totalItens} un</p>
        </div>
      </div>

      <div className="space-y-1 text-xs text-muted-foreground">
        {exp.pedido_numero && <p>📦 Pedido <strong className="text-foreground">#{exp.pedido_numero}</strong></p>}
        <p>📅 Emissão: <strong className="text-foreground">{fmtDate(exp.data_emissao)}</strong></p>
        {exp.transportadora && <p>🚛 {exp.transportadora}</p>}
        {exp.data_envio && <p>📤 Enviado: <strong className="text-foreground">{fmtDate(exp.data_envio)}</strong></p>}
        {exp.data_entrega && <p>✅ Entregue: <strong className="text-foreground">{fmtDate(exp.data_entrega)}</strong></p>}
        {exp.confirmado_pelo_cliente && (
          <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold text-[10px]">
            ✓ Confirmado pelo cliente
          </span>
        )}
      </div>

      {(exp.itens || []).length > 0 && (
        <div className="bg-muted/30 rounded-xl px-3 py-2">
          <p className="text-xs text-muted-foreground mb-1 font-semibold">{(exp.itens || []).length} produto(s)</p>
          {exp.itens.slice(0, 2).map((item, i) => (
            <p key={i} className="text-xs text-foreground truncate">{item.produto_nome} × {item.quantidade}</p>
          ))}
          {exp.itens.length > 2 && <p className="text-xs text-muted-foreground">+{exp.itens.length - 2} mais...</p>}
        </div>
      )}

      <div className="flex gap-2 pt-1 flex-wrap">
         <button onClick={() => onImprimirNF(exp)}
          className="flex items-center gap-1.5 text-xs border border-border px-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
          <Printer size={11} /> NF
         </button>
         <button onClick={() => onImprimirEtiqueta?.(exp)}
          className="flex items-center gap-1.5 text-xs border border-border px-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
          <Printer size={11} /> Etiqueta
         </button>

        {exp.status !== 'entregue' && onConfirmarRecebimento && (
          <button onClick={() => onConfirmarRecebimento(exp)}
            className="flex items-center gap-1.5 text-xs border border-border px-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
            <ExternalLink size={11} /> Link
          </button>
        )}

        {coluna?.proximo && onAvancar && (
          <button
            onClick={() => onAvancar(exp.id, coluna.proximo)}
            disabled={advancing}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-white transition-all disabled:opacity-50"
            style={{ background: '#22C55E' }}
          >
            {advancing ? <RefreshCw size={11} className="animate-spin" /> : <Send size={11} />}
            {coluna.proximoLabel}
          </button>
        )}
      </div>
    </div>
  );
}

export default function Expedicao() {
  const { somenteLeitura } = usePermissoes();
  const readonly = somenteLeitura('Expedicao');

  const [colunasExp, setColunasExp] = useState(buildColunasExp);
  const [expedicoes, setExpedicoes] = useState([]);
  const [opsFinalizadas, setOpsFinalizadas] = useState([]);
  const [pedidoMap, setPedidoMap] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [loadingForm, setLoadingForm] = useState(false);
  const [modalConfirmacao, setModalConfirmacao] = useState(null);
  const [busca, setBusca] = useState('');
  const [advancingId, setAdvancingId] = useState(null);
  const [emitindoOpId, setEmitindoOpId] = useState(null);
  const [etiquetaExpedicao, setEtiquetaExpedicao] = useState(null);
  const [grupoMap, setGrupoMap] = useState({});

  const load = async () => {
    const [exps, ordens, pedidos, gps] = await Promise.all([
      base44.entities.Expedicao.list('-created_date'),
      base44.entities.OrdemProducao.list('-created_date'),
      base44.entities.Pedido.list(),
      base44.entities.GrupoPedidos.list().catch(() => []),
    ]);

    setExpedicoes(exps);

    const expPedidoIds = new Set(exps.map(e => e.pedido_id).filter(Boolean));

    const finalizadas = ordens.filter(o => {
      if (o.status !== 'finalizado') return false;
      if (!o.pedido_id) return false;
      return !expPedidoIds.has(o.pedido_id);
    });

    setOpsFinalizadas(finalizadas);

    const pm = {};
    for (const p of pedidos) pm[p.id] = { nome: p.cliente_nome, cliente_id: p.cliente_id, itens: p.itens, valor_total: p.valor_total, numero: p.numero };
    setPedidoMap(pm);

    const gm = {};
    for (const g of gps.filter(g => g.status !== 'desfeito')) {
      for (const pid of (g.pedidos_ids || [])) gm[pid] = g;
    }
    setGrupoMap(gm);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const onSettings = () => setColunasExp(buildColunasExp());
    window.addEventListener('expedicao:settings:saved', onSettings);
    return () => window.removeEventListener('expedicao:settings:saved', onSettings);
  }, []);

  const emitirNFdaOP = async (op) => {
    setEmitindoOpId(op.id);
    const numero_nf = gerarNumero('NF');
    const hoje = new Date().toISOString().split('T')[0];
    const pedInfo = op.pedido_id ? pedidoMap[op.pedido_id] : null;

    const expedicao = await base44.entities.Expedicao.create({
      numero_nf,
      pedido_id: op.pedido_id || '',
      pedido_numero: pedInfo?.numero || op.pedido_numero || '',
      cliente_nome: pedInfo?.nome || op.produto_nome,
      ordem_producao_id: op.id,
      itens: pedInfo?.itens || op.itens || [{ produto_nome: op.produto_nome, quantidade: op.quantidade }],
      status: 'emitida',
      data_emissao: hoje,
      valor_total: pedInfo?.valor_total || 0,
    });

    if (op.pedido_id) {
      await base44.entities.Pedido.update(op.pedido_id, { status: 'expedido' });
    }

    await registrarLog('Expedicao', expedicao.id, 'EXPEDICAO_CRIADA', `NF ${numero_nf} emitida manualmente da OP ${op.numero}`);

    const waCfg = getWhatsappExpedicaoConfig();
    const waKanban = getWhatsappKanbanConfig();
    if (waCfg.etapas_notificar.includes('nf_emitida')) {
      let clienteTelefone = null;
      if (waCfg.notificar_cliente) {
        const clienteId = pedInfo?.cliente_id || op.cliente_id || null;
        if (clienteId) {
          const clientes = await base44.entities.Cliente.filter({ id: clienteId });
          clienteTelefone = clientes[0]?.telefone || null;
        }
      }
      base44.functions.invoke('enviarWhatsappExpedicao', {
        expedicao: { numero_nf, cliente_nome: pedInfo?.nome || op.produto_nome, pedido_numero: pedInfo?.numero || op.pedido_numero || '' },
        novoStatus: 'nf_emitida',
        clienteTelefone: waCfg.notificar_cliente ? clienteTelefone : null,
        numeros_internos: waKanban.numeros_internos || [],
        msg_interno: waCfg.msg_interno,
        msg_cliente: waCfg.msg_cliente,
      }).catch(() => {});
    }

    await load();
    setEmitindoOpId(null);
  };

  const criarExpedicao = async ({ pedidoId, transportadora, observacoes }) => {
    const pedInfo = pedidoMap[pedidoId];
    if (!pedInfo) return;
    setLoadingForm(true);
    const numero_nf = gerarNumero('NF');
    const hoje = new Date().toISOString().split('T')[0];

    const expedicao = await base44.entities.Expedicao.create({
      numero_nf, pedido_id: pedidoId,
      pedido_numero: pedInfo.numero,
      cliente_nome: pedInfo.nome,
      itens: pedInfo.itens || [],
      status: 'emitida', data_emissao: hoje,
      transportadora, valor_total: pedInfo.valor_total || 0, observacoes,
    });

    await base44.entities.Pedido.update(pedidoId, { status: 'expedido' });
    await registrarLog('Expedicao', expedicao.id, 'EMISSAO', `NF ${numero_nf} emitida manualmente`);
    await load();
    setLoadingForm(false);
    setShowForm(false);
  };

  const atualizarStatus = async (id, status) => {
    setAdvancingId(id);
    const updates = { status };
    if (status === 'enviada') updates.data_envio = new Date().toISOString().split('T')[0];
    if (status === 'entregue') updates.data_entrega = new Date().toISOString().split('T')[0];
    await base44.entities.Expedicao.update(id, updates);
    await registrarLog('Expedicao', id, 'STATUS', `Status atualizado para ${status}`);

    const waCfg = getWhatsappExpedicaoConfig();
    const waKanban = getWhatsappKanbanConfig();
    if (waCfg.etapas_notificar.includes(status)) {
      const expAtual = expedicoes.find(e => e.id === id);
      let clienteTelefone = null;
      if (waCfg.notificar_cliente) {
        const clienteId = expAtual?.cliente_id || (expAtual?.pedido_id ? pedidoMap[expAtual.pedido_id]?.cliente_id : null);
        if (clienteId) {
          const clientes = await base44.entities.Cliente.filter({ id: clienteId });
          clienteTelefone = clientes[0]?.telefone || null;
        }
      }
      base44.functions.invoke('enviarWhatsappExpedicao', {
        expedicao: { numero_nf: expAtual?.numero_nf || id, cliente_nome: expAtual?.cliente_nome || '', pedido_numero: expAtual?.pedido_numero || '' },
        novoStatus: status,
        clienteTelefone: waCfg.notificar_cliente ? clienteTelefone : null,
        numeros_internos: waKanban.numeros_internos || [],
        msg_interno: waCfg.msg_interno,
        msg_cliente: waCfg.msg_cliente,
      }).catch(() => {});
    }

    await load();
    setAdvancingId(null);
  };

  const imprimirDANFE = (exp) => {
    const html = gerarDANFEHTML(exp, {
      nome: 'RAIO DO SOL',
      cnpj: '00000000000000',
      endereco: 'Velas e Cosméticos - Fone: (11) 9999-9999'
    });
    const win = window.open('', '_blank', 'width=960,height=1200');
    win.document.write(html);
    win.document.close();
  };

  const expFiltradas = useMemo(() => {
    if (!busca) return expedicoes;
    const b = busca.toLowerCase();
    return expedicoes.filter(e =>
      e.numero_nf?.toLowerCase().includes(b) ||
      e.cliente_nome?.toLowerCase().includes(b) ||
      e.pedido_numero?.toLowerCase().includes(b)
    );
  }, [expedicoes, busca]);

  const opsFiltradas = useMemo(() => {
    if (!busca) return opsFinalizadas;
    const b = busca.toLowerCase();
    return opsFinalizadas.filter(o =>
      o.produto_nome?.toLowerCase().includes(b) ||
      o.numero?.toLowerCase().includes(b) ||
      o.pedido_numero?.toLowerCase().includes(b)
    );
  }, [opsFinalizadas, busca]);

  const counts = colunasExp.reduce((acc, col) => {
    acc[col.key] = col.key === 'a_expedir'
      ? opsFinalizadas.length
      : expedicoes.filter(e => e.status === col.key).length;
    return acc;
  }, {});

  const pedidosDisponiveis = Object.entries(pedidoMap)
    .filter(([id]) => !expedicoes.some(e => e.pedido_id === id))
    .map(([id, info]) => ({ id, ...info }));

  return (
    <div className="flex flex-col h-full space-y-4">
      <AlertaSeparacao />

      {/* Header */}
      <div className="bg-card border border-border rounded-2xl px-5 py-4 flex-shrink-0">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 flex items-center justify-center">
              <Truck size={19} className="text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Expedição</h2>
              <p className="text-xs text-muted-foreground">
                {counts.a_expedir} a expedir · {counts.emitida} emitida · {counts.enviada} em trânsito · {counts.entregue} entregue
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={busca} onChange={e => setBusca(e.target.value)}
                placeholder="Buscar NF, OP, cliente..."
                className="border border-border rounded-xl pl-8 pr-8 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary w-52" />
              {busca && (
                <button onClick={() => setBusca('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X size={13} />
                </button>
              )}
            </div>
            <button onClick={load} className="p-2.5 border border-border rounded-xl hover:bg-muted transition-colors">
              <RefreshCw size={15} className="text-muted-foreground" />
            </button>
            {!readonly && (
              <button onClick={() => setShowForm(true)}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm">
                <Plus size={16} /> Nova NF
              </button>
            )}
          </div>
        </div>

        {/* Progress summary */}
        <div className="mt-4 grid gap-2" style={{ gridTemplateColumns: `repeat(${colunasExp.length}, 1fr)` }}>
          {colunasExp.map(col => (
            <div key={col.key} className="text-center">
              <div className="h-1.5 rounded-full mb-1.5 overflow-hidden bg-muted">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: counts[col.key] > 0 ? '100%' : '0%', background: col.accent }} />
              </div>
              <p className="text-lg font-bold text-foreground">{counts[col.key]}</p>
              <p className="text-[10px] text-muted-foreground leading-tight hidden sm:block">{col.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Kanban integrado */}
      <div className="flex gap-4 overflow-x-auto pb-4 flex-1 items-start">
        {colunasExp.map((coluna) => {
          const Icon = coluna.icon;
          const isAExpedir = coluna.key === 'a_expedir';
          const cards = isAExpedir ? opsFiltradas : expFiltradas.filter(e => e.status === coluna.key);
          const count = counts[coluna.key];

          // Build group structure for this column
          const gruposNaColuna = {};
          const naoAgrupados = [];
          for (const card of cards) {
            const grupo = grupoMap[card.pedido_id];
            if (grupo) {
              if (!gruposNaColuna[grupo.id]) gruposNaColuna[grupo.id] = { grupo, cards: [] };
              gruposNaColuna[grupo.id].cards.push(card);
            } else {
              naoAgrupados.push(card);
            }
          }

          const renderCard = (card) => isAExpedir ? (
            <OPFinalizadaCard
              key={card.id}
              op={card}
              clienteNome={card.pedido_id ? pedidoMap[card.pedido_id]?.nome : null}
              onEmitirNF={readonly ? null : emitirNFdaOP}
              emitindo={emitindoOpId === card.id}
            />
          ) : (
            <ExpedicaoCard
              key={card.id}
              exp={card}
              coluna={coluna}
              advancing={advancingId === card.id}
              onAvancar={readonly ? null : atualizarStatus}
              onImprimirNF={imprimirDANFE}
              onImprimirEtiqueta={readonly ? null : (exp) => setEtiquetaExpedicao(exp)}
              onConfirmarRecebimento={readonly ? null : (exp) => setModalConfirmacao(exp)}
            />
          );

          return (
            <div
              key={coluna.key}
              className="flex-shrink-0 w-80 rounded-2xl flex flex-col overflow-hidden"
              style={{ minHeight: '60vh', background: coluna.bg, border: `1.5px solid ${coluna.border}` }}
            >
              {/* Coluna header */}
              <div className="px-4 py-3 flex items-center justify-between sticky top-0 z-10"
                style={{ background: coluna.bg, borderBottom: `1px solid ${coluna.border}` }}>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: coluna.dot }} />
                  <Icon size={13} style={{ color: coluna.accent }} />
                  <span className="text-xs font-bold tracking-wide" style={{ color: coluna.accent }}>
                    {coluna.label.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{coluna.desc}</span>
                  <span className="text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full text-white"
                    style={{ background: coluna.accent, opacity: count === 0 ? 0.4 : 1 }}>
                    {count}
                  </span>
                </div>
              </div>

              {/* Cards */}
              <div className="flex-1 p-3 overflow-y-auto space-y-3">
                {cards.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 opacity-30">
                    <div className="w-10 h-10 rounded-full border-2 border-dashed flex items-center justify-center mb-2"
                      style={{ borderColor: coluna.accent }}>
                      <Icon size={16} style={{ color: coluna.accent }} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {isAExpedir ? 'Nenhuma OP finalizada' : 'Sem expedições'}
                    </p>
                  </div>
                ) : (
                  <>
                    {Object.values(gruposNaColuna).map(({ grupo, cards: grupoCards }) => (
                      <div key={`grp-${grupo.id}`} className="border border-violet-300 rounded-2xl overflow-hidden">
                        <div className="px-3 py-2 bg-violet-100 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-xs">🔗</span>
                            <span className="text-xs font-bold text-violet-800 truncate">{grupo.cliente_nome}</span>
                            <span className="text-[10px] text-violet-600">{(grupo.pedidos_numeros || []).map(n => `#${n}`).join(' · ')}</span>
                          </div>
                          <span className="text-[10px] bg-violet-200 text-violet-700 px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0">
                            {grupoCards.length} item{grupoCards.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="bg-violet-50/40 p-2 space-y-2">
                          {grupoCards.map(renderCard)}
                        </div>
                      </div>
                    ))}
                    {naoAgrupados.map(renderCard)}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

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
      {etiquetaExpedicao && (
        <EtiquetaEndereco
          expedicao={etiquetaExpedicao}
          onClose={() => setEtiquetaExpedicao(null)}
        />
      )}
    </div>
  );
}