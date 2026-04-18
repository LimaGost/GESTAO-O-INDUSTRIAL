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
    const win = window.open('', '_blank', 'width=700,height=800');
    win.document.write(`<!DOCTYPE html><html><head><title>NF-e ${exp.numero_nf}</title>
      <style>body{font-family:Arial,sans-serif;padding:24px;font-size:13px;}h1{font-size:18px;}table{width:100%;border-collapse:collapse;}td,th{border:1px solid #ccc;padding:6px 10px;}th{background:#f5f5f5;}</style></head>
      <body><h1>NF-e ${exp.numero_nf}</h1>
      <h3>Destinatário</h3><table><tr><th>Nome / Razão Social</th><td>${exp.cliente_nome}</td></tr>
      <tr><th>CNPJ / CPF</th><td>${exp.cliente_cnpj_cpf || '—'}</td></tr>
      <tr><th>Endereço</th><td>${exp.cliente_endereco || '—'}</td></tr></table>
      <h3>Itens</h3><table><tr><th>Produto</th><th>Qtd</th><th>Vlr Unit.</th><th>Total</th></tr>
      ${(exp.itens||[]).map(item=>`<tr><td>${item.produto_nome}</td><td>${item.quantidade}</td><td>R$ ${(item.preco_unitario||0).toFixed(2)}</td><td>R$ ${(item.total||0).toFixed(2)}</td></tr>`).join('')}
      </table><p><strong>Total: R$ ${(exp.valor_total||0).toFixed(2)}</strong></p>
      ${exp.transportadora?`<p>Transportadora: ${exp.transportadora}</p>`:''}
      <script>window.onload=()=>setTimeout(()=>window.print(),300);</script></body></html>`);
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