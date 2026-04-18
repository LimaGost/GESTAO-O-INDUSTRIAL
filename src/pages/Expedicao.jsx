import { useEffect, useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Truck, FileText, CheckCircle, Plus, Printer, Package, Search, Send, X, Eye } from 'lucide-react';
import { gerarNumero } from '@/lib/numeracao';
import { registrarLog } from '@/lib/audit';
import ModalConfirmacaoRecebimento from '@/components/expedicao/ModalConfirmacaoRecebimento';
import NovaExpedicaoModal from '@/components/expedicao/NovaExpedicaoModal';
import ExpedicaoCard from '@/components/expedicao/ExpedicaoCard';
import { usePermissoes } from '@/lib/usePermissoes.jsx';

export default function Expedicao() {
  const { somenteLeitura } = usePermissoes();
  const readonly = somenteLeitura('Expedicao');
  const [expedicoes, setExpedicoes] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modalConfirmacao, setModalConfirmacao] = useState(null);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todas');
  const [filtroPeriodo, setFiltroPeriodo] = useState('todos');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const PERIODOS = [
    { key: 'todos', label: 'Todos' }, { key: 'hoje', label: 'Hoje' },
    { key: '7dias', label: '7 dias' }, { key: '30dias', label: '30 dias' },
    { key: 'mes', label: 'Este mês' }, { key: 'custom', label: 'Personalizado' },
  ];

  const getDateRange = () => {
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    if (filtroPeriodo === 'hoje') return { de: hoje, ate: new Date() };
    if (filtroPeriodo === '7dias') { const d = new Date(hoje); d.setDate(d.getDate()-6); return { de: d, ate: new Date() }; }
    if (filtroPeriodo === '30dias') { const d = new Date(hoje); d.setDate(d.getDate()-29); return { de: d, ate: new Date() }; }
    if (filtroPeriodo === 'mes') { const d = new Date(hoje.getFullYear(), hoje.getMonth(), 1); return { de: d, ate: new Date() }; }
    if (filtroPeriodo === 'custom' && dataInicio) return { de: new Date(dataInicio+'T00:00:00'), ate: dataFim ? new Date(dataFim+'T23:59:59') : new Date() };
    return null;
  };

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
    setLoading(true);
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
    setLoading(false);
    setShowForm(false);
  };

  const atualizarStatus = async (id, status) => {
    await base44.entities.Expedicao.update(id, { status, data_entrega: status === 'entregue' ? new Date().toISOString().split('T')[0] : undefined });
    await registrarLog('Expedicao', id, 'STATUS', `Status atualizado para ${status}`);
    await load();
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

    win.document.write(`<!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8"/>
      <title>NF-e ${exp.numero_nf}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; font-size: 11px; color: #111; background: #fff; padding: 20px; }
        .nf { border: 2px solid #000; max-width: 850px; margin: 0 auto; }
        .secao { border-bottom: 1.5px solid #000; padding: 8px 10px; }
        .secao-titulo { font-size: 9px; font-weight: bold; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
        .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
        .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0; }
        .campo { border: 1px solid #ccc; padding: 4px 6px; }
        .campo-label { font-size: 8px; color: #666; text-transform: uppercase; }
        .campo-valor { font-size: 11px; font-weight: bold; color: #111; margin-top: 1px; }
        .header { display: flex; align-items: stretch; border-bottom: 2px solid #000; }
        .header-logo { flex: 0 0 200px; padding: 12px; border-right: 1.5px solid #000; display: flex; flex-direction: column; justify-content: center; }
        .header-danfe { flex: 0 0 160px; padding: 10px; border-right: 1.5px solid #000; text-align: center; display: flex; flex-direction: column; justify-content: center; align-items: center; }
        .header-chave { flex: 1; padding: 10px; display: flex; flex-direction: column; justify-content: center; }
        .empresa-nome { font-size: 15px; font-weight: bold; color: #B45309; }
        .empresa-sub { font-size: 9px; color: #666; margin-top: 2px; }
        .danfe-titulo { font-size: 13px; font-weight: bold; letter-spacing: 3px; border: 2px solid #000; padding: 4px 8px; margin-bottom: 6px; }
        .danfe-modelo { font-size: 10px; margin: 2px 0; }
        .chave-acesso { font-family: monospace; font-size: 10px; letter-spacing: 1px; background: #f5f5f5; padding: 6px; border: 1px solid #ccc; border-radius: 3px; word-break: break-all; }
        .nfe-numero { font-size: 13px; font-weight: bold; color: #B45309; margin-top: 6px; }
        table.itens { width: 100%; border-collapse: collapse; }
        table.itens th { background: #333; color: #fff; padding: 5px 8px; font-size: 10px; text-align: left; border: 1px solid #000; }
        .totais { display: grid; grid-template-columns: 1fr 1fr 1fr; }
        .total-box { border: 1px solid #ccc; padding: 6px 10px; }
        .total-label { font-size: 9px; color: #666; text-transform: uppercase; }
        .total-valor { font-size: 14px; font-weight: bold; color: #111; }
        .total-valor.destaque { color: #B45309; font-size: 16px; }
        @media print { body { padding: 0; } .nf { border: 2px solid #000; } }
      </style>
    </head>
    <body>
      <div class="nf">

        <!-- HEADER -->
        <div class="header">
          <div class="header-logo">
            <div class="empresa-nome">☀️ RAIO DO SOL</div>
            <div class="empresa-sub">Indústria e Comércio</div>
            <div style="margin-top:8px;font-size:9px;color:#666;">
              <div>CNPJ: 00.000.000/0001-00</div>
              <div>IE: 000.000.000.000</div>
              <div style="margin-top:4px;">Rua Exemplo, 100 — Bairro Industrial</div>
              <div>Cidade, Estado — CEP 00000-000</div>
            </div>
          </div>
          <div class="header-danfe">
            <div class="danfe-titulo">DANFE</div>
            <div class="danfe-modelo">Documento Auxiliar da<br/>Nota Fiscal Eletrônica</div>
            <div style="margin-top:8px;font-size:9px;color:#333;">
              <div><strong>Modelo:</strong> 55</div>
              <div><strong>Série:</strong> 001</div>
            </div>
            <div class="nfe-numero">Nº ${exp.numero_nf}</div>
          </div>
          <div class="header-chave">
            <div style="font-size:9px;color:#666;margin-bottom:4px;text-transform:uppercase;font-weight:bold;">Chave de Acesso</div>
            <div class="chave-acesso">${exp.numero_nf.replace(/\D/g,'').padStart(44,'0').replace(/(.{4})/g,'$1 ').trim()}</div>
            <div style="margin-top:10px;font-size:9px;color:#666;">
              <div><strong>Natureza da Operação:</strong> Venda de Mercadoria</div>
              <div style="margin-top:4px;"><strong>Data de Emissão:</strong> ${exp.data_emissao || hoje}</div>
              <div><strong>Data de Saída:</strong> ${exp.data_envio ? new Date(exp.data_envio).toLocaleDateString('pt-BR') : hoje}</div>
            </div>
          </div>
        </div>

        <!-- DESTINATÁRIO -->
        <div class="secao">
          <div class="secao-titulo">Destinatário / Remetente</div>
          <div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:0;">
            <div class="campo">
              <div class="campo-label">Nome / Razão Social</div>
              <div class="campo-valor">${exp.cliente_nome}</div>
            </div>
            <div class="campo">
              <div class="campo-label">CNPJ / CPF</div>
              <div class="campo-valor">${exp.cliente_cnpj_cpf || '—'}</div>
            </div>
            <div class="campo">
              <div class="campo-label">Data de Emissão</div>
              <div class="campo-valor">${exp.data_emissao || hoje}</div>
            </div>
          </div>
          <div class="campo" style="border-top:none;">
            <div class="campo-label">Endereço</div>
            <div class="campo-valor">${exp.cliente_endereco || '—'}</div>
          </div>
        </div>

        <!-- ITENS -->
        <div class="secao">
          <div class="secao-titulo">Dados dos Produtos / Serviços</div>
          <table class="itens">
            <thead>
              <tr>
                <th style="width:40px;">Nº</th>
                <th>Descrição do Produto</th>
                <th style="width:50px;text-align:center;">UN</th>
                <th style="width:60px;text-align:center;">Qtd</th>
                <th style="width:90px;text-align:right;">Vlr. Unit.</th>
                <th style="width:90px;text-align:right;">Vlr. Total</th>
              </tr>
            </thead>
            <tbody>
              ${itensRows}
            </tbody>
          </table>
        </div>

        <!-- TRANSPORTADORA -->
        <div class="secao">
          <div class="secao-titulo">Transportador / Volumes Transportados</div>
          <div style="display:grid;grid-template-columns:2fr 1fr;gap:0;">
            <div class="campo">
              <div class="campo-label">Razão Social / Transportadora</div>
              <div class="campo-valor">${exp.transportadora || 'A definir'}</div>
            </div>
            <div class="campo">
              <div class="campo-label">Quantidade de Volumes</div>
              <div class="campo-valor">${totalItens} un em ${totalProdutos} produto(s)</div>
            </div>
          </div>
        </div>

        <!-- TOTAIS -->
        <div class="secao" style="border-bottom:none;">
          <div class="secao-titulo">Cálculo do Imposto / Totais</div>
          <div class="totais">
            <div class="total-box">
              <div class="total-label">Total de Produtos</div>
              <div class="total-valor">R$ ${valorTotal}</div>
            </div>
            <div class="total-box">
              <div class="total-label">Frete / Seguro / Outros</div>
              <div class="total-valor">R$ 0,00</div>
            </div>
            <div class="total-box" style="background:#FEF3C7;">
              <div class="total-label">Valor Total da NF-e</div>
              <div class="total-valor destaque">R$ ${valorTotal}</div>
            </div>
          </div>
          ${exp.observacoes ? `
          <div class="campo" style="margin-top:6px;">
            <div class="campo-label">Informações Complementares / Observações</div>
            <div class="campo-valor" style="font-weight:normal;">${exp.observacoes}</div>
          </div>` : ''}
          <div style="text-align:center;font-size:9px;color:#999;margin-top:10px;padding-top:8px;border-top:1px solid #eee;">
            Documento emitido pelo sistema Raio do Sol · ${hoje} · NF-e nº ${exp.numero_nf} · Série 001 · Modelo 55
          </div>
        </div>

      </div>
      <script>window.onload=()=>setTimeout(()=>window.print(),400);<\/script>
    </body>
    </html>`);
    win.document.close();
  };

  const counts = useMemo(() => ({
    todas: expedicoes.length,
    emitida: expedicoes.filter(e => e.status === 'emitida').length,
    enviada: expedicoes.filter(e => e.status === 'enviada').length,
    entregue: expedicoes.filter(e => e.status === 'entregue').length,
  }), [expedicoes]);

  const expedicoesFiltradas = useMemo(() => {
    const range = getDateRange();
    return expedicoes.filter(exp => {
      const matchStatus = filtroStatus === 'todas' || exp.status === filtroStatus;
      const matchBusca = !busca || exp.numero_nf?.toLowerCase().includes(busca.toLowerCase()) ||
        exp.cliente_nome?.toLowerCase().includes(busca.toLowerCase()) ||
        exp.pedido_numero?.toLowerCase().includes(busca.toLowerCase());
      let matchData = true;
      if (range && exp.data_emissao) {
        const d = new Date(exp.data_emissao + 'T12:00:00');
        matchData = d >= range.de && d <= range.ate;
      }
      return matchStatus && matchBusca && matchData;
    });
  }, [expedicoes, filtroStatus, busca, filtroPeriodo, dataInicio, dataFim]);

  const FILTROS = [
    { key: 'todas', label: 'Todas' }, { key: 'emitida', label: 'Emitidas' },
    { key: 'enviada', label: 'Em Trânsito' }, { key: 'entregue', label: 'Entregues' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-100 flex items-center justify-center">
            <Truck size={19} className="text-purple-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Expedição</h2>
            <p className="text-xs text-muted-foreground">
              {counts.emitida} emitida{counts.emitida !== 1 ? 's' : ''} · {counts.enviada} em trânsito · {counts.entregue} entregue{counts.entregue !== 1 ? 's' : ''}
            </p>
          </div>
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

      {/* Pipeline visual */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Emitidas', count: counts.emitida, icon: FileText, bg: 'bg-blue-50', text: 'text-blue-600', desc: 'Aguardando envio' },
          { label: 'Em Trânsito', count: counts.enviada, icon: Truck, bg: 'bg-amber-50', text: 'text-amber-600', desc: 'No caminho' },
          { label: 'Entregues', count: counts.entregue, icon: CheckCircle, bg: 'bg-green-50', text: 'text-green-600', desc: 'Confirmadas' },
        ].map(({ label, count, icon: Icon, bg, text, desc }) => (
          <div key={label} className={`${bg} rounded-2xl p-4 text-center`}>
            <div className={`w-8 h-8 rounded-xl ${bg} border border-current/20 flex items-center justify-center mx-auto mb-2`}>
              <Icon size={16} className={text} />
            </div>
            <p className={`text-2xl font-bold ${text}`}>{count}</p>
            <p className="text-xs font-medium text-foreground">{label}</p>
            <p className="text-xs text-muted-foreground">{desc}</p>
          </div>
        ))}
      </div>

      {/* Busca */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={busca} onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por NF, cliente, pedido..."
          className="w-full border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
        {busca && <button onClick={() => setBusca('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X size={14} /></button>}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1.5 flex-wrap">
          {FILTROS.map(f => (
            <button key={f.key} onClick={() => setFiltroStatus(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${filtroStatus === f.key ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground hover:text-foreground'}`}>
              {f.label}
              {counts[f.key] > 0 && <span className={`text-[10px] font-bold px-1 rounded-full ${filtroStatus === f.key ? 'bg-white/20' : 'bg-muted'}`}>{counts[f.key]}</span>}
            </button>
          ))}
        </div>
        <div className="w-px h-6 bg-border self-center" />
        <div className="flex gap-1.5 flex-wrap">
          {PERIODOS.map(p => (
            <button key={p.key} onClick={() => setFiltroPeriodo(p.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filtroPeriodo === p.key ? 'bg-foreground text-background' : 'bg-card border border-border text-muted-foreground hover:text-foreground'}`}>
              {p.label}
            </button>
          ))}
        </div>
        {filtroPeriodo === 'custom' && (
          <div className="flex items-center gap-2">
            <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
              className="border border-border rounded-xl px-3 py-1.5 text-xs bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
            <span className="text-xs text-muted-foreground">até</span>
            <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
              className="border border-border rounded-xl px-3 py-1.5 text-xs bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
        )}
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {expedicoesFiltradas.map(exp => (
          <ExpedicaoCard key={exp.id} exp={exp}
            onAtualizarStatus={readonly ? null : atualizarStatus}
            onImprimirNF={imprimirNF}
            onConfirmarRecebimento={readonly ? null : (exp) => setModalConfirmacao(exp)}
          />
        ))}
        {expedicoesFiltradas.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-4xl mb-3">🚚</p>
            <p className="text-sm">{busca || filtroStatus !== 'todas' ? 'Nenhuma expedição encontrada.' : 'Nenhuma expedição registrada.'}</p>
          </div>
        )}
      </div>

      {showForm && (
        <NovaExpedicaoModal pedidos={pedidos} loading={loading} onCriar={criarExpedicao} onClose={() => setShowForm(false)} />
      )}
      {modalConfirmacao && (
        <ModalConfirmacaoRecebimento expedicao={modalConfirmacao} onClose={() => setModalConfirmacao(null)} onConfirmed={() => { setModalConfirmacao(null); load(); }} />
      )}
    </div>
  );
}