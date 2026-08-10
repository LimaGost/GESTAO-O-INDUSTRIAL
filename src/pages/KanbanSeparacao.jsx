import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { registrarLog } from '@/lib/audit';
import { hojeData } from '@/lib/brasilia';
import { avancarStatusSeparacao } from '@/lib/avancoSeparacao';
import { criarSeparacaoFromPedido, criarSeparacaoFromGrupo } from '@/lib/separacao';
import { buildColunas, readStagesLocal } from '@/lib/kanbanFluxo';
import { usePermissoes } from '@/lib/usePermissoes.jsx';
import SeparacaoCard from '@/components/separacao/SeparacaoCard';
import SeparacaoCardModal from '@/components/separacao/SeparacaoCardModal';
import SeparacaoKpis from '@/components/separacao/SeparacaoKpis';
import { useRealtimeEntity } from '@/hooks/useRealtimeEntity';
import { buildMapaCategorias, listarCategorias, registroTemCategoria } from '@/lib/categoriaFiltro';
import FiltroCategorias from '@/components/common/FiltroCategorias';
import OrdenarPor from '@/components/common/OrdenarPor';
import { ordenarCards } from '@/lib/ordenacaoCards';
import { movimentoDaEtapa } from '@/lib/movimentoEstoque';
import BadgeMovimentoEstoque from '@/components/common/BadgeMovimentoEstoque';
import DicaColuna from '@/components/common/DicaColuna';
import { ClipboardCheck, Plus, X, Search, RefreshCw } from 'lucide-react';

function buildSepColunas() {
  const stages = readStagesLocal('separacao');
  return buildColunas(stages);
}

