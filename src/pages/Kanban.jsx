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
import { readStagesLocal, loadKanbanFluxo, getIcon } from '@/lib/kanbanFluxo';
import PullToRefresh from '@/components/PullToRefresh';

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

// Kanban de Produção — fluxo completo: produção, embalagem, separação e finalização.
// Entrada no estoque ocorre ao mover para "Produzido"; saída ao mover para "Em Separação".
const COLUNAS_DEFAULT = [
{ key: 'a_produzir',   label: 'Aguardando Produção', cor: 0, icone: 'Clock',       acao: 'nenhuma' },
{ key: 'em_producao',  label: 'Em Produção',         cor: 1, icone: 'Factory',     acao: 'registrar_data_inicio' },
{ key: 'produzido',    label: 'Produzido',           cor: 2, icone: 'CheckCircle', acao: 'registrar_data_fim_producao' },
{ key: 'em_embalagem', label: 'Em Embalagem',        cor: 3, icone: 'Package',     acao: 'registrar_data_embalagem' },
{ key: 'em_separacao', label: 'Em Separação',        cor: 7, icone: 'Layers',      acao: 'saida_estoque' },
{ key: 'finalizado',   label: 'Finalizado',          cor: 4, icone: 'Flag',        acao: 'finalizar_expedicao' }];


