import { useEffect, useState } from 'react';
import { cachedFetch, cacheInvalidate, cacheSet, cacheGet } from '@/lib/entityCache';
import { base44 } from '@/api/base44Client';
import { registrarLog } from '@/lib/audit';
import { gerarLote, gerarNumero } from '@/lib/numeracao';
import { agoraISO, hojeData } from '@/lib/brasilia';
import {
  Factory, Clock, CheckCircle, Package, Flag, Plus, X,
  RefreshCw, Search, SlidersHorizontal, ArrowUpDown, Eye, EyeOff, ChevronDown, BarChart2 } from
'lucide-react';
import KanbanCard from '@/components/kanban/KanbanCard';
import KanbanCardModal from '@/components/kanban/KanbanCardModal';
import ModalTotalProducao from '@/components/kanban/ModalTotalProducao';
import { usePermissoes } from '@/lib/usePermissoes.jsx';

const CORES_OPCOES = [
{ accent: '#64748B', bg: '#F8FAFC', border: '#CBD5E1', dot: '#94A3B8' },
{ accent: '#0EA5E9', bg: '#F0F9FF', border: '#7DD3FC', dot: '#0EA5E9' },
{ accent: '#22C55E', bg: '#F0FDF4', border: '#86EFAC', dot: '#22C55E' },
{ accent: '#F59E0B', bg: '#FFFBEB', border: '#FCD34D', dot: '#F59E0B' },
{ accent: '#A855F7', bg: '#FAF5FF', border: '#D8B4FE', dot: '#A855F7' },
{ accent: '#EF4444', bg: '#FFF5F5', border: '#FCA5A5', dot: '#EF4444' },
{ accent: '#F97316', bg: '#FFF7ED', border: '#FDBA74', dot: '#F97316' },
{ accent: '#14B8A6', bg: '#F0FDFA', border: '#99F6E4', dot: '#14B8A6' }];


const ICON_MAP = { Clock, Factory, CheckCircle, Package, Flag, Truck: Package, Archive: Package, Layers: Package };

const COLUNAS_DEFAULT = [
{ key: 'a_produzir', label: 'A Produzir', cor: 0, icone: 'Clock', acao: 'nenhuma' },
{ key: 'em_producao', label: 'Em Produção', cor: 1, icone: 'Factory', acao: 'registrar_data_inicio' },
{ key: 'produzido', label: 'Produzido', cor: 2, icone: 'CheckCircle', acao: 'registrar_data_fim_producao' },
{ key: 'em_embalagem', label: 'Em Embalagem', cor: 3, icone: 'Package', acao: 'registrar_data_embalagem' },
{ key: 'em_separacao', label: 'Em Separação', cor: 7, icone: 'Layers', acao: 'saida_estoque' },
{ key: 'finalizado', label: 'Finalizado', cor: 4, icone: 'Flag', acao: 'finalizar_expedicao' }];


function buildColunas() {
  try {
    const saved = JSON.parse(localStorage.getItem('kanban_colunas_config') || 'null');
    if (saved && Array.isArray(saved) && saved.length > 0) {
      return saved.map((c) => {
        const cores = CORES_OPCOES[c.cor] || CORES_OPCOES[0];
        return { ...c, icon: ICON_MAP[c.icone] || Clock, ...cores };
      });
    }
  } catch {}
  return COLUNAS_DEFAULT.map((c) => {
    const cores = CORES_OPCOES[c.cor] || CORES_OPCOES[0];
    return { ...c, icon: ICON_MAP[c.icone] || Clock, ...cores };
  });
}

function buildProximos(colunas) {
  const map = {};
  for (let i = 0; i < colunas.length - 1; i++) map[colunas[i].key] = colunas[i + 1].key;
  return map;
}

const SORT_OPTIONS = [
{ key: 'urgencia', label: 'Urgência' },
{ key: 'created_date_asc', label: 'Mais antigas' },
{ key: 'created_date_desc', label: 'Mais recentes' },
{ key: 'qtd_desc', label: 'Maior qtd' },
{ key: 'qtd_asc', label: 'Menor qtd' }];


