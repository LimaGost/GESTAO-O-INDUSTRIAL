import { useEffect, useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Truck, FileText, CheckCircle, Plus, Search, X, Eye, Send, Printer, ExternalLink, RefreshCw } from 'lucide-react';
import { gerarNumero } from '@/lib/numeracao';
import { registrarLog } from '@/lib/audit';
import ModalConfirmacaoRecebimento from '@/components/expedicao/ModalConfirmacaoRecebimento';
import NovaExpedicaoModal from '@/components/expedicao/NovaExpedicaoModal';
import { usePermissoes } from '@/lib/usePermissoes.jsx';

const COLUNAS = [
  {
    key: 'emitida',
    label: 'Emitida',
    icon: FileText,
    accent: '#3B82F6',
    bg: '#EFF6FF',
    border: '#BFDBFE',
    dot: '#3B82F6',
    desc: 'Aguardando envio',
    proximo: 'enviada',
    proximoLabel: 'Marcar como Enviada',
  },
  {
    key: 'enviada',
    label: 'Em Trânsito',
    icon: Truck,
    accent: '#F59E0B',
    bg: '#FFFBEB',
    border: '#FCD34D',
    dot: '#F59E0B',
    desc: 'Em rota de entrega',
    proximo: 'entregue',
    proximoLabel: 'Confirmar Entrega',
  },
  {
    key: 'entregue',
    label: 'Entregue',
    icon: CheckCircle,
    accent: '#22C55E',
    bg: '#F0FDF4',
    border: '#86EFAC',
    dot: '#22C55E',
    desc: 'Entrega confirmada',
    proximo: null,
    proximoLabel: null,
  },
];

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR');
}
function fmtR(v) {
  return `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

function ExpedicaoKanbanCard({ exp, onAvancar, onImprimirNF, onConfirmarRecebimento, coluna, advancing }) {
  const totalItens = (exp.itens || []).reduce((s, i) => s + (i.quantidade || 0), 0);

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm p-4 space-y-3 hover:shadow-md transition-shadow">
      {/* Header */}
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

      {/* Info */}
      <div className="space-y-1 text-xs text-muted-foreground">
        {exp.pedido_numero && (
          <p>📦 Pedido <strong className="text-foreground">#{exp.pedido_numero}</strong></p>
        )}
        <p>📅 Emissão: <strong className="text-foreground">{fmtDate(exp.data_emissao)}</strong></p>
        {exp.transportadora && (
          <p>🚛 {exp.transportadora}</p>
        )}
        {exp.data_envio && (
          <p>📤 Enviado: <strong className="text-foreground">{fmtDate(exp.data_envio)}</strong></p>
        )}
        {exp.data_entrega && (
          <p>✅ Entregue: <strong className="text-foreground">{fmtDate(exp.data_entrega)}</strong></p>
        )}
        {exp.confirmado_pelo_cliente && (
          <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold text-[10px]">
            ✓ Confirmado pelo cliente
          </span>
        )}
      </div>

      {/* Itens resumo */}
      {(exp.itens || []).length > 0 && (
        <div className="bg-muted/30 rounded-xl px-3 py-2">
          <p className="text-xs text-muted-foreground mb-1 font-semibold">{(exp.itens || []).length} produto(s)</p>
          {exp.itens.slice(0, 2).map((item, i) => (
            <p key={i} className="text-xs text-foreground truncate">{item.produto_nome} × {item.quantidade}</p>
          ))}
          {exp.itens.length > 2 && <p className="text-xs text-muted-foreground">+{exp.itens.length - 2} mais...</p>}
        </div>
      )}

      {/* Ações */}
      <div className="flex gap-2 pt-1">
        <button onClick={() => onImprimirNF(exp)}
          className="flex items-center gap-1.5 text-xs border border-border px-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
          <Printer size={11} /> NF
        </button>

        {exp.status !== 'entregue' && onConfirmarRecebimento && (
          <button onClick={() => onConfirmarRecebimento(exp)}
            className="flex items-center gap-1.5 text-xs border border-border px-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
            <ExternalLink size={11} /> Link
          </button>
        )}

        {coluna.proximo && onAvancar && (
          <button
            onClick={() => onAvancar(exp.id, coluna.proximo)}
            disabled={advancing}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-white transition-all disabled:opacity-50"
            style={{ background: COLUNAS.find(c => c.key === coluna.proximo)?.accent || '#22C55E' }}
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
  const [expedicoes, setExpedicoes] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loadingForm, setLoadingForm] = useState(false);
  const [modalConfirmacao, setModalConfirmacao] = useState(null);
  const [busca, setBusca] = useState('');
  const [advancingId, setAdvancingId] = useState(null);

  const load = async () => {
    const [exps, peds, cls] = await Promise.all([
      base44.entities.Expedicao.list('-created_date'),
      base44.entities.Pedido.list(),
      base44.entities.Cliente.list(),
    ]);
    setExpedicoes(exps);
    const expedidosIds = exps.map(e => e.pedido_id);
    setPedidos(peds.filter(p => p.status === 'separado' && !expedidosIds.includes(p.id)));
    setClientes(cls);
  };

  useEffect(() => { load(); }, []);

  const criarExpedicao = async ({ pedidoId, transportadora, observacoes }) => {
    const ped = pedidos.find(p => p.id === pedidoId);
    if (!ped) return;
    setLoadingForm(true);
    const cliente = clientes.find(c => c.id === ped.cliente_id);
    const numero_nf = gerarNumero('NF');
    const now = new Date().toISOString().split('T')[0];

    const expedicao = await base44.entities.Expedicao.create({
      numero_nf, pedido_id: ped.id, pedido_numero: ped.numero,
      cliente_id: ped.cliente_id, cliente_nome: ped.cliente_nome,
      cliente_cnpj_cpf: cliente?.cnpj_cpf || '',
      cliente_endereco: cliente ? [cliente.endereco, cliente.bairro, cliente.cep ? `CEP ${cliente.cep}` : null,
        cliente.cidade && cliente.estado ? `${cliente.cidade} - ${cliente.estado}` : (cliente.cidade || cliente.estado)
      ].filter(Boolean).join(', ') : '',
      itens: ped.itens || [], status: 'emitida', data_emissao: now,
      transportadora, valor_total: ped.valor_total || 0, observacoes,
    });

    await base44.entities.Pedido.update(ped.id, { status: 'expedido' });
    await registrarLog('Expedicao', expedicao.id, 'EMISSAO', `NF ${numero_nf} emitida para pedido ${ped.numero}`);
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
    await load();
    setAdvancingId(null);
  };

  const imprimirNF = (exp) => {
    const win = window.open('', '_blank', 'width=900,height=1100');
    const hoje = new Date().toLocaleDateString('pt-BR');
    const totalItens = (exp.itens || []).reduce((s, i) => s + (i.quantidade || 0), 0);
    const totalProdutos = (exp.itens || []).length;
    const valorTotal = (exp.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const itensRows = (exp.itens || []).map((item, idx) => `
      <tr style="background:${idx % 2 === 0 ? '#fff' : '#f9f9f9'}">
        <td style="border:1px solid #ccc;padding:5px 8px;font-size:11px;">${String(idx + 1).padStart(3, '0')}</td>
        <td style="border:1px solid #ccc;padding:5px 8px;font-size:11px;">${item.produto_nome || '—'}</td>
        <td style="border:1px solid #ccc;padding:5px 8px;font-size:11px;text-align:center;">UN</td>
        <td style="border:1px solid #ccc;padding:5px 8px;font-size:11px;text-align:center;">${item.quantidade || 0}</td>
        <td style="border:1px solid #ccc;padding:5px 8px;font-size:11px;text-align:right;">R$ ${(item.preco_unitario || 0).toFixed(2)}</td>
        <td style="border:1px solid #ccc;padding:5px 8px;font-size:11px;text-align:right;font-weight:bold;">R$ ${(item.total || 0).toFixed(2)}</td>
      </tr>
    `).join('');

    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>NF-e ${exp.numero_nf}</title>
    <style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:Arial,sans-serif;font-size:11px;color:#111;background:#fff;padding:20px;}.nf{border:2px solid #000;max-width:850px;margin:0 auto;}.secao{border-bottom:1.5px solid #000;padding:8px 10px;}.secao-titulo{font-size:9px;font-weight:bold;color:#666;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;}.campo{border:1px solid #ccc;padding:4px 6px;}.campo-label{font-size:8px;color:#666;text-transform:uppercase;}.campo-valor{font-size:11px;font-weight:bold;color:#111;margin-top:1px;}.header{display:flex;align-items:stretch;border-bottom:2px solid #000;}.header-logo{flex:0 0 200px;padding:12px;border-right:1.5px solid #000;display:flex;flex-direction:column;justify-content:center;}.header-danfe{flex:0 0 160px;padding:10px;border-right:1.5px solid #000;text-align:center;display:flex;flex-direction:column;justify-content:center;align-items:center;}.header-chave{flex:1;padding:10px;display:flex;flex-direction:column;justify-content:center;}.empresa-nome{font-size:15px;font-weight:bold;color:#B45309;}.danfe-titulo{font-size:13px;font-weight:bold;letter-spacing:3px;border:2px solid #000;padding:4px 8px;margin-bottom:6px;}.chave-acesso{font-family:monospace;font-size:10px;background:#f5f5f5;padding:6px;border:1px solid #ccc;word-break:break-all;}.nfe-numero{font-size:13px;font-weight:bold;color:#B45309;margin-top:6px;}table.itens{width:100%;border-collapse:collapse;}table.itens th{background:#333;color:#fff;padding:5px 8px;font-size:10px;text-align:left;border:1px solid #000;}.totais{display:grid;grid-template-columns:1fr 1fr 1fr;}.total-box{border:1px solid #ccc;padding:6px 10px;}.total-label{font-size:9px;color:#666;text-transform:uppercase;}.total-valor{font-size:14px;font-weight:bold;}.total-valor.destaque{color:#B45309;font-size:16px;}</style>
    </head><body><div class="nf">
    <div class="header">
      <div class="header-logo"><div class="empresa-nome">☀️ RAIO DO SOL</div><div style="font-size:9px;color:#666;margin-top:2px;">Indústria e Comércio</div><div style="margin-top:8px;font-size:9px;color:#666;"><div>CNPJ: 00.000.000/0001-00</div><div>IE: 000.000.000.000</div></div></div>
      <div class="header-danfe"><div class="danfe-titulo">DANFE</div><div style="font-size:9px;">Documento Auxiliar da<br/>Nota Fiscal Eletrônica</div><div style="font-size:9px;margin-top:6px;"><div><strong>Modelo:</strong> 55</div><div><strong>Série:</strong> 001</div></div><div class="nfe-numero">Nº ${exp.numero_nf}</div></div>
      <div class="header-chave"><div style="font-size:9px;color:#666;margin-bottom:4px;text-transform:uppercase;font-weight:bold;">Chave de Acesso</div><div class="chave-acesso">${exp.numero_nf.replace(/\D/g,'').padStart(44,'0').replace(/(.{4})/g,'$1 ').trim()}</div><div style="margin-top:10px;font-size:9px;color:#666;"><div><strong>Natureza da Operação:</strong> Venda de Mercadoria</div><div style="margin-top:4px;"><strong>Data de Emissão:</strong> ${exp.data_emissao || hoje}</div></div></div>
    </div>
    <div class="secao"><div class="secao-titulo">Destinatário</div>
      <div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:0;">
        <div class="campo"><div class="campo-label">Nome / Razão Social</div><div class="campo-valor">${exp.cliente_nome}</div></div>
        <div class="campo"><div class="campo-label">CNPJ / CPF</div><div class="campo-valor">${exp.cliente_cnpj_cpf || '—'}</div></div>
        <div class="campo"><div class="campo-label">Data de Emissão</div><div class="campo-valor">${exp.data_emissao || hoje}</div></div>
      </div>
      <div class="campo" style="border-top:none;"><div class="campo-label">Endereço</div><div class="campo-valor">${exp.cliente_endereco || '—'}</div></div>
    </div>
    <div class="secao"><div class="secao-titulo">Dados dos Produtos / Serviços</div>
      <table class="itens"><thead><tr><th style="width:40px;">Nº</th><th>Descrição</th><th style="width:50px;text-align:center;">UN</th><th style="width:60px;text-align:center;">Qtd</th><th style="width:90px;text-align:right;">Vlr. Unit.</th><th style="width:90px;text-align:right;">Vlr. Total</th></tr></thead>
      <tbody>${itensRows}</tbody></table>
    </div>
    <div class="secao"><div class="secao-titulo">Transportador</div>
      <div style="display:grid;grid-template-columns:2fr 1fr;gap:0;">
        <div class="campo"><div class="campo-label">Transportadora</div><div class="campo-valor">${exp.transportadora || 'A definir'}</div></div>
        <div class="campo"><div class="campo-label">Volumes</div><div class="campo-valor">${totalItens} un em ${totalProdutos} produto(s)</div></div>
      </div>
    </div>
    <div class="secao" style="border-bottom:none;"><div class="secao-titulo">Totais</div>
      <div class="totais">
        <div class="total-box"><div class="total-label">Total de Produtos</div><div class="total-valor">R$ ${valorTotal}</div></div>
        <div class="total-box"><div class="total-label">Frete / Seguro</div><div class="total-valor">R$ 0,00</div></div>
        <div class="total-box" style="background:#FEF3C7;"><div class="total-label">Valor Total da NF-e</div><div class="total-valor destaque">R$ ${valorTotal}</div></div>
      </div>
      ${exp.observacoes ? `<div class="campo" style="margin-top:6px;"><div class="campo-label">Observações</div><div class="campo-valor" style="font-weight:normal;">${exp.observacoes}</div></div>` : ''}
      <div style="text-align:center;font-size:9px;color:#999;margin-top:10px;padding-top:8px;border-top:1px solid #eee;">Documento emitido pelo sistema Raio do Sol · ${hoje} · NF-e nº ${exp.numero_nf}</div>
    </div></div>
    <script>window.onload=()=>setTimeout(()=>window.print(),400);<\/script></body></html>`);
    win.document.close();
  };

  const expedicoesFiltradas = useMemo(() => {
    if (!busca) return expedicoes;
    const b = busca.toLowerCase();
    return expedicoes.filter(exp =>
      exp.numero_nf?.toLowerCase().includes(b) ||
      exp.cliente_nome?.toLowerCase().includes(b) ||
      exp.pedido_numero?.toLowerCase().includes(b)
    );
  }, [expedicoes, busca]);

  const counts = useMemo(() => ({
    emitida: expedicoes.filter(e => e.status === 'emitida').length,
    enviada: expedicoes.filter(e => e.status === 'enviada').length,
    entregue: expedicoes.filter(e => e.status === 'entregue').length,
  }), [expedicoes]);

  return (
    <div className="flex flex-col h-full space-y-4">
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
                {counts.emitida} emitida · {counts.enviada} em trânsito · {counts.entregue} entregue
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Busca inline */}
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={busca} onChange={e => setBusca(e.target.value)}
                placeholder="Buscar NF, cliente..."
                className="border border-border rounded-xl pl-8 pr-8 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary w-52" />
              {busca && (
                <button onClick={() => setBusca('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X size={13} />
                </button>
              )}
            </div>
            {!readonly ? (
              <button onClick={() => setShowForm(true)}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm">
                <Plus size={16} /> Nova Expedição
              </button>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-3 py-2 rounded-xl">
                <Eye size={13} /> Somente visualização
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4 flex-1 items-start">
        {COLUNAS.map((coluna) => {
          const cards = expedicoesFiltradas.filter(e => e.status === coluna.key);
          const Icon = coluna.icon;
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
                    style={{ background: coluna.accent, opacity: cards.length === 0 ? 0.4 : 1 }}>
                    {counts[coluna.key]}
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
                    <p className="text-xs text-muted-foreground">Sem expedições</p>
                  </div>
                ) : (
                  cards.map(exp => (
                    <ExpedicaoKanbanCard
                      key={exp.id}
                      exp={exp}
                      coluna={coluna}
                      advancing={advancingId === exp.id}
                      onAvancar={readonly ? null : atualizarStatus}
                      onImprimirNF={imprimirNF}
                      onConfirmarRecebimento={readonly ? null : (exp) => setModalConfirmacao(exp)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showForm && (
        <NovaExpedicaoModal pedidos={pedidos} loading={loadingForm} onCriar={criarExpedicao} onClose={() => setShowForm(false)} />
      )}
      {modalConfirmacao && (
        <ModalConfirmacaoRecebimento
          expedicao={modalConfirmacao}
          onClose={() => setModalConfirmacao(null)}
          onConfirmed={() => { setModalConfirmacao(null); load(); }}
        />
      )}
    </div>
  );
}