function buildColunas() {
  // Lê da config centralizada (kanbanFluxo.js), que preserva o campo `acao` essencial para as automações.
  const stages = readStagesLocal('producao');
  if (stages && stages.length > 0) {
    return stages.map((c) => {
      const cores = CORES_OPCOES[c.cor] || CORES_OPCOES[0];
      return { ...c, icon: getIcon(c.icone), ...cores };
    });
  }
  return COLUNAS_DEFAULT.map((c) => {
    const cores = CORES_OPCOES[c.cor] || CORES_OPCOES[0];
    return { ...c, icon: getIcon(c.icone), ...cores };
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
  const [grupoMap, setGrupoMap] = useState({});
  const [grupoMapById, setGrupoMapById] = useState({});
  const [checklistConfigs, setChecklistConfigs] = useState({});
  const [checklistOk, setChecklistOk] = useState({});
  const [loadingId, setLoadingId] = useState(null);
  const [showNovaOP, setShowNovaOP] = useState(false);
  const [novaOP, setNovaOP] = useState({ produto_id: '', produto_nome: '', quantidade: 1, observacoes: '' });
  const [buscaProdutoOP, setBuscaProdutoOP] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [variacoesOP, setVariacoesOP] = useState([]);
  const [filtroOrigem, setFiltroOrigem] = useState('todas');
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [busca, setBusca] = useState('');
  const [ordemSelecionada, setOrdemSelecionada] = useState(null);
  const [sortKey, setSortKey] = useState('created_date_asc');
  const [showFilters, setShowFilters] = useState(true);
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

  // Carrega a config do banco (fonte canônica) e espelha para o localStorage
  useEffect(() => {
    loadKanbanFluxo('producao').then(({ stages }) => {
      localStorage.setItem('kanban_colunas_config', JSON.stringify(
        stages.map((s) => ({ key: s.key, label: s.label, cor: s.cor, icone: s.icone, acao: s.acao || 'nenhuma', acoes: Array.isArray(s.acoes) ? s.acoes : [] }))
      ));
      const novas = buildColunas();
      setKanbanColunas(novas);
      setColunasVisiveis((prev) => {
        const keys = novas.map((c) => c.key);
        const adicionadas = keys.filter((k) => !prev.includes(k));
        return [...prev.filter((k) => keys.includes(k)), ...adicionadas];
      });
    }).catch(() => {});
  }, []);

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
    const [ords, prods, checklists, peds, gps] = await Promise.all([
    cachedFetch('OrdemProducao', () => base44.entities.OrdemProducao.list('-created_date'), 30_000),
    cachedFetch('Produto', () => base44.entities.Produto.list(), 120_000),
    cachedFetch('ChecklistConfig', () => base44.entities.ChecklistConfig.list(), 300_000),
    cachedFetch('Pedido', () => base44.entities.Pedido.list(), 60_000),
    base44.entities.GrupoPedidos.list().catch(() => [])]
    );
    setOrdens(ords);
    setProdutos(prods);
    const pm = {};
    for (const p of peds) pm[p.id] = { nome: p.cliente_nome, cliente_id: p.cliente_id, white_label: p.white_label, white_label_marca: p.white_label_marca, observacoes: p.observacoes };
    setPedidoMap(pm);
    const gm = {};
    const gmById = {};
    for (const g of gps.filter(g => g.status !== 'desfeito')) {
      gmById[g.id] = g;
      for (const pid of (g.pedidos_ids || [])) gm[pid] = g;
    }
    setGrupoMap(gm);
    setGrupoMapById(gmById);
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
    // Suporta múltiplas ações por etapa (campo `acoes`), com fallback para `acao` legado
    const acoesProximo = Array.isArray(colunaProximo?.acoes) && colunaProximo.acoes.length > 0
      ? colunaProximo.acoes
      : (colunaProximo?.acao && colunaProximo.acao !== 'nenhuma' ? [colunaProximo.acao] : []);
    const temAcao = (a) => acoesProximo.includes(a);
    const acaoProximo = acoesProximo[0] || '';

    // ── Registrar data de início ────────────────────────────────────────────
    if (temAcao('registrar_data_inicio')) updates.data_inicio = agora;

    // ── Produzido: finaliza produção + entrada no estoque ──────────────────
    if (temAcao('registrar_data_fim_producao') || temAcao('finalizar_producao')) {
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

    // ── Produção Finalizada: envia automaticamente para o Kanban de Separação ──
    if (temAcao('finalizar_producao')) {
      import('@/lib/separacao').then(({ criarSeparacaoFromOP }) => {
        criarSeparacaoFromOP({ ...ordem, ...updates }).catch((e) => console.warn('Erro ao criar separação:', e.message));
      });
    }

    // ── Embalagem: registrar data ───────────────────────────────────────────
    if (temAcao('registrar_data_embalagem')) updates.data_embalagem = agora;

    // ── Em Separação: gerar etiqueta + saída do estoque ────────────────────
    if (temAcao('saida_estoque')) {
      const lote = ordem.lote || gerarLote(ordem.id);
      const dataProducao = hojeData();
      cacheInvalidate('Produto');
      const produtosFrescos = await cachedFetch('Produto', () => base44.entities.Produto.list(), 0);
      
      // Se a ordem veio com itens editados do modal, salva primeiro na OP
      const itensParaProcessar = ordem.itens && ordem.itens.length > 0 ? ordem.itens :
        ordem.produto_id ? [{ produto_id: ordem.produto_id, produto_nome: ordem.produto_nome, quantidade: ordem.quantidade }] : [];
      
      // Atualiza a OP com os itens editados antes de prosseguir
      if (ordem.itens && ordem.itens.length > 0) {
        await base44.entities.OrdemProducao.update(ordem.id, { itens: ordem.itens });
      }
      
      const itensOP = itensParaProcessar;
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

    // ── Finalizado: marca pedido como "separado" para liberar expedição em Pedidos ──
    if (temAcao('finalizar_expedicao')) {
      updates.data_finalizacao = agora;
      // Alocação parcial: mescla as quantidades produzidas na Separação que aguardava produção
      const { concluirProducaoParaSeparacao } = await import('@/lib/alocacaoPedido');
      const mesclou = await concluirProducaoParaSeparacao(ordem).catch(() => false);
      if (mesclou && ordem.pedido_id) {
        await base44.entities.Pedido.update(ordem.pedido_id, { status: 'separacao' }).catch(() => {});
        await registrarLog('Pedido', ordem.pedido_id, 'STATUS', `Produção da OP ${ordem.numero} concluída — pedido completo e pronto para separação.`);
      } else if (ordem.pedido_id) {
        const todosPedidos = await base44.entities.Pedido.list();
        const ped = todosPedidos.find((p) => p.id === ordem.pedido_id);
        if (ped) {
          const todasOrdens = await base44.entities.OrdemProducao.list();
          const ordens_pedido = todasOrdens.filter((o) => o.pedido_id === ordem.pedido_id);
          const todasFin = ordens_pedido.every((o) => o.id === ordem.id ? true : o.status === proximo);
          if (todasFin) {
            // Produção concluída: pedido vai para "separado" — Expedição é feita pela área de Pedidos
            await base44.entities.Pedido.update(ped.id, { status: 'separado' });
            await registrarLog('Pedido', ped.id, 'STATUS', `Pedido ${ped.numero} separado pela Produção. Aguardando expedição.`);
          }
        }
      }
    }

    try {
      // ── Chamada à API (otimistic já aconteceu acima) ──
      await base44.entities.OrdemProducao.update(ordem.id, updates);

      // Regras de Automação (Configurações > Regras de Automação) — fire-and-forget
      import('@/lib/regrasAutomacao').then(({ executarRegrasCardMovido }) =>
        executarRegrasCardMovido('producao', { ...ordem, ...updates }, proximo).catch(() => {}));

      // ── Sincronização de status do Pedido (configurada em Configurações > Kanban) ──
      const statusPedidoConfigurado = colunaProximo?.status_pedido;
      if (statusPedidoConfigurado && ordem.pedido_id && !temAcao('finalizar_expedicao')) {
        // finalizar_expedicao já cuida do status do pedido internamente
        base44.entities.Pedido.update(ordem.pedido_id, { status: statusPedidoConfigurado })
          .then(() => registrarLog('Pedido', ordem.pedido_id, 'STATUS',
            `Status do pedido sincronizado para "${statusPedidoConfigurado}" via avanço da OP ${ordem.numero}`).catch(() => {}))
          .catch(() => {});
      }

      // Sincroniza status_op e quantidade_produzida no GrupoPedidos (fire-and-forget)
      if (ordem.grupo_id) {
        const grupoUpdates = { status_op: proximo };
        if (temAcao('registrar_data_fim_producao')) {
          // Quando OP produzida: atualizar quantidade_produzida no grupo
          const grupo = grupoMapById[ordem.grupo_id];
          if (grupo) {
            const qtdProduzida = ordem.itens?.length > 0
              ? ordem.itens.reduce((s, i) => s + (i.quantidade || 0), 0)
              : (ordem.quantidade || 0);
            grupoUpdates.quantidade_produzida = (grupo.quantidade_produzida || 0) + qtdProduzida;
          }
        }
        base44.entities.GrupoPedidos.update(ordem.grupo_id, grupoUpdates).catch(() => {});
      }

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

  const salvarItensOP = async (ordem, itens) => {
    let usuarioAtual = 'sistema';
    try { const me = await base44.auth.me(); usuarioAtual = me?.email || me?.full_name || 'sistema'; } catch {}
    // Salva itens na OP
    await base44.entities.OrdemProducao.update(ordem.id, { itens });
    // Atualiza cache
    setOrdens(prev => prev.map(o => o.id === ordem.id ? { ...o, itens } : o));
    // Atualiza pedido vinculado se existir
    if (ordem.pedido_id) {
      const todosPedidos = await base44.entities.Pedido.list();
      const ped = todosPedidos.find(p => p.id === ordem.pedido_id);
      if (ped) {
        const novosItens = itens.map(i => {
          const existente = (ped.itens || []).find(pi => pi.produto_id === i.produto_id);
          const preco = existente?.preco_unitario || existente?.valor_unitario || 0;
          return { ...existente, produto_id: i.produto_id, produto_nome: i.produto_nome, quantidade: i.quantidade, preco_unitario: preco, valor_total: preco * i.quantidade };
        });
        const novoTotal = novosItens.reduce((s, i) => s + (i.valor_total || 0), 0);
        await base44.entities.Pedido.update(ped.id, { itens: novosItens, valor_total: novoTotal || ped.valor_total });
      }
    }
    registrarLog('OrdemProducao', ordem.id, 'ITENS_SEPARACAO_SALVOS',
      `Itens da separação salvos por ${usuarioAtual}: ${itens.map(i => `${i.produto_nome} x${i.quantidade}`).join(', ')}`,
      usuarioAtual).catch(() => {});
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

  const colunasFinais = kanbanColunas.filter((c) => {
    const acs = Array.isArray(c.acoes) && c.acoes.length > 0 ? c.acoes : [c.acao];
    return ['finalizar_producao', 'registrar_data_fim_producao', 'finalizar_expedicao', 'entrada_estoque'].some((a) => acs.includes(a)) || c.key === 'finalizado' || c.key === 'producao_finalizada';
  }).map((c) => c.key);
  const ativas = ordens.filter((o) => !colunasFinais.includes(o.status)).length;
  const finalizadas = ordens.filter((o) => colunasFinais.includes(o.status)).length;
  const filtrosAtivos = busca || filtroOrigem !== 'todas' || filtroCategoria !== 'todas' || sortKey !== 'created_date_asc';

  return (
    <PullToRefresh onRefresh={() => load(true)}>
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
          <button onClick={() => {setBusca('');setFiltroOrigem('todas');setFiltroCategoria('todas');setSortKey('created_date_asc');}}
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
                (() => {
                  const gruposEmColuna = {};
                  const ordensNaoAgrupadas = [];
                  for (const ordem of colOrdens) {
                    const grupo = ordem.pedido_id ? grupoMap[ordem.pedido_id] : null;
                    if (grupo) {
                      if (!gruposEmColuna[grupo.id]) gruposEmColuna[grupo.id] = { grupo, ordens: [] };
                      gruposEmColuna[grupo.id].ordens.push(ordem);
                    } else {
                      ordensNaoAgrupadas.push(ordem);
                    }
                  }
                  const renderCard = (ordem) => {
                   const pedInfo = ordem.pedido_id ? pedidoMap[ordem.pedido_id] : null;
                   const ordemEnriquecida = pedInfo
                     ? { ...ordem, white_label: pedInfo.white_label || ordem.white_label, white_label_marca: pedInfo.white_label_marca || ordem.white_label_marca, observacoes_pedido: pedInfo.observacoes }
                     : ordem;
                   return (
                   <KanbanCard
                     key={ordem.id}
                     ordem={ordemEnriquecida}
                     clienteNome={pedInfo?.nome || ordem.cliente_nome || null}
                      checklistConfigs={checklistConfigs}
                      checklistOk={checklistOk}
                      setChecklistOk={setChecklistOk}
                      onAvancar={readonly ? null : avancarStatus}
                      loading={loadingId === ordem.id}
                      onOpenModal={() => setOrdemSelecionada(ordem)}
                      labelBotao={PROXIMOS[key] ? `→ ${kanbanColunas.find((c) => c.key === PROXIMOS[key])?.label || ''}` : null}
                      etapasKeys={kanbanColunas.map((c) => c.key)}
                      acaoAtual={kanbanColunas.find((c) => c.key === key)?.acao || ''}
                      onCancelar={key === 'a_produzir' && podeGerenciarProducao && !readonly ? cancelarOP : null}
                      />
                      );
                      };
                      return (
                    <>
                      {Object.values(gruposEmColuna).map(({ grupo, ordens: ordensGrupo }) => (
                        <div key={`grp-${grupo.id}`} className="border border-violet-300 rounded-2xl overflow-hidden mb-1.5">
                          <div className="px-3 py-2 bg-violet-100 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-xs">🔗</span>
                              <span className="text-xs font-bold text-violet-800 truncate">{grupo.cliente_nome}</span>
                              <span className="text-[10px] text-violet-600">{(grupo.pedidos_numeros || []).map(n => `#${n}`).join(' · ')}</span>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {grupo.ordem_producao_numero && (
                                <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-semibold">
                                  {grupo.ordem_producao_numero}
                                </span>
                              )}
                              <span className="text-[10px] bg-violet-200 text-violet-700 px-1.5 py-0.5 rounded-full font-semibold">
                                {ordensGrupo.length} OP{ordensGrupo.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>
                          <div className="bg-violet-50/40 p-1.5 space-y-1.5">
                            {ordensGrupo.map(renderCard)}
                          </div>
                        </div>
                      ))}
                      {ordensNaoAgrupadas.map(renderCard)}
                    </>
                  );
                })()
                }
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
                {novaOP.produto_id ? (
                  <div className="flex items-center justify-between gap-2 border border-primary/30 bg-primary/5 rounded-xl px-3 py-2.5">
                    <span className="text-sm font-medium text-foreground truncate">{novaOP.produto_nome}</span>
                    <button
                      onClick={() => { setNovaOP((n) => ({ ...n, produto_id: '', produto_nome: '' })); setVariacoesOP([]); setBuscaProdutoOP(''); }}
                      className="text-muted-foreground hover:text-foreground flex-shrink-0">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 border border-border rounded-xl px-3 py-2.5 bg-background">
                      <Search size={14} className="text-muted-foreground flex-shrink-0" />
                      <input
                        autoFocus
                        value={buscaProdutoOP}
                        onChange={(e) => setBuscaProdutoOP(e.target.value)}
                        placeholder="Buscar produto por nome ou código..."
                        className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground" />
                      {buscaProdutoOP && <button onClick={() => setBuscaProdutoOP('')} className="text-muted-foreground hover:text-foreground"><X size={13} /></button>}
                    </div>
                    <div className="mt-2 max-h-52 overflow-y-auto border border-border rounded-xl divide-y divide-border/40 bg-background">
                      {(() => {
                        const q = buscaProdutoOP.trim().toLowerCase();
                        const lista = q
                          ? produtos.filter((p) => (p.nome || '').toLowerCase().includes(q) || (p.codigo || '').toLowerCase().includes(q))
                          : produtos;
                        if (lista.length === 0) return <p className="text-xs text-muted-foreground text-center py-4">Nenhum produto encontrado</p>;
                        return lista.slice(0, 50).map((p) => (
                          <button key={p.id}
                            onClick={() => {
                              setNovaOP((n) => ({ ...n, produto_id: p.id, produto_nome: p.nome }));
                              if (p?.variacoes?.length > 0) setVariacoesOP(p.variacoes.map((v) => ({ nome: v, quantidade: 0 })));
                              else setVariacoesOP([]);
                            }}
                            className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-muted/50 transition-colors">
                            <span className="text-sm text-foreground truncate">{p.nome}</span>
                            <span className="text-[10px] text-muted-foreground flex-shrink-0">Est: {p.estoque_atual || 0}</span>
                          </button>
                        ));
                      })()}
                    </div>
                  </>
                )}
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
        clienteNome={(ordemSelecionada.pedido_id ? pedidoMap[ordemSelecionada.pedido_id]?.nome : null) || ordemSelecionada.cliente_nome || null}
        whiteLabelMarca={ordemSelecionada.pedido_id ? pedidoMap[ordemSelecionada.pedido_id]?.white_label_marca : null}
        isWhiteLabel={!!(ordemSelecionada.pedido_id && pedidoMap[ordemSelecionada.pedido_id]?.white_label)}
        grupoOrigem={ordemSelecionada.grupo_id ? grupoMapById[ordemSelecionada.grupo_id] || null : null}
        onAvancar={readonly ? null : async (ordem, descarte) => {await avancarStatus(ordem, descarte);setOrdemSelecionada(null);}}
        onSalvarItens={readonly ? null : salvarItensOP}
        loading={loadingId === ordemSelecionada.id}
        onClose={() => setOrdemSelecionada(null)} />

      }
    </div>
    </PullToRefresh>);

}