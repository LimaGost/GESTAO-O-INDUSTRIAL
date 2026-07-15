import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { registrarLog } from '@/lib/audit';
import { agoraISO } from '@/lib/brasilia';
import { gerarNumero } from '@/lib/numeracao';
import { buildColunas } from '@/lib/kanbanFluxo';
import { usePermissoes } from '@/lib/usePermissoes.jsx';
import GalpaoCard from '@/components/galpao/GalpaoCard';
import ModalNovaGalpao from '@/components/galpao/ModalNovaGalpao';
import { Warehouse, Plus, X, Search, RefreshCw } from 'lucide-react';

// Kanban independente — mesma estrutura de etapas da Separação, sem ligação com outros kanbans
const STAGES = [
  { key: 'aguardando_separacao', label: 'Aguardando Separação', cor: 0, icone: 'Clock' },
  { key: 'em_separacao',         label: 'Em Separação',         cor: 1, icone: 'ClipboardCheck' },
  { key: 'separado',             label: 'Separado',             cor: 2, icone: 'CheckCircle' },
  { key: 'em_conferencia',       label: 'Em Conferência',       cor: 3, icone: 'ClipboardList' },
  { key: 'conferido',            label: 'Conferido',            cor: 7, icone: 'BadgeCheck' },
  { key: 'liberado_expedicao',   label: 'Liberado p/ Expedição',cor: 4, icone: 'Send' },
];