function sortOrdens(ordens, sortKey) {
  return [...ordens].sort((a, b) => {
    switch (sortKey) {
      case 'created_date_asc':return new Date(a.created_date) - new Date(b.created_date);
      case 'created_date_desc':return new Date(b.created_date) - new Date(a.created_date);
      case 'qtd_desc':{
          const qa = a.itens?.length > 0 ? a.itens.reduce((s, i) => s + (i.quantidade || 0), 0) : a.quantidade || 0;
          const qb = b.itens?.length > 0 ? b.itens.reduce((s, i) => s + (i.quantidade || 0), 0) : b.quantidade || 0;
          return qb - qa;
        }
      case 'qtd_asc':{
          const qa = a.itens?.length > 0 ? a.itens.reduce((s, i) => s + (i.quantidade || 0), 0) : a.quantidade || 0;
          const qb = b.itens?.length > 0 ? b.itens.reduce((s, i) => s + (i.quantidade || 0), 0) : b.quantidade || 0;
          return qa - qb;
        }
      case 'urgencia':
      default:
        return new Date(b.created_date) - new Date(a.created_date);
    }
  });
}

export default function Kanban() {
  const { somenteLeitura } = usePermissoes();
  const readonly = somenteLeitura('Kanban');
  const [user, setUser] = useState(null);
  useEffect(() => {base44.auth.me().then(setUser).catch(() => {});}, []);
  const podeGerenciarProducao = user?.role === 'admin' || user?.role === 'gerente_producao';
  const [kanbanColunas, setKanbanColunas] = useState(buildColunas);
  const PROXIMOS = buildProximos(kanbanColunas);
  const [ordens, setOrdens] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [pedidoMap, setPedidoMap] = useState({});
  const [checklistConfigs, setChecklistConfigs] = useState({});
  const [checklistOk, setChecklistOk] = useState({});
  const [loadingId, setLoadingId] = useState(null);
  const [showNovaOP, setShowNovaOP] = useState(false);
  const [novaOP, setNovaOP] = useState({ produto_id: '', produto_nome: '', quantidade: 1, observacoes: '' });
  const [salvando, setSalvando] = useState(false);
  const [variacoesOP, setVariacoesOP] = useState([]);
  const [filtroOrigem, setFiltroOrigem] = useState('todas');
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [busca, setBusca] = useState('');
  const [ordemSelecionada, setOrdemSelecionada] = useState(null);
  const [sortKey, setSortKey] = useState('urgencia');
  const [showFilters, setShowFilters] = useState(false);
  const [showTotal, setShowTotal] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [colunasVisiveis, setColunasVisiveis] = useState(() => {
    const todasKeys = buildColunas().map((c) => c.key);
    try {
      const salvas = JSON.parse(localStorage.getItem('kanban_colunas'));
      if (!salvas) return todasKeys;
      // Garante que colunas novas (não presentes no cache) sejam adicionadas como visíveis
      const novas = todasKeys.filter((k) => !salvas.includes(k));
      return [...salvas.filter((k) => todasKeys.includes(k)), ...novas];
    } catch {return todasKeys;}
  });

  useEffect(() => {
    const onSettings = () => {
      const novas = buildColunas();
      setKanbanColunas(novas);
      setColunasVisiveis((prev) => {
        const keysNovas = novas.map((c) => c.key);
        const adicionadas = keysNovas.filter((k) => !prev.includes(k));
        return [...prev.filter((k) => keysNovas.includes(k)), ...adicionadas];
      });
    };
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('settings:saved', onSettings);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('settings:saved', onSettings);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const toggleColuna = (key) => {
    setColunasVisiveis((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      localStorage.setItem('kanban_colunas', JSON.stringify(next));
      return next;
    });
  };

  const COLUNAS = kanbanColunas.filter((c) => colunasVisiveis.includes(c.key));

  // Etapas que disparam WhatsApp — lidas da config salva em Configurações
  const waCfgGlobal = (() => {
    try {return JSON.parse(localStorage.getItem('whatsapp_kanban_config') || '{}');} catch {return {};}
  })();
  const ETAPAS_WHATSAPP = Array.isArray(waCfgGlobal.etapas_notificar) ? waCfgGlobal.etapas_notificar : ['produzido', 'finalizado'];
  const WHATSAPP_NOTIFICAR_CLIENTE = waCfgGlobal.notificar_cliente !== false;
  const WHATSAPP_NUMEROS_INTERNOS = waCfgGlobal.numeros_internos || [];

  const load = async (invalidate = false) => {
    if (invalidate) {cacheInvalidate('OrdemProducao');cacheInvalidate('Produto');cacheInvalidate('Pedido');}
    const [ords, prods, checklists, peds] = await Promise.all([
    cachedFetch('OrdemProducao', () => base44.entities.OrdemProducao.list('-created_date'), 30_000),
    cachedFetch('Produto', () => base44.entities.Produto.list(), 120_000),
    cachedFetch('ChecklistConfig', () => base44.entities.ChecklistConfig.list(), 300_000),
    cachedFetch('Pedido', () => base44.entities.Pedido.list(), 60_000)]
    );
    setOrdens(ords);
    setProdutos(prods);
    const pm = {};
    for (const p of peds) pm[p.id] = { nome: p.cliente_nome, cliente_id: p.cliente_id };
    setPedidoMap(pm);
    const map = {};
    for (const c of checklists) map[c.etapa] = c;
    setChecklistConfigs(map);
  };

  useEffect(() => {load();}, []);

  const avancarStatus = async (ordem, descarte = null) => {
    const proximo = PROXIMOS[ordem.status];
    if (!proximo) return;

    // ── Otimistic UI: Atualiza imediatamente na UI ──
    setOrdens((prev) => prev.map((o) => o.id === ordem.id ? { ...o, status: proximo } : o));
    setLoadingId(ordem.id);

    const agora = agoraISO();
    const updates = { status: proximo };
    let usuarioAtual = 'sistema';
    try {const me = await base44.auth.me();usuarioAtual = me?.email || me?.full_name || 'sistema';} catch {}

    const colunaProximo = kanbanColunas.find((c) => c.key === proximo);
    const acaoProximo = colunaProximo?.acao || '';

    // ── Registrar data de início ────────────────────────────────────────────
    if (acaoProximo === 'registrar_data_inicio') updates.data_inicio = agora;

    // ── Produzido: finaliza produção + entrada no estoque ──────────────────
    if (acaoProximo === 'registrar_data_fim_producao') {
      updates.data_fim_producao = agora;
      updates.lote = ordem.lote || gerarLote(ordem.produto_id);
      cacheInvalidate('Produto');
      const produtosFrescos = await cachedFetch('Produto', () => base44.entities.Produto.list(), 0);
      const itensOP = ordem.itens && ordem.itens.length > 0 ?
      ordem.itens :
      ordem.produto_id ? [{ produto_id: ordem.produto_id, produto_nome: ordem.produto_nome, quantidade: ordem.quantidade }] : [];
      // Paralelo: atualiza estoque de todos os itens ao mesmo tempo
      await Promise.all(itensOP.map(async (item) => {
        const prod = produtosFrescos.find((p) => p.id === item.produto_id);
        if (!prod) return;
        const descarteItem = Array.isArray(descarte) ? descarte.find((d) => d.produto_id === item.produto_id) : null;
        const qtdDescartada = descarteItem?.quantidade || 0;
        const qtdFinal = item.quantidade - qtdDescartada;
        await base44.entities.Produto.update(prod.id, { estoque_atual: (prod.estoque_atual || 0) + qtdFinal });
        registrarLog('Produto', prod.id, 'ENTRADA_ESTOQUE', `Entrada de ${qtdFinal} un de ${prod.nome} via OP ${ordem.numero}${qtdDescartada > 0 ? ` (${qtdDescartada} un descartadas)` : ''}`).catch(() => {});
      }));
    }

    // ── Embalagem: registrar data ───────────────────────────────────────────
    if (acaoProximo === 'registrar_data_embalagem') updates.data_embalagem = agora;

    // ── Em Separação: gerar etiqueta + saída do estoque ────────────────────
    if (acaoProximo === 'saida_estoque') {
      const lote = ordem.lote || gerarLote(ordem.id);
      const dataProducao = hojeData();
      cacheInvalidate('Produto');
      const produtosFrescos = await cachedFetch('Produto', () => base44.entities.Produto.list(), 0);
      const itensOP = ordem.itens && ordem.itens.length > 0 ?
      ordem.itens :
      ordem.produto_id ? [{ produto_id: ordem.produto_id, produto_nome: ordem.produto_nome, quantidade: ordem.quantidade }] : [];
      // Paralelo: atualiza estoque e cria etiquetas ao mesmo tempo
      await Promise.all(itensOP.map(async (item) => {
        const prod = produtosFrescos.find((p) => p.id === item.produto_id);
        const sku = prod?.codigo ? String(prod.codigo) : '';
        const [,] = await Promise.all([
        prod ?
        base44.entities.Produto.update(prod.id, { estoque_atual: Math.max(0, (prod.estoque_atual || 0) - item.quantidade) }).
        then(() => registrarLog('Produto', prod.id, 'SAIDA_ESTOQUE', `Saída de ${item.quantidade} un de ${prod.nome} via separação OP ${ordem.numero}`).catch(() => {})) :
        Promise.resolve(),
        base44.entities.Etiqueta.create({
          ordem_producao_id: ordem.id, produto_id: item.produto_id,
          produto_nome: item.produto_nome, quantidade: item.quantidade,
          lote, data_producao: dataProducao, codigo_barras: sku, impresso: false
        })]
        );
      }));
    }

    // ── Finalizado: cria expedição automaticamente ─────────────────────────
    if (acaoProximo === 'finalizar_expedicao') {
      updates.data_finalizacao = agora;
      if (ordem.pedido_id) {
        const todosPedidos = await base44.entities.Pedido.list();
        const ped = todosPedidos.find((p) => p.id === ordem.pedido_id);
        if (ped) {
          const todasOrdens = await base44.entities.OrdemProducao.list();
          const ordens_pedido = todasOrdens.filter((o) => o.pedido_id === ordem.pedido_id);
          const todasFin = ordens_pedido.every((o) => o.id === ordem.id ? true : o.status === proximo);
          if (todasFin) {
            // Atualiza pedido para expedido e cria a expedição automaticamente
            await base44.entities.Pedido.update(ped.id, { status: 'expedido' });
            const numero_nf = gerarNumero('NF');
            const hoje = new Date().toISOString().split('T')[0];
            const expedicao = await base44.entities.Expedicao.create({
              numero_nf,
              pedido_id: ped.id,
              pedido_numero: ped.numero,
              cliente_id: ped.cliente_id || '',
              cliente_nome: ped.cliente_nome,
              itens: ped.itens || [],
              status: 'emitida',
              data_emissao: hoje,
              valor_total: ped.valor_total || 0
            });
            await registrarLog('Expedicao', expedicao.id, 'EXPEDICAO_CRIADA', `Expedição NF ${numero_nf} criada automaticamente ao finalizar OP ${ordem.numero}`);
            await registrarLog('Pedido', ped.id, 'STATUS', `Pedido ${ped.numero} expedido automaticamente.`);

            // Disparo WhatsApp — NF emitida automaticamente ao finalizar OP
            try {
              const waCfgExp = (() => {try {return JSON.parse(localStorage.getItem('whatsapp_expedicao_config') || '{}');} catch {return {};}})();
              const etapasNotificarExp = Array.isArray(waCfgExp.etapas_notificar) ? waCfgExp.etapas_notificar : ['enviada', 'entregue'];
              if (etapasNotificarExp.includes('nf_emitida')) {
                let clienteTelefone = null;
                if (waCfgExp.notificar_cliente !== false && ped.cliente_id) {
                  const clientes = await base44.entities.Cliente.filter({ id: ped.cliente_id });
                  clienteTelefone = clientes[0]?.telefone || null;
                }
                base44.functions.invoke('enviarWhatsappExpedicao', {
                  expedicao: { numero_nf, cliente_nome: ped.cliente_nome, pedido_numero: ped.numero },
                  novoStatus: 'nf_emitida',
                  clienteTelefone,
                  numeros_internos: WHATSAPP_NUMEROS_INTERNOS,
                  msg_interno: waCfgExp.msg_interno || null,
                  msg_cliente: waCfgExp.msg_cliente || null
                }).catch(() => {});
              }
            } catch {}
          }
        }
      }
    }

    try {
      // ── Chamada à API (otimistic já aconteceu acima) ──
      await base44.entities.OrdemProducao.update(ordem.id, updates);

      // Atualiza o cache sem re-fetch bloqueante
      const cachedOrdens = cacheGet('OrdemProducao');
      if (cachedOrdens) {
        cacheSet('OrdemProducao', cachedOrdens.map((o) => o.id === ordem.id ? { ...o, ...updates } : o));
      }

      const labelProximo = kanbanColunas.find((c) => c.key === proximo)?.label || proximo;
      // Log e WhatsApp são fire-and-forget — não bloqueiam a UI
      registrarLog('OrdemProducao', ordem.id, 'AVANCO_STATUS', `OP ${ordem.numero} (${ordem.produto_nome || ''}) avançou para "${labelProximo}" por ${usuarioAtual}`, usuarioAtual).catch(() => {});

      if (ETAPAS_WHATSAPP.includes(proximo)) {
        (async () => {
          try {
            const pedInfo = ordem.pedido_id ? pedidoMap[ordem.pedido_id] : null;
            const clienteNome = pedInfo?.nome || null;
            let clienteTelefone = null;
            if (pedInfo?.cliente_id) {
              const clientes = await base44.entities.Cliente.filter({ id: pedInfo.cliente_id });
              clienteTelefone = clientes[0]?.telefone || null;
            }
            base44.functions.invoke('enviarWhatsappKanban', {
              ordem: { numero: ordem.numero, produto_nome: ordem.produto_nome, quantidade: ordem.quantidade },
              novoStatus: proximo,
              clienteNome,
              clienteTelefone: WHATSAPP_NOTIFICAR_CLIENTE ? clienteTelefone : null,
              numeros_internos: WHATSAPP_NUMEROS_INTERNOS,
              msg_interno: waCfgGlobal.msg_interno || null,
              msg_cliente: waCfgGlobal.msg_cliente || null
            }).catch(() => {});
          } catch {}
        })();
      }

      // Background refresh sem bloquear a UI
      load(true).catch(() => {});
    } catch (error) {
      // Se a API falhar, desfazer a mudança otimista
      setOrdens((prev) => prev.map((o) => o.id === ordem.id ? { ...o, status: ordem.status } : o));
      console.error('Erro ao avançar status:', error);
    } finally {
      setLoadingId(null);
    }
  };

  const cancelarOP = async (ordem) => {
    if (!podeGerenciarProducao) return;
    if (!confirm(`Cancelar a ordem ${ordem.numero}?`)) return;
    setOrdens((prev) => prev.filter((o) => o.id !== ordem.id));
    await base44.entities.OrdemProducao.update(ordem.id, { status: 'cancelado' });
    if (ordem.pedido_id) {
      await base44.entities.Pedido.update(ordem.pedido_id, { status: 'cancelado' }).catch(() => {});
    }
    await registrarLog('OrdemProducao', ordem.id, 'CANCELAMENTO', `OP ${ordem.numero} cancelada por ${user?.email || 'usuário'}`);
    load(true).catch(() => {});
  };

  const criarOPManual = async () => {
    if (!novaOP.produto_id) return alert('Selecione um produto.');
    const temVariacoes = variacoesOP.length > 0;
    if (temVariacoes && variacoesOP.some((v) => !v.quantidade || v.quantidade <= 0)) return alert('Informe a quantidade de cada variação.');else
    if (!temVariacoes && novaOP.quantidade <= 0) return alert('Informe a quantidade.');
    setSalvando(true);
    const qtdTotal = temVariacoes ? variacoesOP.reduce((s, v) => s + (v.quantidade || 0), 0) : novaOP.quantidade;
    const itens = temVariacoes ?
    variacoesOP.map((v) => ({ produto_id: novaOP.produto_id, produto_nome: `${novaOP.produto_nome} ${v.nome}`, quantidade: v.quantidade })) :
    [];
    const op = await base44.entities.OrdemProducao.create({
      numero: gerarNumero('OP'), produto_id: novaOP.produto_id, produto_nome: novaOP.produto_nome,
      quantidade: qtdTotal, variacoes: temVariacoes ? variacoesOP : [], itens,
      observacoes: novaOP.observacoes, status: 'a_produzir', origem: 'manual'
    });
    await registrarLog('OrdemProducao', op.id, 'CRIACAO_MANUAL', `OP manual para ${novaOP.produto_nome} — qtd ${qtdTotal}`);
    setShowNovaOP(false);
    setNovaOP({ produto_id: '', produto_nome: '', quantidade: 1, observacoes: '' });
    setVariacoesOP([]);
    await load(true);
    setSalvando(false);
  };

  // Categorias de produtos disponíveis nas OPs
  const categoriasOP = [...new Set(
    ordens.map((o) => {
      const p = produtos.find((pr) => pr.id === o.produto_id);
      return p?.categoria || null;
    }).filter(Boolean)
  )].sort();

  const ordensFiltradas = sortOrdens(
    ordens.filter((o) => {
      if (busca && !(
      (o.produto_nome || '').toLowerCase().includes(busca.toLowerCase()) ||
      (o.numero || '').toLowerCase().includes(busca.toLowerCase()) ||
      (o.pedido_numero || '').toLowerCase().includes(busca.toLowerCase())))
      return false;
      if (filtroOrigem !== 'todas' && o.origem !== filtroOrigem) return false;
      if (filtroCategoria !== 'todas') {
        const p = produtos.find((pr) => pr.id === o.produto_id);
        if ((p?.categoria || '') !== filtroCategoria) return false;
      }
      return true;
    }),
    sortKey
  );

  const colunasFinais = kanbanColunas.filter((c) => c.acao === 'entrada_estoque' || c.key === 'finalizado').map((c) => c.key);
  const ativas = ordens.filter((o) => !colunasFinais.includes(o.status)).length;
  const finalizadas = ordens.filter((o) => colunasFinais.includes(o.status)).length;
  const filtrosAtivos = busca || filtroOrigem !== 'todas' || filtroCategoria !== 'todas' || sortKey !== 'urgencia';

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header */}
      <div className="bg-card border border-border rounded-2xl px-4 md:px-5 py-4 flex-shrink-0">
        <div className="flex items-center justify-between flex-wrap gap-2 md:gap-3">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <div className="w-9 md:w-10 h-9 md:h-10 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Factory size={18} className="text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base md:text-lg font-bold text-foreground truncate">Kanban de Produção</h2>
              <p className="text-xs text-muted-foreground">{ativas} ativa(s) · {finalizadas} finalizada(s)</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2 flex-wrap justify-end">
            

            
            {!isMobile &&
            <>
                <button onClick={() => setShowFilters((v) => !v)}
              className={`flex items-center gap-2 border px-3 py-2.5 rounded-xl text-xs md:text-sm font-medium transition-colors ${filtrosAtivos ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border hover:bg-muted text-muted-foreground'}`}>
                  <SlidersHorizontal size={15} /> Filtros {filtrosAtivos && <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />}
                </button>
                <button onClick={() => setShowTotal(true)}
              className="hidden md:flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 px-3 py-2.5 rounded-xl text-xs md:text-sm font-semibold hover:bg-blue-100 transition-colors">
                  <BarChart2 size={16} /> Total
                </button>
              </>
            }
            {isMobile &&
            <button onClick={() => setShowFilters((v) => !v)} className={`p-2 border rounded-lg ${filtrosAtivos ? 'bg-primary/10 border-primary/30' : 'border-border'}`}>
                <SlidersHorizontal size={15} className={filtrosAtivos ? 'text-primary' : 'text-muted-foreground'} />
              </button>
            }
            {!readonly &&
            <button onClick={() => setShowNovaOP(true)}
            className="flex items-center gap-1 bg-primary text-primary-foreground px-3 py-2 md:px-4 md:py-2.5 rounded-lg md:rounded-xl text-xs md:text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm flex-shrink-0">
                <Plus size={15} /> <span className="hidden sm:inline">OP</span>
              </button>
            }
          </div>
        </div>

        {/* Progress bars */}
        <div className={`mt-4 grid gap-2 ${isMobile ? 'grid-cols-3 md:grid-cols-5' : 'grid-cols-5'}`}>
          {kanbanColunas.map((col) => {
            const count = ordens.filter((o) => o.status === col.key).length;
            const pct = ordens.length > 0 ? Math.round(count / ordens.length * 100) : 0;
            return (
              <div key={col.key} className="text-center">
                <div className="h-1.5 rounded-full mb-1.5 overflow-hidden bg-muted">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: col.accent }} />
                </div>
                <p className="text-base md:text-lg font-bold text-foreground">{count}</p>
                <p className="text-[9px] md:text-[10px] text-muted-foreground leading-tight hidden sm:block">{col.label}</p>
              </div>);

          })}
        </div>
      </div>

      {/* Painel de filtros */}
      {showFilters &&
      <div className="bg-card border border-border rounded-2xl p-3 md:p-4 flex-shrink-0 space-y-3 max-h-96 md:max-h-none overflow-y-auto md:overflow-y-visible">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Filtros e Ordenação</p>
            {filtrosAtivos &&
          <button onClick={() => {setBusca('');setFiltroOrigem('todas');setFiltroCategoria('todas');setSortKey('urgencia');}}
          className="text-xs text-muted-foreground hover:text-destructive">Limpar tudo</button>
          }
          </div>

          {/* Busca */}
          <div className="flex items-center gap-2.5 bg-muted/30 border border-border rounded-xl px-3.5 py-2.5">
            <Search size={14} className="text-muted-foreground flex-shrink-0" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por OP, produto ou pedido..."
          className="bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground w-full" />
            {busca && <button onClick={() => setBusca('')} className="text-muted-foreground hover:text-foreground"><X size={13} /></button>}
          </div>

          <div className="flex flex-wrap gap-4">
            {/* Origem */}
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Origem</p>
              <div className="flex gap-1.5 flex-wrap">
                {[{ k: 'todas', l: 'Todas' }, { k: 'pedido', l: 'Pedido' }, { k: 'estoque_minimo', l: 'Reposição' }, { k: 'manual', l: 'Manual' }].map((f) =>
              <button key={f.k} onClick={() => setFiltroOrigem(f.k)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${filtroOrigem === f.k ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
                    {f.l}
                  </button>
              )}
              </div>
            </div>

            {/* Categoria */}
            {categoriasOP.length > 0 &&
          <div>
                <p className="text-xs text-muted-foreground mb-1.5">Categoria</p>
                <div className="flex gap-1.5 flex-wrap">
                  <button onClick={() => setFiltroCategoria('todas')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${filtroCategoria === 'todas' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
                    Todas
                  </button>
                  {categoriasOP.map((cat) =>
              <button key={cat} onClick={() => setFiltroCategoria(cat)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${filtroCategoria === cat ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
                      {cat}
                    </button>
              )}
                </div>
              </div>
          }

            {/* Ordenação */}
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Ordenar por</p>
              <div className="flex gap-1.5 flex-wrap">
                {SORT_OPTIONS.map((opt) =>
              <button key={opt.key} onClick={() => setSortKey(opt.key)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${sortKey === opt.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
                    {opt.label}
                  </button>
              )}
              </div>
            </div>

            {/* Colunas visíveis */}
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Colunas visíveis</p>
              <div className="flex gap-1.5 flex-wrap">
                {kanbanColunas.map((col) => {
                const vis = colunasVisiveis.includes(col.key);
                return (
                  <button key={col.key} onClick={() => toggleColuna(col.key)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${vis ? 'text-white' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
                  style={vis ? { background: col.accent } : {}}>
                      {vis ? <Eye size={10} /> : <EyeOff size={10} />} {col.label}
                    </button>);

              })}
              </div>
            </div>
          </div>
        </div>
      }

      {/* Colunas Kanban */}
      <div className={`flex gap-3 overflow-x-auto pb-4 flex-1 min-h-0 items-start ${isMobile ? 'snap-x snap-mandatory' : ''}`}>
        {COLUNAS.map(({ key, label, icon: Icon, accent, bg, border, dot }) => {
          const colOrdens = ordensFiltradas.filter((o) => o.status === key);
          const total = ordens.filter((o) => o.status === key).length;
          const colWidth = isMobile ? 'w-80 sm:w-96' : 'w-72';
          const colHeight = isMobile ? 'calc(100vh - 280px)' : 'calc(100vh - 260px)';

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
                {colOrdens.length === 0 ?
                <div className="flex flex-col items-center justify-center py-8 md:py-16 opacity-30">
                    <div className="w-8 md:w-10 h-8 md:h-10 rounded-full border-2 border-dashed flex items-center justify-center mb-2" style={{ borderColor: accent }}>
                      <Icon size={14} style={{ color: accent }} />
                    </div>
                    <p className="text-xs text-muted-foreground">Sem ordens</p>
                  </div> :
                colOrdens.map((ordem) =>
                <KanbanCard
                  key={ordem.id}
                  ordem={ordem}
                  clienteNome={ordem.pedido_id ? pedidoMap[ordem.pedido_id]?.nome : null}
                  checklistConfigs={checklistConfigs}
                  checklistOk={checklistOk}
                  setChecklistOk={setChecklistOk}
                  onAvancar={readonly ? null : avancarStatus}
                  loading={loadingId === ordem.id}
                  onOpenModal={() => setOrdemSelecionada(ordem)}
                  labelBotao={PROXIMOS[key] ? `→ ${kanbanColunas.find((c) => c.key === PROXIMOS[key])?.label || ''}` : null}
                  acaoAtual={kanbanColunas.find((c) => c.key === key)?.acao || ''}
                  onCancelar={key === 'a_produzir' && podeGerenciarProducao && !readonly ? cancelarOP : null} />

                )}
              </div>
            </div>);

        })}
      </div>

      {/* Modal Nova OP */}
      {showNovaOP &&
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-bold text-foreground">Nova Ordem de Produção</h3>
              <button onClick={() => setShowNovaOP(false)} className="p-1.5 hover:bg-muted rounded-lg">
                <X size={16} className="text-muted-foreground" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Produto *</label>
                <select value={novaOP.produto_id}
              onChange={(e) => {
                const p = produtos.find((p) => p.id === e.target.value);
                setNovaOP((n) => ({ ...n, produto_id: e.target.value, produto_nome: p ? p.nome : '' }));
                if (p?.variacoes?.length > 0) setVariacoesOP(p.variacoes.map((v) => ({ nome: v, quantidade: 0 })));else
                setVariacoesOP([]);
              }}
              className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="">Selecione um produto...</option>
                  {produtos.map((p) => <option key={p.id} value={p.id}>{p.nome} — Est: {p.estoque_atual || 0}</option>)}
                </select>
              </div>
              {variacoesOP.length > 0 ?
            <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Quantidade por variação *</label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {variacoesOP.map((v, i) =>
                <div key={i} className="flex items-center gap-3 bg-muted/40 rounded-xl px-3 py-2.5">
                        <span className="text-sm font-medium text-foreground flex-1">{v.nome}</span>
                        <input type="number" min="0" value={v.quantidade}
                  onChange={(e) => setVariacoesOP((prev) => prev.map((x, j) => j === i ? { ...x, quantidade: Number(e.target.value) } : x))}
                  className="w-20 border border-border rounded-lg px-2 py-1.5 text-sm bg-background text-center focus:outline-none focus:ring-2 focus:ring-primary" />
                      </div>
                )}
                  </div>
                </div> :

            <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Quantidade *</label>
                  <input type="number" min="1" value={novaOP.quantidade}
              onChange={(e) => setNovaOP((n) => ({ ...n, quantidade: Number(e.target.value) }))}
              className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
            }
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Observações</label>
                <textarea rows={2} value={novaOP.observacoes}
              onChange={(e) => setNovaOP((n) => ({ ...n, observacoes: e.target.value }))}
              className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={criarOPManual} disabled={salvando}
              className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
                  {salvando ? 'Criando...' : 'Criar Ordem de Produção'}
                </button>
                <button onClick={() => {setShowNovaOP(false);setVariacoesOP([]);}}
              className="px-4 border border-border rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      }

      {showTotal && <ModalTotalProducao ordens={ordens} checklistOk={checklistOk} onClose={() => setShowTotal(false)} />}

      {ordemSelecionada &&
      <KanbanCardModal
        ordem={ordemSelecionada}
        checklistConfigs={checklistConfigs}
        produtos={produtos}
        kanbanColunas={kanbanColunas}
        clienteNome={ordemSelecionada.pedido_id ? pedidoMap[ordemSelecionada.pedido_id]?.nome : null}
        onAvancar={readonly ? null : async (ordem, descarte) => {await avancarStatus(ordem, descarte);setOrdemSelecionada(null);}}
        loading={loadingId === ordemSelecionada.id}
        onClose={() => setOrdemSelecionada(null)} />

      }
    </div>);

}