export default function KanbanSeparacao() {
  const { somenteLeitura } = usePermissoes();
  const readonly = somenteLeitura('Separacao');
  const [separacoes, setSeparacoes] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [loadingId, setLoadingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [showNova, setShowNova] = useState(false);
  const [buscaPedido, setBuscaPedido] = useState('');
  const [criando, setCriando] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [colunas, setColunas] = useState(buildSepColunas);
  const [sepSelecionada, setSepSelecionada] = useState(null);
  const [produtos, setProdutos] = useState([]);
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [sortKey, setSortKey] = useState('urgencia');

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Atualiza colunas quando a configuração centralizada é salva
  useEffect(() => {
    const onSettings = () => setColunas(buildSepColunas());
    window.addEventListener('separacao:settings:saved', onSettings);
    return () => window.removeEventListener('separacao:settings:saved', onSettings);
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [seps, peds, gps, prods] = await Promise.all([
        base44.entities.Separacao.list('-created_date'),
        base44.entities.Pedido.list().catch(() => []),
        base44.entities.GrupoPedidos.list().catch(() => []),
        base44.entities.Produto.list().catch(() => []),
      ]);
      // Oculta cards órfãos (pedido excluído) ou de pedidos cancelados
      const pedidosOk = new Set(peds.filter(p => p.status !== 'cancelado').map(p => p.id));
      setSeparacoes(seps.filter(s => !s.pedido_id || pedidosOk.has(s.pedido_id)));
      setPedidos(peds);
      setProdutos(prods);
      setGrupos(gps.filter(g => g.status !== 'desfeito'));
    } catch (e) {
      console.warn('[KanbanSeparacao] erro ao carregar:', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Tempo real: aplica só o card alterado, sem recarregar a lista inteira
  useRealtimeEntity('Separacao', setSeparacoes);

  const avancar = async (sep) => {
    if (sep.status === 'aguardando_producao') return; // bloqueado até a produção concluir
    const proximo = colunas.find(c => c.key === sep.status)?.proximo;
    if (!proximo) return;
    setSeparacoes(prev => prev.map(s => s.id === sep.id ? { ...s, status: proximo } : s));
    setLoadingId(sep.id);

    try {
      // Lógica de automações centralizada em src/lib/avancoSeparacao.js —
      // compartilhada com a tela de Posto de Trabalho (tablet).
      await avancarStatusSeparacao(sep, { colunas });
    } catch (e) {
      setSeparacoes(prev => prev.map(s => s.id === sep.id ? { ...s, status: sep.status } : s));
      console.error('[KanbanSeparacao] erro ao avançar:', e);
    } finally {
      setLoadingId(null);
    }
  };

  const criarFromPedido = async (pedido) => {
    setCriando(true);
    try {
      await criarSeparacaoFromPedido(pedido);
      await base44.entities.Pedido.update(pedido.id, { status: 'separacao' }).catch(() => {});
      setShowNova(false);
      load();
    } catch (e) {
      alert('Erro ao criar separação: ' + e.message);
    } finally {
      setCriando(false);
    }
  };

  const criarFromGrupo = async (grupo) => {
    const pedsDoGrupo = pedidos.filter(p => (grupo.pedidos_ids || []).includes(p.id));
    if (pedsDoGrupo.length === 0) return;
    setCriando(true);
    try {
      await criarSeparacaoFromGrupo(grupo, pedsDoGrupo);
      setShowNova(false);
      load();
    } catch (e) {
      alert('Erro ao criar separação: ' + e.message);
    } finally {
      setCriando(false);
    }
  };

  // Cards aguardando produção (alocação parcial) aparecem na primeira coluna, bloqueados
  const statusColuna = (s) => s.status === 'aguardando_producao' ? (colunas[0]?.key || 'aguardando_separacao') : s.status;

  const mapaCategorias = buildMapaCategorias(produtos);
  const categorias = listarCategorias(produtos);

  const separacoesFiltradas = ordenarCards(separacoes.filter(s => {
    if (!registroTemCategoria(s, mapaCategorias, filtroCategoria)) return false;
    if (!busca) return true;
    const q = busca.toLowerCase();
    return (s.numero || '').toLowerCase().includes(q) ||
           (s.pedido_numero || '').toLowerCase().includes(q) ||
           (s.ordem_producao_numero || '').toLowerCase().includes(q) ||
           (s.cliente_nome || '').toLowerCase().includes(q);
  }), sortKey, {
    getQtd: (s) => s.quantidade_total || 0,
    getPrazo: (s) => s.data_prevista || null,
  });

  const pedidosDisponiveis = pedidos.filter(p => {
    if (['expedido', 'entregue', 'cancelado', 'separado'].includes(p.status)) return false;
    if (!buscaPedido) return true;
    return (p.numero || '').toLowerCase().includes(buscaPedido.toLowerCase()) ||
           (p.cliente_nome || '').toLowerCase().includes(buscaPedido.toLowerCase());
  });

  const colWidth = isMobile ? 'w-80 sm:w-96' : 'w-72';
  const colHeight = isMobile ? 'calc(100vh - 420px)' : 'calc(100vh - 300px)';

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header */}
      <div className="bg-card border border-border rounded-2xl px-4 md:px-5 py-4 flex-shrink-0">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <div className="w-9 md:w-10 h-9 md:h-10 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <ClipboardCheck size={18} className="text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base md:text-lg font-bold text-foreground truncate">Separação Industria</h2>
              <p className="text-xs text-muted-foreground">Produção → Separação → Expedição</p>
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

        {/* Filtro por categoria */}
        {categorias.length > 0 && (
          <div className="mb-4">
            <FiltroCategorias categorias={categorias} valor={filtroCategoria} onChange={setFiltroCategoria} />
          </div>
        )}

        {/* Ordenação */}
        <div className="mb-4">
          <OrdenarPor valor={sortKey} onChange={setSortKey} />
        </div>

        {/* KPIs */}
        {!loading && <SeparacaoKpis separacoes={separacoes} />}

        {/* Progress bars */}
        <div className={`mt-4 grid gap-2 ${isMobile ? 'grid-cols-3 md:grid-cols-6' : 'grid-cols-6'}`}>
          {colunas.map((col) => {
            const count = separacoes.filter(s => statusColuna(s) === col.key).length;
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
          const movimento = movimentoDaEtapa(colunas.find(c => c.key === key), 'separacao');
          const colSeps = separacoesFiltradas.filter(s => statusColuna(s) === key);
          const total = separacoes.filter(s => statusColuna(s) === key).length;
          const labelBotao = proximo ? proximoLabel : null;

          return (
            <div key={key} className={`flex-shrink-0 ${colWidth} rounded-2xl flex flex-col overflow-hidden ${isMobile ? 'snap-center' : ''}`}
              style={{ height: colHeight, background: bg, border: `1.5px solid ${border}` }}>
              <div className="px-4 py-2.5 flex items-center justify-between sticky top-0 z-10"
                style={{ background: bg, borderBottom: `1px solid ${border}` }}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: dot }} />
                    <Icon size={13} style={{ color: accent }} />
                    <span className="text-xs font-bold tracking-wide" style={{ color: accent }}>{label.toUpperCase()}</span>
                    <DicaColuna coluna={colunas.find(c => c.key === key)} kanbanKey="separacao" accent={accent}
                      proximoLabel={colunas.find(c => c.key === key)?.proximoLabel?.replace('→ ', '') || null} />
                  </div>
                  {movimento && <div className="mt-1"><BadgeMovimentoEstoque movimento={movimento} variante="coluna" /></div>}
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
                    <SeparacaoCard
                      key={sep.id}
                      separacao={sep}
                      onAvancar={readonly ? null : avancar}
                      loading={loadingId === sep.id}
                      labelBotao={labelBotao}
                      readonly={readonly}
                      onOpenModal={() => setSepSelecionada(sep)}
                      movimentoEstoque={movimento}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Detalhes da Separação */}
      {sepSelecionada && (
        <SeparacaoCardModal
          separacao={separacoes.find(s => s.id === sepSelecionada.id) || sepSelecionada}
          colunas={colunas}
          onAvancar={readonly ? null : async (sep) => { await avancar(sep); setSepSelecionada(null); }}
          loading={loadingId === sepSelecionada.id}
          labelBotao={colunas.find(c => c.key === sepSelecionada.status)?.proximoLabel || null}
          onClose={() => setSepSelecionada(null)}
        />
      )}

      {/* Modal Nova Separação */}
      {showNova && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
              <h3 className="font-bold text-foreground">Nova Separação</h3>
              <button onClick={() => setShowNova(false)} className="p-1.5 hover:bg-muted rounded-lg">
                <X size={16} className="text-muted-foreground" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="flex items-center gap-2 bg-muted/30 border border-border rounded-xl px-3.5 py-2.5">
                <Search size={14} className="text-muted-foreground flex-shrink-0" />
                <input value={buscaPedido} onChange={e => setBuscaPedido(e.target.value)}
                  placeholder="Buscar pedido por número ou cliente..."
                  className="bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground w-full" />
              </div>

              {grupos.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Agrupamentos</p>
                  <div className="space-y-1.5">
                    {grupos.filter(g => !buscaPedido || (g.cliente_nome || '').toLowerCase().includes(buscaPedido.toLowerCase())).slice(0, 5).map(grupo => (
                      <button key={grupo.id} onClick={() => criarFromGrupo(grupo)} disabled={criando}
                        className="w-full flex items-center justify-between gap-2 bg-violet-50 border border-violet-200 rounded-xl px-3 py-2.5 hover:bg-violet-100 transition-colors text-left disabled:opacity-50">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-violet-800 truncate">🔗 {grupo.cliente_nome}</p>
                          <p className="text-xs text-violet-600">{(grupo.pedidos_numeros || []).map(n => `#${n}`).join(' · ')}</p>
                        </div>
                        <Plus size={14} className="text-violet-600 flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                  <div className="my-3 border-t border-border" />
                </div>
              )}

              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pedidos</p>
              <div className="space-y-1.5">
                {pedidosDisponiveis.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Nenhum pedido disponível</p>
                ) : (
                  pedidosDisponiveis.slice(0, 30).map(ped => (
                    <button key={ped.id} onClick={() => criarFromPedido(ped)} disabled={criando}
                      className="w-full flex items-center justify-between gap-2 bg-muted/30 border border-border rounded-xl px-3 py-2.5 hover:bg-muted transition-colors text-left disabled:opacity-50">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground truncate">{ped.numero} — {ped.cliente_nome}</p>
                        <p className="text-xs text-muted-foreground">{(ped.itens || []).length} item(ns) · Status: {ped.status}</p>
                      </div>
                      <Plus size={14} className="text-primary flex-shrink-0" />
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}