export default function KanbanGalpao() {
  const { somenteLeitura } = usePermissoes();
  const readonly = somenteLeitura('Separacao');
  const [separacoes, setSeparacoes] = useState([]);
  const [loadingId, setLoadingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [showNova, setShowNova] = useState(false);
  const [criando, setCriando] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const colunas = buildColunas(STAGES);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      setSeparacoes(await base44.entities.SeparacaoGalpao.list('-created_date'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const avancar = async (sep) => {
    const proximo = colunas.find(c => c.key === sep.status)?.proximo;
    if (!proximo) return;
    setSeparacoes(prev => prev.map(s => s.id === sep.id ? { ...s, status: proximo } : s));
    setLoadingId(sep.id);
    const agora = agoraISO();
    const updates = { status: proximo };
    if (proximo === 'em_separacao') updates.data_inicio_separacao = agora;
    if (proximo === 'separado') updates.data_separado = agora;
    if (proximo === 'em_conferencia') updates.data_conferencia = agora;
    if (proximo === 'liberado_expedicao') updates.data_liberacao = agora;
    try {
      await base44.entities.SeparacaoGalpao.update(sep.id, updates);
      const labelProximo = colunas.find(c => c.key === proximo)?.label || proximo;
      registrarLog('SeparacaoGalpao', sep.id, 'AVANCO_STATUS', `Separação ${sep.numero} (Galpão) avançou para "${labelProximo}"`).catch(() => {});
    } catch (e) {
      setSeparacoes(prev => prev.map(s => s.id === sep.id ? { ...s, status: sep.status } : s));
      console.error('[KanbanGalpao] erro ao avançar:', e);
    } finally {
      setLoadingId(null);
    }
  };

  const excluir = async (sep) => {
    if (!confirm(`Excluir a separação ${sep.numero}?`)) return;
    await base44.entities.SeparacaoGalpao.delete(sep.id);
    registrarLog('SeparacaoGalpao', sep.id, 'EXCLUSAO', `Separação ${sep.numero} (Galpão) excluída`).catch(() => {});
    load();
  };

  const criar = async (dados) => {
    setCriando(true);
    try {
      await base44.entities.SeparacaoGalpao.create({
        numero: gerarNumero('SGP'),
        ...dados,
        quantidade_itens: (dados.itens || []).length,
        quantidade_total: (dados.itens || []).reduce((s, i) => s + (i.quantidade || 0), 0),
        status: 'aguardando_separacao',
      });
      setShowNova(false);
      load();
    } catch (e) {
      alert('Erro ao criar separação: ' + e.message);
    } finally {
      setCriando(false);
    }
  };

  const separacoesFiltradas = separacoes.filter(s => {
    if (!busca) return true;
    const q = busca.toLowerCase();
    return (s.numero || '').toLowerCase().includes(q) || (s.cliente_nome || '').toLowerCase().includes(q);
  });

  const colWidth = isMobile ? 'w-80 sm:w-96' : 'w-72';
  const colHeight = isMobile ? 'calc(100vh - 380px)' : 'calc(100vh - 280px)';

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header */}
      <div className="bg-card border border-border rounded-2xl px-4 md:px-5 py-4 flex-shrink-0">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <div className="w-9 md:w-10 h-9 md:h-10 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Warehouse size={18} className="text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base md:text-lg font-bold text-foreground truncate">Separação Galpão</h2>
              <p className="text-xs text-muted-foreground">Kanban independente para serviços do galpão</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2 flex-wrap justify-end">
            <div className="flex items-center gap-2 bg-muted/50 border border-border rounded-xl px-3 py-2">
              <Search size={14} className="text-muted-foreground flex-shrink-0" />
              <input value={busca} onChange={e => setBusca(e.target.value)}
                placeholder="Buscar..."
                className="bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground w-24 md:w-40" />
              {busca && <button onClick={() => setBusca('')}><X size={13} className="text-muted-foreground" /></button>}
            </div>
            <button onClick={load} className="p-2 border border-border rounded-xl hover:bg-muted transition-colors">
              <RefreshCw size={14} className={`text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
            </button>
            {!readonly &&
              <button onClick={() => setShowNova(true)}
                className="flex items-center gap-1 bg-primary text-primary-foreground px-3 py-2 md:px-4 md:py-2.5 rounded-lg md:rounded-xl text-xs md:text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm flex-shrink-0">
                <Plus size={15} /> <span className="hidden sm:inline">Separação</span>
              </button>
            }
          </div>
        </div>

        {/* Progress bars */}
        <div className={`grid gap-2 ${isMobile ? 'grid-cols-3 md:grid-cols-6' : 'grid-cols-6'}`}>
          {colunas.map((col) => {
            const count = separacoes.filter(s => s.status === col.key).length;
            const pct = separacoes.length > 0 ? Math.round(count / separacoes.length * 100) : 0;
            return (
              <div key={col.key} className="text-center">
                <div className="h-1.5 rounded-full mb-1.5 overflow-hidden bg-muted">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: col.accent }} />
                </div>
                <p className="text-base md:text-lg font-bold text-foreground">{count}</p>
                <p className="text-[9px] md:text-[10px] text-muted-foreground leading-tight hidden sm:block">{col.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Colunas */}
      <div className={`flex gap-3 overflow-x-auto pb-4 flex-1 min-h-0 items-start ${isMobile ? 'snap-x snap-mandatory' : ''}`}>
        {colunas.map(({ key, label, icon: Icon, accent, bg, border, dot, proximo, proximoLabel }) => {
          const colSeps = separacoesFiltradas.filter(s => s.status === key);
          const total = separacoes.filter(s => s.status === key).length;

          return (
            <div key={key} className={`flex-shrink-0 ${colWidth} rounded-2xl flex flex-col overflow-hidden ${isMobile ? 'snap-center' : ''}`}
              style={{ height: colHeight, background: bg, border: `1.5px solid ${border}` }}>
              <div className="px-4 py-3 flex items-center justify-between sticky top-0 z-10"
                style={{ background: bg, borderBottom: `1px solid ${border}` }}>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: dot }} />
                  <Icon size={13} style={{ color: accent }} />
                  <span className="text-xs font-bold tracking-wide" style={{ color: accent }}>{label.toUpperCase()}</span>
                </div>
                <span className="text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full text-white"
                  style={{ background: accent, opacity: total === 0 ? 0.4 : 1 }}>{total}</span>
              </div>

              <div className="flex-1 p-2 md:p-3 overflow-y-auto space-y-1.5 md:space-y-2.5">
                {colSeps.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 md:py-16 opacity-30">
                    <div className="w-8 md:w-10 h-8 md:h-10 rounded-full border-2 border-dashed flex items-center justify-center mb-2" style={{ borderColor: accent }}>
                      <Icon size={14} style={{ color: accent }} />
                    </div>
                    <p className="text-xs text-muted-foreground">Sem itens</p>
                  </div>
                ) : (
                  colSeps.map(sep => (
                    <GalpaoCard
                      key={sep.id}
                      sep={sep}
                      onAvancar={avancar}
                      onExcluir={excluir}
                      loading={loadingId === sep.id}
                      labelBotao={proximo ? proximoLabel : null}
                      readonly={readonly}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showNova && (
        <ModalNovaGalpao onCriar={criar} onClose={() => setShowNova(false)} criando={criando} />
      )}
    </div>
  );
}