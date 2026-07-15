import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Store, RefreshCw, Clock, CheckCircle, Package, FileText, XCircle } from 'lucide-react';
import FranqueadoCard from '@/components/galpao/FranqueadoCard';
import ModalPedidoFranqueado from '@/components/galpao/ModalPedidoFranqueado';

const COLUNAS = [
  { key: 'pendente',     label: '⏳ Pendente',      icon: Clock,       accent: '#F59E0B', bg: '#FFFBEB', border: '#FCD34D' },
  { key: 'aprovado',     label: '✅ Aprovado',      icon: CheckCircle, accent: '#22C55E', bg: '#F0FDF4', border: '#86EFAC' },
  { key: 'em_expedicao', label: '📦 Em Expedição',  icon: Package,     accent: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE' },
  { key: 'faturado',     label: '🟣 Faturado',      icon: FileText,    accent: '#A855F7', bg: '#FAF5FF', border: '#D8B4FE' },
  { key: 'cancelado',    label: '❌ Cancelado',     icon: XCircle,     accent: '#EF4444', bg: '#FFF5F5', border: '#FCA5A5' },
];

const FRANQUEADOS = [
  'Raio do Sol Artigos Religiosos',
  'Lobo e Souza',
  'Nascimento e Choas',
  'Raio do Sol Choas',
  'LS Varejo Religioso',
];

const fmtR = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
const hojeStr = () => new Date().toISOString().split('T')[0];
const inicioMesStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; };

export default function KanbanFranqueados() {
  const [pedidos, setPedidos] = useState([]);
  const [nomesProdutos, setNomesProdutos] = useState({});
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState(null);
  const [franqueado, setFranqueado] = useState('todos');
  const [dataInicial, setDataInicial] = useState(inicioMesStr);
  const [dataFinal, setDataFinal] = useState(hojeStr);
  const [pedidoSelecionado, setPedidoSelecionado] = useState(null);

  const load = async () => {
    setLoading(true);
    setErro(null);
    try {
      const res = await base44.functions.invoke('microvixFranqueados', {
        action: 'pedidos', dataInicial, dataFinal,
      });
      setPedidos(res.data.pedidos || []);
    } catch (e) {
      setErro(e?.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Nomes de produtos (carrega uma vez, em segundo plano)
  useEffect(() => {
    base44.functions.invoke('microvixFranqueados', { action: 'produtos' })
      .then(res => setNomesProdutos(res.data.nomes || {}))
      .catch(() => {});
  }, []);

  const pedidosFiltrados = pedidos.filter(p => franqueado === 'todos' || p.franqueado === franqueado);

  return (
    <div className="flex flex-col space-y-4">
      {/* Header + Filtros */}
      <div className="bg-card border border-border rounded-2xl px-4 md:px-5 py-4 flex-shrink-0">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <div className="w-9 md:w-10 h-9 md:h-10 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Store size={18} className="text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base md:text-lg font-bold text-foreground truncate">Pedidos de Franqueados</h2>
              <p className="text-xs text-muted-foreground">Microvix · {pedidosFiltrados.length} pedido(s)</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2 flex-wrap justify-end">
            <select value={franqueado} onChange={e => setFranqueado(e.target.value)}
              className="border border-border rounded-xl px-3 py-2 text-xs md:text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="todos">Todos os franqueados</option>
              {FRANQUEADOS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            <input type="date" value={dataInicial} onChange={e => setDataInicial(e.target.value)}
              className="border border-border rounded-xl px-3 py-2 text-xs md:text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
            <input type="date" value={dataFinal} onChange={e => setDataFinal(e.target.value)}
              className="border border-border rounded-xl px-3 py-2 text-xs md:text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
            <button onClick={load} disabled={loading}
              className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-2 md:px-4 md:py-2.5 rounded-lg md:rounded-xl text-xs md:text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm disabled:opacity-50">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Atualizar
            </button>
          </div>
        </div>
        {erro && (
          <p className="mt-3 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2">
            Erro ao consultar a Microvix: {erro}
          </p>
        )}
      </div>

      {/* Colunas */}
      <div className="flex gap-3 overflow-x-auto pb-4 items-start snap-x">
        {COLUNAS.map(({ key, label, icon: Icon, accent, bg, border }) => {
          const colPedidos = pedidosFiltrados.filter(p => p.status === key);
          const totalColuna = colPedidos.reduce((s, p) => s + (p.valor_total || 0), 0);
          return (
            <div key={key} className="flex-shrink-0 w-80 sm:w-96 md:w-72 rounded-2xl flex flex-col overflow-hidden snap-center"
              style={{ maxHeight: 'calc(100vh - 260px)', minHeight: '280px', background: bg, border: `1.5px solid ${border}` }}>
              <div className="px-4 py-3 sticky top-0 z-10"
                style={{ background: bg, borderBottom: `1px solid ${border}` }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon size={13} style={{ color: accent }} />
                    <span className="text-xs font-bold tracking-wide" style={{ color: accent }}>{label.toUpperCase()}</span>
                  </div>
                  <span className="text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full text-white"
                    style={{ background: accent, opacity: colPedidos.length === 0 ? 0.4 : 1 }}>{colPedidos.length}</span>
                </div>
                <p className="text-[11px] font-semibold mt-1" style={{ color: accent }}>{fmtR(totalColuna)}</p>
              </div>

              <div className="flex-1 p-2 md:p-3 overflow-y-auto space-y-1.5 md:space-y-2.5">
                {loading && pedidos.length === 0 ? (
                  <div className="flex justify-center py-10">
                    <RefreshCw size={16} className="animate-spin" style={{ color: accent }} />
                  </div>
                ) : colPedidos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 md:py-12 opacity-30">
                    <div className="w-8 md:w-10 h-8 md:h-10 rounded-full border-2 border-dashed flex items-center justify-center mb-2" style={{ borderColor: accent }}>
                      <Icon size={14} style={{ color: accent }} />
                    </div>
                    <p className="text-xs text-muted-foreground">Sem pedidos</p>
                  </div>
                ) : (
                  colPedidos.map(ped => (
                    <FranqueadoCard key={ped.id} pedido={ped} accent={accent} onClick={() => setPedidoSelecionado(ped)} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {pedidoSelecionado && (
        <ModalPedidoFranqueado
          pedido={pedidoSelecionado}
          nomesProdutos={nomesProdutos}
          onClose={() => setPedidoSelecionado(null)}
        />
      )}
    </div>
  );
}