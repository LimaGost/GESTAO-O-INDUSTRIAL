import { useEffect, useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { gerarDANFEHTML } from '@/lib/danfeGenerator';
import { gerarDocumentoTransporteHTML } from '@/lib/documentoTransporte';
import { Truck, FileText, CheckCircle, Plus, Search, X, Send, Printer, ExternalLink, RefreshCw, Package, ArrowRight, Eye, Tag, MapPin, Factory, Building2, Home } from 'lucide-react';
import { getDestinoLabel, DestinoBadge } from '@/components/pedidos/DestinoPedido';
import { gerarNumero } from '@/lib/numeracao';
import { registrarLog } from '@/lib/audit';
import ModalConfirmacaoRecebimento from '@/components/expedicao/ModalConfirmacaoRecebimento';
import NovaExpedicaoModal from '@/components/expedicao/NovaExpedicaoModal';
import { usePermissoes } from '@/lib/usePermissoes.jsx';
import { loadConfig } from '@/lib/appConfig';
import AlertaSeparacao from '@/components/expedicao/AlertaSeparacao';
import ModalItensPedido from '@/components/expedicao/ModalItensPedido';
const EXP_COLUNAS_DEFAULT = [
  { key: 'a_expedir', label: 'A Expedir',    cor: 4, desc: 'OPs prontas para NF',     fixo: true },
  { key: 'emitida',   label: 'NF Emitida',   cor: 1, desc: 'Aguardando envio',         fixo: true },
  { key: 'enviada',   label: 'Em Trânsito',  cor: 3, desc: 'Em rota de entrega',       fixo: true },
  { key: 'entregue',  label: 'Entregue',     cor: 2, desc: 'Entrega confirmada',       fixo: true },
];

// Lê configs do localStorage (mantido sincronizado com o banco por AbaWhatsapp/AbaExpedicao)
function getWhatsappExpedicaoConfig() {
  try { return JSON.parse(localStorage.getItem('whatsapp_expedicao_config') || 'null') || { etapas_notificar: ['enviada','entregue'], notificar_cliente: true }; } catch { return { etapas_notificar: ['enviada','entregue'], notificar_cliente: true }; }
}
function getWhatsappKanbanConfig() {
  try { return JSON.parse(localStorage.getItem('whatsapp_kanban_config') || 'null') || { numeros_internos: [] }; } catch { return { numeros_internos: [] }; }
}
import EtiquetaEndereco from '@/components/expedicao/EtiquetaEndereco';
import PainelExpedicaoRapida from '@/components/expedicao/PainelExpedicaoRapida';

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

function buildColunasFromConfig(config) {
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

function buildColunasExp() {
  try {
    const local = JSON.parse(localStorage.getItem('expedicao_colunas_config') || 'null');
    if (local && Array.isArray(local) && local.length > 0) return buildColunasFromConfig(local);
  } catch {}
  return buildColunasFromConfig(EXP_COLUNAS_DEFAULT);
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d.includes('T') ? d : d + 'T12:00:00').toLocaleDateString('pt-BR');
}
function fmtR(v) {
  return `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

// Card para OPs finalizadas (ainda sem NF)
function OPFinalizadaCard({ op, clienteNome, onEmitirNF, emitindo, onVerPedido }) {
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
          <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-semibold">{op._origem === 'pedido' ? 'Separado' : 'Finalizado'}</span>
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

      <div className="flex gap-2">
        {onVerPedido && op.pedido_id && (
          <button
            onClick={() => onVerPedido(op.pedido_id)}
            className="flex items-center gap-1.5 text-xs border border-border px-2.5 py-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
          >
            <Eye size={11} /> Ver Pedido
          </button>
        )}
        {onEmitirNF && (
          <button
            onClick={() => onEmitirNF(op)}
            disabled={emitindo}
            className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold px-3 py-2 rounded-xl text-white transition-all disabled:opacity-50"
            style={{ background: '#A855F7' }}
          >
            {emitindo ? <RefreshCw size={13} className="animate-spin" /> : <ArrowRight size={13} />}
            Emitir NF
          </button>
        )}
      </div>
    </div>
  );
}

// Card para expedições existentes
function ExpedicaoCard({ exp, coluna, onAvancar, onImprimirNF, onImprimirEtiqueta, onConfirmarRecebimento, advancing, onVerPedido, onImprimirDocTransporte }) {
  const totalItens = (exp.itens || []).reduce((s, i) => s + (i.quantidade || 0), 0);
  const isWL = exp._pedidoDestino?.white_label || exp.white_label;

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <div className="px-4 pt-4 pb-3 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">NF {exp.numero_nf}</p>
              {isWL && <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-bold">WL</span>}
            </div>
            <p className="text-sm font-bold text-foreground leading-tight truncate">{exp.cliente_nome}</p>
            {exp.pedido_numero && (
              <p className="text-xs text-muted-foreground mt-0.5">Pedido <span className="font-semibold text-foreground">#{exp.pedido_numero}</span></p>
            )}
          </div>
          <div className="flex-shrink-0 text-right">
            <p className="text-sm font-bold text-foreground">{fmtR(exp.valor_total)}</p>
            <p className="text-[10px] text-muted-foreground">{totalItens} un</p>
          </div>
        </div>
      </div>

      {/* Detalhes */}
      <div className="px-4 pb-3 space-y-1.5">
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>📅 {fmtDate(exp.data_emissao)}</span>
          {exp._pedidoDestino?.data_entrega_prevista && <span>🗓 Prev. {fmtDate(exp._pedidoDestino.data_entrega_prevista)}</span>}
          {exp.transportadora && <span>🚛 {exp.transportadora}</span>}
          {exp.data_envio && <span>📤 {fmtDate(exp.data_envio)}</span>}
          {exp.data_entrega && <span>✅ {fmtDate(exp.data_entrega)}</span>}
          {exp._opNumero && <span>🏭 OP {exp._opNumero}</span>}
        </div>
        {exp._pedidoDestino && <DestinoBadge pedido={exp._pedidoDestino} />}

        {exp.confirmado_pelo_cliente && (
          <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold text-[10px]">
            ✓ Confirmado pelo cliente
          </span>
        )}

        {(exp.itens || []).length > 0 && (
          <div className="bg-muted/30 rounded-lg px-2.5 py-2 mt-1">
            {exp.itens.slice(0, 2).map((item, i) => (
              <p key={i} className="text-xs text-foreground truncate">{item.produto_nome} × {item.quantidade}</p>
            ))}
            {exp.itens.length > 2 && <p className="text-xs text-muted-foreground">+{exp.itens.length - 2} mais...</p>}
          </div>
        )}
      </div>

      {/* Ações */}
      <div className="border-t border-border px-4 py-3 space-y-2">
        {/* Linha 1: ações secundárias */}
        <div className="flex gap-1.5 flex-wrap">
          <button onClick={() => onImprimirDocTransporte(exp)}
            className="flex items-center gap-1 text-xs border border-blue-200 bg-blue-50 text-blue-700 px-2.5 py-2 rounded-lg hover:bg-blue-100 transition-colors font-medium">
            <FileText size={11} /> Doc. Transporte
          </button>

          {onImprimirEtiqueta && (
            <button onClick={() => onImprimirEtiqueta(exp)}
              className="flex items-center gap-1 text-xs border border-border px-2.5 py-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
              <Tag size={11} /> Etiqueta
            </button>
          )}

          {exp.pedido_id && onVerPedido && (
            <button onClick={() => onVerPedido(exp.pedido_id)}
              className="flex items-center gap-1 text-xs border border-primary/30 bg-primary/5 text-primary px-2.5 py-2 rounded-lg hover:bg-primary/10 transition-colors font-medium">
              <Eye size={11} /> Pedido
            </button>
          )}
        </div>

        {/* Linha 2: ações primárias (full width) */}
        <div className="flex flex-col gap-2">
          {exp.status !== 'entregue' && onConfirmarRecebimento && (
            <button onClick={() => onConfirmarRecebimento(exp)}
              className="w-full flex items-center justify-center gap-1.5 text-xs border border-green-200 bg-green-50 text-green-700 px-3 py-2 rounded-lg hover:bg-green-100 transition-colors font-semibold">
              <CheckCircle size={11} /> Confirmar Recebimento
            </button>
          )}

          {coluna?.proximo && onAvancar && (
            <button
              onClick={() => onAvancar(exp.id, coluna.proximo)}
              disabled={advancing}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg text-white transition-all disabled:opacity-50"
              style={{ background: '#22C55E' }}
            >
              {advancing ? <RefreshCw size={11} className="animate-spin" /> : <Send size={11} />}
              {coluna.proximoLabel}
            </button>
          )}
        </div>
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
  const [pedidosSeparados, setPedidosSeparados] = useState([]);
  const [aba, setAba] = useState('kanban'); // 'kanban' | 'rapida'
  const [pedidoDetalhes, setPedidoDetalhes] = useState(null);
  const [filtroDestino, setFiltroDestino] = useState('todos');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [etapaMobile, setEtapaMobile] = useState('a_expedir');

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const load = async () => {
    const [exps, ordens, pedidos] = await Promise.all([
      base44.entities.Expedicao.list('-created_date'),
      base44.entities.OrdemProducao.list('-created_date'),
      base44.entities.Pedido.list(),
    ]);
    setExpedicoes(exps);

    const expPedidoIds = new Set(exps.map(e => e.pedido_id).filter(Boolean));

    const finalizadas = ordens.filter(o => {
      if (!['finalizado', 'producao_finalizada'].includes(o.status)) return false;
      if (!o.pedido_id) return false;
      return !expPedidoIds.has(o.pedido_id);
    });

    // Pedidos liberados pela Separação (status 'separado') sem expedição ainda
    const pedidosSeparadosParaExpedir = pedidos.filter(p =>
      p.status === 'separado' && !expPedidoIds.has(p.id)
    ).map(p => ({
      _origem: 'pedido',
      id: `ped_${p.id}`,
      pedido_id: p.id,
      numero: p.numero,
      pedido_numero: p.numero,
      produto_nome: p.cliente_nome,
      itens: p.itens || [],
      data_finalizacao: p.updated_date,
      quantidade: (p.itens || []).reduce((s, i) => s + (i.quantidade || 0), 0),
    }));

    setOpsFinalizadas([...finalizadas, ...pedidosSeparadosParaExpedir]);

    const pm = {};
    for (const p of pedidos) pm[p.id] = {
      nome: p.cliente_nome,
      cliente_id: p.cliente_id,
      itens: p.itens,
      valor_total: p.valor_total,
      numero: p.numero,
      destino_tipo: p.destino_tipo,
      destino_unidade: p.destino_unidade,
      destino_transportadora: p.destino_transportadora,
      destino_endereco: p.destino_endereco,
      white_label: p.white_label,
      data_entrega_prevista: p.data_entrega_prevista,
      op_numero: ordens.find(o => o.pedido_id === p.id)?.numero || null,
    };
    setPedidoMap(pm);

    setPedidosSeparados(pedidos.filter(p => p.status === 'separado'));

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
      ordem_producao_id: op._origem === 'pedido' ? '' : op.id,
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

  const abrirPedido = async (pedidoId) => {
    const pedidos = await base44.entities.Pedido.filter({ id: pedidoId });
    if (pedidos[0]) setPedidoDetalhes(pedidos[0]);
  };

  const imprimirDocumentoTransporte = async (exp) => {
    // Busca pedido e empresa completos para enriquecer o documento
    let pedido = null;
    let op = null;
    let cliente = null;
    if (exp.pedido_id) {
      const ps = await base44.entities.Pedido.filter({ id: exp.pedido_id });
      pedido = ps[0] || null;
    }
    if (exp.ordem_producao_id) {
      const ops = await base44.entities.OrdemProducao.filter({ id: exp.ordem_producao_id });
      op = ops[0] || null;
    }
    if (pedido?.cliente_id) {
      const cs = await base44.entities.Cliente.filter({ id: pedido.cliente_id });
      cliente = cs[0] || null;
    }
    const empresaConfig = (await loadConfig('empresa_config')) || {};
    const emitente = {
      nome: empresaConfig.nome || 'RAIO DO SOL',
      nome_fantasia: empresaConfig.nome_fantasia || '',
      cnpj: empresaConfig.cnpj || '00.000.000/0000-00',
      endereco: empresaConfig.endereco || '',
      telefone: empresaConfig.telefone || '',
      logo_url: empresaConfig.logo_url || '',
    };
    const html = gerarDocumentoTransporteHTML(exp, emitente, pedido, op, cliente);
    const win = window.open('', '_blank', 'width=960,height=1200');
    win.document.write(html);
    win.document.close();
  };

  const expFiltradas = useMemo(() => {
    let list = expedicoes.map(e => {
      const pm = e.pedido_id ? pedidoMap[e.pedido_id] : null;
      return {
        ...e,
        _pedidoDestino: pm?.destino_tipo
          ? { destino_tipo: pm.destino_tipo, destino_unidade: pm.destino_unidade, destino_transportadora: pm.destino_transportadora, destino_endereco: pm.destino_endereco, white_label: pm.white_label, data_entrega_prevista: pm.data_entrega_prevista }
          : null,
        _opNumero: pm?.op_numero || null,
      };
    });
    if (busca) {
      const b = busca.toLowerCase();
      list = list.filter(e =>
        e.numero_nf?.toLowerCase().includes(b) ||
        e.cliente_nome?.toLowerCase().includes(b) ||
        e.pedido_numero?.toLowerCase().includes(b)
      );
    }
    if (filtroDestino !== 'todos') {
      list = list.filter(e => pedidoMap[e.pedido_id]?.destino_tipo === filtroDestino);
    }
    return list;
  }, [expedicoes, busca, filtroDestino, pedidoMap]);

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

  const renderCardKanban = (coluna, card) => coluna.key === 'a_expedir' ? (
    <OPFinalizadaCard
      key={card.id}
      op={card}
      clienteNome={card.pedido_id ? pedidoMap[card.pedido_id]?.nome : null}
      onEmitirNF={readonly ? null : emitirNFdaOP}
      emitindo={emitindoOpId === card.id}
      onVerPedido={abrirPedido}
    />
  ) : (
    <ExpedicaoCard
      key={card.id}
      exp={card}
      coluna={coluna}
      advancing={advancingId === card.id}
      onAvancar={readonly ? null : atualizarStatus}
      onImprimirNF={imprimirDANFE}
      onImprimirDocTransporte={imprimirDocumentoTransporte}
      onImprimirEtiqueta={readonly ? null : (exp) => setEtiquetaExpedicao(exp)}
      onConfirmarRecebimento={readonly ? null : (exp) => setModalConfirmacao(exp)}
      onVerPedido={abrirPedido}
    />
  );

  return (
    <div className="flex flex-col h-full space-y-4">
      <AlertaSeparacao />

      {/* Header */}
      <div className="bg-card border border-border rounded-2xl px-4 md:px-5 py-4 flex-shrink-0">
        <div className="flex items-center justify-between flex-wrap gap-2 md:gap-3">
          <div className="hidden md:flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 flex items-center justify-center flex-shrink-0">
              <Truck size={19} className="text-purple-600" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-foreground">Expedição</h2>
              <p className="text-xs text-muted-foreground leading-snug">
                {counts.a_expedir} a expedir · {counts.emitida} emitida · {counts.enviada} em trânsito · {counts.entregue} entregue
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:flex-none">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={busca} onChange={e => setBusca(e.target.value)}
                placeholder="Buscar NF, OP, cliente..."
                className="border border-border rounded-xl pl-8 pr-8 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary w-full md:w-52" />
              {busca && (
                <button onClick={() => setBusca('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X size={13} />
                </button>
              )}
            </div>
            <button onClick={load} className="p-2.5 border border-border rounded-xl hover:bg-muted transition-colors flex-shrink-0">
              <RefreshCw size={15} className="text-muted-foreground" />
            </button>
            {!readonly && (
              <button onClick={() => setShowForm(true)}
                className="flex items-center gap-1.5 md:gap-2 bg-primary text-primary-foreground px-3 md:px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm flex-shrink-0 whitespace-nowrap">
                <Plus size={16} /> <span className="hidden sm:inline">Nova NF</span><span className="sm:hidden">NF</span>
              </button>
            )}
          </div>
        </div>

        {/* Filtro por destino */}
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 flex-nowrap md:flex-wrap">
          {[
            { k: 'todos', l: '📦 Todos' },
            { k: 'retirada_fabrica', l: '🏭 Retirada Fábrica' },
            { k: 'retirada_unidade', l: '🏢 Retirada Unidade' },
            { k: 'transportadora', l: '🚛 Transportadora' },
            { k: 'entrega_cliente', l: '🏠 Entrega Cliente' },
          ].map(f => (
            <button key={f.k} onClick={() => setFiltroDestino(f.k)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex-shrink-0 whitespace-nowrap ${filtroDestino === f.k ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-border'}`}>
              {f.l}
            </button>
          ))}
        </div>

        {/* Abas */}
        <div className="mt-3 flex gap-2 border-b border-border pb-1 overflow-x-auto">
          <button
            onClick={() => setAba('kanban')}
            className={`text-xs font-semibold px-4 py-2.5 rounded-t-lg transition-colors border-b-2 flex-shrink-0 whitespace-nowrap ${aba === 'kanban' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            📦 Kanban Expedição
          </button>
          <button
            onClick={() => setAba('rapida')}
            className={`flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-t-lg transition-colors border-b-2 flex-shrink-0 whitespace-nowrap ${aba === 'rapida' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            🏷️ Etiquetas em Lote
            {pedidosSeparados.length > 0 && (
              <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold">{pedidosSeparados.length}</span>
            )}
          </button>
        </div>

        {/* Progress summary — apenas no kanban */}
        {aba === 'kanban' && <div className="mt-3 hidden md:grid gap-2" style={{ gridTemplateColumns: `repeat(${colunasExp.length}, 1fr)` }}>
          {colunasExp.map(col => (
            <div key={col.key} className="text-center">
              <div className="h-1.5 rounded-full mb-1.5 overflow-hidden bg-muted">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: counts[col.key] > 0 ? '100%' : '0%', background: col.accent }} />
              </div>
              <p className="text-base md:text-lg font-bold text-foreground">{counts[col.key]}</p>
              <p className="text-[10px] text-muted-foreground leading-tight hidden sm:block">{col.label}</p>
            </div>
          ))}
        </div>}
      </div>

      {/* Painel Etiquetas em Lote */}
      {aba === 'rapida' && (
        <div className="flex-1 bg-card border border-border rounded-2xl p-5 overflow-auto">
          <PainelExpedicaoRapida pedidos={pedidosSeparados} />
        </div>
      )}

      {/* Visão Mobile: lista vertical por etapa */}
      {aba === 'kanban' && isMobile && (
        <div className="flex-1 min-h-0 flex flex-col">
          {/* Seletor de etapas */}
          <div className="flex gap-2 overflow-x-auto pb-2 flex-shrink-0">
            {colunasExp.map(col => {
              const ativo = etapaMobile === col.key;
              return (
                <button key={col.key} onClick={() => setEtapaMobile(col.key)}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold flex-shrink-0 whitespace-nowrap border transition-all"
                  style={ativo
                    ? { background: col.accent, borderColor: col.accent, color: '#fff' }
                    : { background: '#fff', borderColor: '#E2E8F0', color: '#64748B' }}>
                  {col.label}
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                    style={ativo
                      ? { background: 'rgba(255,255,255,0.3)', color: '#fff' }
                      : { background: `${col.accent}20`, color: col.accent }}>
                    {counts[col.key]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Lista de cards da etapa selecionada */}
          {(() => {
            const coluna = colunasExp.find(c => c.key === etapaMobile) || colunasExp[0];
            const Icon = coluna.icon;
            const cards = coluna.key === 'a_expedir' ? opsFiltradas : expFiltradas.filter(e => e.status === coluna.key);
            return (
              <div className="flex-1 overflow-y-auto space-y-3 pb-4">
                {cards.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 opacity-40">
                    <div className="w-12 h-12 rounded-full border-2 border-dashed flex items-center justify-center mb-2"
                      style={{ borderColor: coluna.accent }}>
                      <Icon size={18} style={{ color: coluna.accent }} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {coluna.key === 'a_expedir' ? 'Nenhuma OP finalizada' : 'Sem expedições nesta etapa'}
                    </p>
                  </div>
                ) : (
                  cards.map(card => renderCardKanban(coluna, card))
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Kanban desktop */}
      {aba === 'kanban' && !isMobile && <div className="flex gap-4 overflow-x-auto pb-4 flex-1 min-h-0 items-start">
        {colunasExp.map((coluna) => {
          const Icon = coluna.icon;
          const isAExpedir = coluna.key === 'a_expedir';
          const cards = isAExpedir ? opsFiltradas : expFiltradas.filter(e => e.status === coluna.key);
          const count = counts[coluna.key];

          const renderCard = (card) => renderCardKanban(coluna, card);

          return (
            <div
              key={coluna.key}
              className="flex-shrink-0 w-80 rounded-2xl flex flex-col overflow-hidden"
              style={{ height: 'calc(100vh - 320px)', minHeight: '420px', background: coluna.bg, border: `1.5px solid ${coluna.border}` }}
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
                  <span className="text-xs text-muted-foreground hidden lg:inline">{coluna.desc}</span>
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
                  cards.map(renderCard)
                )}
              </div>
            </div>
          );
        })}
      </div>}

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
      {pedidoDetalhes && (
        <ModalItensPedido
          pedido={pedidoDetalhes}
          onClose={() => setPedidoDetalhes(null)}
        />
      )}
    </div>
  );
}