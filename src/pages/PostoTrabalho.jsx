import { useEffect, useState, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { loadKanbanFluxo } from '@/lib/kanbanFluxo';
import { avancarStatusOP } from '@/lib/avancoProducao';
import {
  Factory, ArrowUp, ArrowDown, Lock, CheckCircle2, ChevronDown,
  Package, Layers, Boxes, RefreshCw, AlertTriangle, Save, X, Check,
} from 'lucide-react';

const SUBSTEP_POR_LINHA = {
  '7dias': { key: 'empavilhamento', label: 'Empavilhamento' },
  '21dias': { key: 'empavilhamento', label: 'Empavilhamento' },
  'numero7': { key: 'jogar_grade', label: 'Jogar Grade' },
  'super7': { key: 'jogar_grade', label: 'Jogar Grade' },
  'super25': { key: 'jogar_grade', label: 'Jogar Grade' },
};

// Postos que não são máquinas físicas: embalagem e etiquetagem atendem OPs de
// QUALQUER máquina de origem, então ficam fora da lista de Maquina e filtram
// diretamente por status da OrdemProducao.
const POSTOS_VIRTUAIS = [
  { id: '__maquina_embalagem_7dias__', nome: 'Máquina de Embalagem (7 dias)', virtual: true, statusFiltro: 'em_embalagem', filtroLinha: '7dias', icon: 'Package' },
  { id: '__mesa_embalagem__', nome: 'Mesa de Embalagem', virtual: true, statusFiltro: 'em_embalagem', filtroLinha: null, icon: 'Package' },
  { id: '__etiquetagem__', nome: 'Etiquetagem', virtual: true, statusFiltro: 'em_etiquetagem', filtroLinha: null, icon: 'Boxes' },
];

const STATUS_LABEL = {
  a_produzir: 'Aguardando Produção',
  em_producao: 'Em Produção',
  produzido: 'Produzido',
  em_embalagem: 'Em Embalagem',
  em_etiquetagem: 'Em Etiquetagem',
  finalizado: 'Finalizado',
};

const LINHA_LABEL = {
  '7dias': { nome: '7 Dias', destino: 'Máquina de Embalagem (7 dias)' },
  'numero7': { nome: 'Número 7', destino: 'Mesa de Embalagem' },
  'super7': { nome: 'Super 7', destino: 'Mesa de Embalagem' },
  'super25': { nome: 'Super 25', destino: 'Mesa de Embalagem' },
  '21dias': { nome: '21 Dias', destino: 'Mesa de Embalagem' },
};
const SEM_LINHA_LABEL = { nome: 'Outros (não-vela / sem linha definida)', destino: 'Verificar manualmente' };

function agruparItensPorLinha(itens, produtos) {
  const grupos = new Map();
  itens.forEach((item, idx) => {
    const prod = produtos.find((p) => p.id === item.produto_id);
    const linha = prod?.linha_producao || '__sem_linha__';
    if (!grupos.has(linha)) grupos.set(linha, []);
    grupos.get(linha).push({ ...item, _idx: idx });
  });
  // Ordena: linhas conhecidas primeiro, "sem linha" por último
  return [...grupos.entries()].sort(([a], [b]) => {
    if (a === '__sem_linha__') return 1;
    if (b === '__sem_linha__') return -1;
    return a.localeCompare(b);
  });
}

function prioridadeTier(ordem, pedidoInfo) {
  if (ordem.sem_rotulo) return -1;
  const tipo = pedidoInfo?.tipo_cliente;
  if (tipo === 'A') return 0;
  if (tipo === 'B') return 1;
  if (tipo === 'C') return 2;
  if (ordem.pedido_id) return 3; // pedido sem classificação de cliente: FIFO
  return 4; // OP criada manualmente no Kanban, sem pedido vinculado
}

function ordenarFila(ordens, pedidoMap) {
  return [...ordens].sort((a, b) => {
    const aPos = a.posicao_fila;
    const bPos = b.posicao_fila;
    // Reordenação manual do gerente sempre vence quando definida
    if (aPos != null && bPos != null) return aPos - bPos;
    if (aPos != null) return -1;
    if (bPos != null) return 1;

    const tierA = prioridadeTier(a, pedidoMap[a.pedido_id]);
    const tierB = prioridadeTier(b, pedidoMap[b.pedido_id]);
    if (tierA !== tierB) return tierA - tierB;

    // Dentro do mesmo nível: mais antigo primeiro (FIFO)
    const dateA = new Date(a.created_date || 0).getTime();
    const dateB = new Date(b.created_date || 0).getTime();
    return dateA - dateB;
  });
}

function PinModal({ titulo, descricao, onConfirmar, onCancelar, loading, erro }) {
  const [pin, setPin] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
        <div className="flex items-center gap-2 mb-2">
          <Lock size={20} className="text-amber-600" />
          <h3 className="text-lg font-bold text-slate-800">{titulo}</h3>
        </div>
        {descricao && <p className="text-sm text-slate-500 mb-4">{descricao}</p>}
        <input
          type="password"
          inputMode="numeric"
          autoFocus
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="PIN do gerente"
          className="w-full text-center text-2xl tracking-[0.4em] border-2 border-slate-200 rounded-xl py-3 mb-2 focus:outline-none focus:border-amber-500"
        />
        {erro && <p className="text-sm text-red-600 mb-2 text-center">{erro}</p>}
        <div className="flex gap-2 mt-4">
          <button onClick={onCancelar} className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 font-semibold">
            Cancelar
          </button>
          <button
            onClick={() => onConfirmar(pin)}
            disabled={loading || pin.length < 4}
            className="flex-1 py-3 rounded-xl bg-amber-500 text-white font-semibold disabled:opacity-50"
          >
            {loading ? 'Verificando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function OPCard({ ordem, produto, produtos, cliente, dataPedido, subStep, onConcluir, onToggleItem, processando }) {
  const etapa = ordem.etapa_atual;
  let botaoLabel = null;
  let acao = null;

  const temMultiplosItens = Array.isArray(ordem.itens) && ordem.itens.length > 1;
  const todosItensEmbalados = temMultiplosItens ? ordem.itens.every((i) => i.embalado) : true;

  if (ordem.status === 'em_producao') {
    if (!etapa || etapa === 'producao') {
      botaoLabel = 'Concluir Produção na Máquina';
      acao = 'concluir_maquina';
    } else if (subStep && etapa === subStep.key) {
      botaoLabel = `Concluir ${subStep.label}`;
      acao = 'concluir_substep';
    } else if (etapa) {
      botaoLabel = `Concluir ${etapa.replace(/_/g, ' ')}`;
      acao = 'concluir_substep';
    }
  } else if (ordem.status === 'em_embalagem') {
    botaoLabel = 'Concluir Embalagem';
    acao = 'concluir_embalagem';
  } else if (ordem.status === 'em_etiquetagem') {
    botaoLabel = 'Concluir Etiquetagem';
    acao = 'concluir_etiquetagem';
  }

  const mostrarChecklist = ordem.status === 'em_embalagem' && temMultiplosItens;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-3">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-xs font-bold text-slate-400">OP {ordem.numero || ordem.id?.slice(-6)}</p>
          <p className="text-lg font-bold text-slate-800">{ordem.produto_nome}</p>
          <p className="text-sm text-slate-500">{ordem.quantidade} un{cliente ? ` · ${cliente}` : ''}</p>
          <div className="flex flex-wrap gap-x-3 mt-0.5">
            {dataPedido && (
              <p className="text-xs text-slate-400">Pedido criado em {new Date(dataPedido).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>
            )}
            {ordem.created_date && (
              <p className="text-xs text-slate-400">OP criada em {new Date(ordem.created_date).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>
            )}
          </div>
        </div>
        <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-slate-100 text-slate-600">
          {STATUS_LABEL[ordem.status] || ordem.status}
        </span>
      </div>

      {subStep && etapa === subStep.key && (
        <div className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
          <Layers size={13} /> Aguardando {subStep.label}
        </div>
      )}

      {mostrarChecklist && (
        <div className="mb-3 mt-1 space-y-2.5">
          <p className="text-xs font-bold text-slate-500 px-0.5">
            {ordem.itens.filter((i) => i.embalado).length}/{ordem.itens.length} itens embalados
          </p>
          {agruparItensPorLinha(ordem.itens, produtos).map(([linha, itensGrupo]) => {
            const info = LINHA_LABEL[linha] || SEM_LINHA_LABEL;
            return (
              <div key={linha} className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100">
                <div className="px-3 py-2 bg-slate-50 flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-slate-600">{info.nome} ({itensGrupo.length})</p>
                  <p className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full whitespace-nowrap">→ {info.destino}</p>
                </div>
                {itensGrupo.map((item) => (
                  <button
                    key={item._idx}
                    onClick={() => onToggleItem(ordem, item._idx)}
                    disabled={processando}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left disabled:opacity-50"
                  >
                    <span className={`shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center ${item.embalado ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
                      {item.embalado && <Check size={13} className="text-white" strokeWidth={3} />}
                    </span>
                    <span className={`flex-1 text-sm ${item.embalado ? 'text-slate-400 line-through' : 'text-slate-700 font-medium'}`}>
                      {item.produto_nome}
                    </span>
                    <span className="text-xs font-bold text-slate-400 shrink-0">{item.quantidade} cx</span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {botaoLabel && (
        <button
          onClick={() => onConcluir(ordem, acao)}
          disabled={processando || (mostrarChecklist && !todosItensEmbalados)}
          className="w-full mt-2 py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-40"
          style={{ background: '#0D3B45' }}
        >
          <CheckCircle2 size={18} />
          {processando ? 'Processando...' : mostrarChecklist && !todosItensEmbalados ? 'Marque todos os itens' : botaoLabel}
        </button>
      )}
    </div>
  );
}

function TarugoCard({ maquina, onRegistrarEstoque }) {
  const estoque = maquina.estoque_atual ?? 0;
  const ultimaContagem = maquina.estoque_ultima_contagem;
  const ultimaEm = maquina.estoque_ultima_contagem_em;
  const percentual = ultimaContagem ? Math.max(0, Math.min(100, (estoque / ultimaContagem) * 100)) : 0;
  const [showPin, setShowPin] = useState(false);
  const [showQtd, setShowQtd] = useState(false);
  const [qtd, setQtd] = useState('');

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-3">
        <Boxes size={20} className="text-amber-600" />
        <h3 className="text-lg font-bold text-slate-800">Estoque de Tarugo</h3>
      </div>
      <p className="text-3xl font-black text-slate-800 mb-1">{estoque} <span className="text-base font-medium text-slate-400">velas de consumo</span></p>
      <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden mb-2">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${percentual}%`, background: estoque === 0 ? '#EF4444' : estoque < (ultimaContagem || 0) * 0.2 ? '#F59E0B' : '#22C55E' }}
        />
      </div>
      {estoque === 0 && (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-red-600 mb-2">
          <AlertTriangle size={13} /> Estoque zerado — produção 7 dias travada
        </div>
      )}
      {ultimaEm && (
        <p className="text-xs text-slate-400 mb-3">Última contagem: {new Date(ultimaEm).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>
      )}
      {!showQtd ? (
        <button onClick={() => setShowQtd(true)} className="w-full py-3 rounded-xl bg-slate-100 text-slate-700 font-semibold flex items-center justify-center gap-2">
          <Lock size={16} /> Registrar Contagem (gerente)
        </button>
      ) : (
        <div className="flex gap-2">
          <input
            type="number"
            inputMode="numeric"
            autoFocus
            value={qtd}
            onChange={(e) => setQtd(e.target.value)}
            placeholder="Quantidade"
            className="flex-1 border-2 border-slate-200 rounded-xl px-3 py-2.5 text-lg text-center"
          />
          <button onClick={() => setShowQtd(false)} className="px-3 rounded-xl bg-slate-100"><X size={18} /></button>
          <button
            onClick={() => { setShowPin(true); }}
            disabled={!qtd}
            className="px-4 rounded-xl bg-amber-500 text-white font-semibold disabled:opacity-50"
          >
            <Save size={18} />
          </button>
        </div>
      )}
      {showPin && (
        <PinConfirmWrapper
          titulo="Confirmar contagem de Tarugo"
          descricao={`Registrar estoque: ${qtd} unidades. Só é permitido entre 07:30–08:30 ou 16:30–17:30.`}
          onCancelar={() => setShowPin(false)}
          onSucesso={() => { setShowPin(false); setShowQtd(false); setQtd(''); onRegistrarEstoque(); }}
          invocar={(pin) => base44.functions.invoke('registrarEstoqueTarugo', { quantidade: Number(qtd), pin })}
        />
      )}
    </div>
  );
}

function CaixaMiniCard({ modelo, onAtualizado }) {
  const estoque = modelo.estoque_atual ?? 0;
  const [showPin, setShowPin] = useState(false);
  const [showQtd, setShowQtd] = useState(false);
  const [qtd, setQtd] = useState('');

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3 flex items-center justify-between gap-2">
      <div>
        <p className="text-xs font-semibold text-slate-500">{modelo.nome}</p>
        <p className={`text-xl font-black ${estoque <= 0 ? 'text-red-600' : 'text-slate-800'}`}>{estoque} <span className="text-xs font-medium text-slate-400">cx</span></p>
      </div>
      {!showQtd ? (
        <button onClick={() => setShowQtd(true)} className="p-2 rounded-lg bg-slate-100 text-slate-600"><Lock size={16} /></button>
      ) : (
        <div className="flex items-center gap-1">
          <input
            type="number"
            inputMode="numeric"
            autoFocus
            value={qtd}
            onChange={(e) => setQtd(e.target.value)}
            className="w-16 border-2 border-slate-200 rounded-lg px-1.5 py-1 text-center text-sm"
          />
          <button onClick={() => setShowQtd(false)} className="p-1.5 rounded-lg bg-slate-100"><X size={14} /></button>
          <button onClick={() => setShowPin(true)} disabled={!qtd} className="p-1.5 rounded-lg bg-amber-500 text-white disabled:opacity-50"><Save size={14} /></button>
        </div>
      )}
      {showPin && (
        <PinConfirmWrapper
          titulo="Confirmar contagem de caixa"
          descricao={`${modelo.nome}: registrar ${qtd} caixas.`}
          onCancelar={() => setShowPin(false)}
          onSucesso={() => { setShowPin(false); setShowQtd(false); setQtd(''); onAtualizado(); }}
          invocar={(pin) => base44.functions.invoke('registrarEstoqueCaixa', { modelo_caixa_id: modelo.id, quantidade: Number(qtd), pin })}
        />
      )}
    </div>
  );
}

function PinConfirmWrapper({ titulo, descricao, onCancelar, onSucesso, invocar }) {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const confirmar = async (pin) => {
    setLoading(true);
    setErro('');
    try {
      const res = await invocar(pin);
      const data = res?.data || res;
      if (data?.error) {
        setErro(data.error);
      } else {
        onSucesso();
      }
    } catch (e) {
      setErro(e.message || 'Erro ao processar.');
    } finally {
      setLoading(false);
    }
  };
  return <PinModal titulo={titulo} descricao={descricao} onConfirmar={confirmar} onCancelar={onCancelar} loading={loading} erro={erro} />;
}

function ReordenarFilaModal({ maquina, ordens, onClose, onSalvo }) {
  const [lista, setLista] = useState(ordens);
  const [showPin, setShowPin] = useState(false);

  const mover = (idx, dir) => {
    const nova = [...lista];
    const alvo = idx + dir;
    if (alvo < 0 || alvo >= nova.length) return;
    [nova[idx], nova[alvo]] = [nova[alvo], nova[idx]];
    setLista(nova);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-5 shadow-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800">Reordenar Fila — {maquina.nome}</h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        {lista.map((o, idx) => (
          <div key={o.id} className="flex items-center gap-2 bg-slate-50 rounded-xl p-3 mb-2">
            <span className="text-sm font-bold text-slate-400 w-6">{idx + 1}</span>
            <div className="flex-1">
              <p className="font-semibold text-sm text-slate-800">{o.produto_nome}</p>
              <p className="text-xs text-slate-500">{o.quantidade} un</p>
            </div>
            <button onClick={() => mover(idx, -1)} disabled={idx === 0} className="p-2 rounded-lg bg-white border disabled:opacity-30"><ArrowUp size={16} /></button>
            <button onClick={() => mover(idx, 1)} disabled={idx === lista.length - 1} className="p-2 rounded-lg bg-white border disabled:opacity-30"><ArrowDown size={16} /></button>
          </div>
        ))}
        <button onClick={() => setShowPin(true)} className="w-full mt-3 py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2" style={{ background: '#0D3B45' }}>
          <Lock size={16} /> Salvar Nova Ordem (PIN do gerente)
        </button>
      </div>
      {showPin && (
        <PinConfirmWrapper
          titulo="Confirmar reordenação"
          onCancelar={() => setShowPin(false)}
          onSucesso={() => { setShowPin(false); onSalvo(); }}
          invocar={(pin) => base44.functions.invoke('reordenarFilaMaquina', { maquina_id: maquina.id, ordem_ids: lista.map((o) => o.id), pin })}
        />
      )}
    </div>
  );
}

export default function PostoTrabalho() {
  const { user } = useAuth();
  const [maquinas, setMaquinas] = useState([]);
  const [modelosCaixa, setModelosCaixa] = useState([]);
  const [maquinaId, setMaquinaId] = useState(() => localStorage.getItem('posto_trabalho_maquina_id') || '');
  const [ordens, setOrdens] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [pedidoMap, setPedidoMap] = useState({});
  const [grupoMapById, setGrupoMapById] = useState({});
  const [kanbanColunas, setKanbanColunas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processandoId, setProcessandoId] = useState(null);
  const [showReordenar, setShowReordenar] = useState(false);
  const [showTrocarMaquina, setShowTrocarMaquina] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    const [maqs, prods, peds, gps, stages, caixas, clientes] = await Promise.all([
      base44.entities.Maquina.list(),
      base44.entities.Produto.list(),
      base44.entities.Pedido.list(),
      base44.entities.GrupoPedidos.list().catch(() => []),
      loadKanbanFluxo('producao'),
      base44.entities.ModeloCaixa.list().catch(() => []),
      base44.entities.Cliente.list().catch(() => []),
    ]);
    setMaquinas(maqs);
    setProdutos(prods);
    setModelosCaixa(caixas);
    const clientePorId = {};
    for (const c of clientes) clientePorId[c.id] = c;
    const pm = {};
    for (const p of peds) pm[p.id] = { nome: p.cliente_nome, cliente_id: p.cliente_id, forma_embalagem: p.cliente_id ? clientePorId[p.cliente_id]?.forma_embalagem : null, tipo_cliente: p.cliente_id ? clientePorId[p.cliente_id]?.tipo_cliente : null, data_pedido: p.data_pedido || p.created_date };
    setPedidoMap(pm);
    const gmById = {};
    for (const g of gps) gmById[g.id] = g;
    setGrupoMapById(gmById);
    setKanbanColunas(stages.stages || []);
    setLoading(false);
  }, []);

  const carregarOrdens = useCallback(async (posto, produtosList, pedidoMapAtual) => {
    if (!posto) { setOrdens([]); return; }
    if (posto.tipo_produto === 'tarugo') { setOrdens([]); return; }

    if (posto.virtual) {
      // Embalagem/Etiquetagem: OPs de qualquer máquina de origem, filtradas por status
      let todas = await base44.entities.OrdemProducao.filter({ status: posto.statusFiltro });
      if (posto.filtroLinha) {
        todas = todas.filter((o) => produtosList.find((p) => p.id === o.produto_id)?.linha_producao === posto.filtroLinha);
      }
      // Máquina de Embalagem (7 dias): exclui clientes marcados como "embalagem manual"
      if (posto.id === '__maquina_embalagem_7dias__') {
        todas = todas.filter((o) => {
          const info = o.pedido_id ? pedidoMapAtual[o.pedido_id] : null;
          return info?.forma_embalagem !== 'manual';
        });
      }
      todas = ordenarFila(todas, pedidoMapAtual);
      setOrdens(todas);
      return;
    }

    // Máquina física: apenas as etapas de produção (em_producao/produzido).
    // Embalagem/Etiquetagem são tratadas nos postos virtuais acima, não aqui.
    const todas = await base44.entities.OrdemProducao.filter({ maquina_id: posto.id });
    const ativas = todas.filter((o) => ['em_producao', 'produzido'].includes(o.status));
    setOrdens(ordenarFila(ativas, pedidoMapAtual));
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const postosDisponiveis = useMemo(() => [...POSTOS_VIRTUAIS, ...maquinas.filter((m) => m.ativo !== false)], [maquinas]);
  const maquinaAtual = useMemo(() => postosDisponiveis.find((m) => m.id === maquinaId) || null, [postosDisponiveis, maquinaId]);

  useEffect(() => {
    if (maquinaAtual) carregarOrdens(maquinaAtual, produtos, pedidoMap);
  }, [maquinaAtual, carregarOrdens, produtos, pedidoMap]);

  const escolherMaquina = (id) => {
    localStorage.setItem('posto_trabalho_maquina_id', id);
    setMaquinaId(id);
    setShowTrocarMaquina(false);
  };

  const produtoDe = (ordem) => produtos.find((p) => p.id === ordem.produto_id);

  const toggleItem = async (ordem, idx) => {
    const novosItens = ordem.itens.map((it, i) => i === idx ? { ...it, embalado: !it.embalado } : it);
    setOrdens((prev) => prev.map((o) => o.id === ordem.id ? { ...o, itens: novosItens } : o));
    try {
      await base44.entities.OrdemProducao.update(ordem.id, { itens: novosItens });
    } catch (e) {
      console.error('Erro ao marcar item:', e);
      setOrdens((prev) => prev.map((o) => o.id === ordem.id ? { ...o, itens: ordem.itens } : o));
    }
  };

  const concluir = async (ordem, acao) => {
    setProcessandoId(ordem.id);
    try {
      const produto = produtoDe(ordem);
      const contexto = { kanbanColunas, pedidoMap, grupoMapById, waCfg: {} };

      if (acao === 'concluir_maquina') {
        const sub = SUBSTEP_POR_LINHA[produto?.linha_producao];
        if (sub) {
          await base44.entities.OrdemProducao.update(ordem.id, { etapa_atual: sub.key });
        } else {
          // Sem sub-etapa: avança direto em_producao -> produzido -> em_embalagem
          const r1 = await avancarStatusOP(ordem, contexto);
          const ordemAtualizada = { ...ordem, status: r1.proximo, ...r1.updates };
          await avancarStatusOP(ordemAtualizada, contexto);
          await base44.entities.OrdemProducao.update(ordem.id, { etapa_atual: null });
        }
      } else if (acao === 'concluir_substep') {
        const r1 = await avancarStatusOP(ordem, contexto); // em_producao -> produzido
        const ordemAtualizada = { ...ordem, status: r1.proximo, ...r1.updates };
        await avancarStatusOP(ordemAtualizada, contexto); // produzido -> em_embalagem
        await base44.entities.OrdemProducao.update(ordem.id, { etapa_atual: null });
      } else if (acao === 'concluir_embalagem') {
        await avancarStatusOP(ordem, contexto); // em_embalagem -> em_etiquetagem
      } else if (acao === 'concluir_etiquetagem') {
        await avancarStatusOP(ordem, contexto); // em_etiquetagem -> finalizado
      }
      await carregarOrdens(maquinaAtual, produtos, pedidoMap);
    } catch (e) {
      console.error('Erro ao concluir etapa:', e);
      alert('Erro ao concluir etapa: ' + e.message);
    } finally {
      setProcessandoId(null);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><RefreshCw className="animate-spin text-slate-400" size={28} /></div>;
  }

  if (!maquinaAtual || showTrocarMaquina) {
    return (
      <div className="max-w-md mx-auto py-8">
        <h2 className="text-xl font-bold text-slate-800 mb-1">Selecione o Posto de Trabalho</h2>
        <p className="text-sm text-slate-500 mb-5">Este tablet vai representar este posto.</p>

        <p className="text-xs font-bold text-slate-400 mb-2 mt-1">EMBALAGEM</p>
        <div className="space-y-2 mb-5">
          {POSTOS_VIRTUAIS.map((m) => {
            const Icon = m.icon === 'Boxes' ? Boxes : Package;
            return (
              <button
                key={m.id}
                onClick={() => escolherMaquina(m.id)}
                className="w-full text-left p-4 rounded-xl border-2 border-slate-200 hover:border-amber-400 flex items-center gap-3"
              >
                <Icon size={20} className="text-slate-500" />
                <div>
                  <p className="font-bold text-slate-800">{m.nome}</p>
                  <p className="text-xs text-slate-400">Todas as OPs nesta etapa</p>
                </div>
              </button>
            );
          })}
        </div>

        <p className="text-xs font-bold text-slate-400 mb-2">MÁQUINAS DE PRODUÇÃO</p>
        <div className="space-y-2">
          {maquinas.filter((m) => m.ativo !== false).map((m) => (
            <button
              key={m.id}
              onClick={() => escolherMaquina(m.id)}
              className="w-full text-left p-4 rounded-xl border-2 border-slate-200 hover:border-amber-400 flex items-center gap-3"
            >
              <Factory size={20} className="text-slate-500" />
              <div>
                <p className="font-bold text-slate-800">{m.nome}</p>
                <p className="text-xs text-slate-400">{m.tipo_produto}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const isTarugo = maquinaAtual.tipo_produto === 'tarugo';
  const subStep = SUBSTEP_POR_LINHA[maquinaAtual.tipo_produto];
  const HeaderIcon = maquinaAtual.virtual ? (maquinaAtual.icon === 'Boxes' ? Boxes : Package) : Factory;

  return (
    <div className="max-w-lg mx-auto pb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-slate-400 font-semibold">POSTO DE TRABALHO</p>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <HeaderIcon size={20} /> {maquinaAtual.nome}
          </h2>
        </div>
        <button onClick={() => setShowTrocarMaquina(true)} className="text-xs font-semibold text-slate-400 flex items-center gap-1">
          Trocar <ChevronDown size={14} />
        </button>
      </div>

      {isTarugo ? (
        <TarugoCard maquina={maquinaAtual} onRegistrarEstoque={carregar} />
      ) : (
        <>
          {maquinaAtual.virtual && (maquinaAtual.id === '__maquina_embalagem_7dias__' || maquinaAtual.id === '__mesa_embalagem__') && (
            <div className="grid grid-cols-2 gap-2 mb-4">
              {modelosCaixa
                .filter((m) => maquinaAtual.id === '__maquina_embalagem_7dias__' ? m.linha_producao === '7dias' : true)
                .map((m) => (
                  <CaixaMiniCard key={m.id} modelo={m} onAtualizado={carregar} />
                ))}
            </div>
          )}

          {ordens.length > 1 && (
            <button
              onClick={() => setShowReordenar(true)}
              className="w-full mb-3 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-sm font-semibold flex items-center justify-center gap-1.5"
            >
              <Lock size={14} /> Reordenar Fila
            </button>
          )}
          {ordens.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Package size={36} className="mx-auto mb-2 opacity-40" />
              <p className="font-semibold">Nenhuma OP na fila deste posto</p>
            </div>
          ) : (
            ordens.map((ordem) => (
              <OPCard
                key={ordem.id}
                ordem={ordem}
                produto={produtoDe(ordem)}
                produtos={produtos}
                cliente={ordem.pedido_id ? pedidoMap[ordem.pedido_id]?.nome : null}
                dataPedido={ordem.pedido_id ? pedidoMap[ordem.pedido_id]?.data_pedido : null}
                subStep={subStep}
                onConcluir={concluir}
                onToggleItem={toggleItem}
                processando={processandoId === ordem.id}
              />
            ))
          )}
        </>
      )}

      {showReordenar && (
        <ReordenarFilaModal
          maquina={maquinaAtual}
          ordens={ordens}
          onClose={() => setShowReordenar(false)}
          onSalvo={() => carregarOrdens(maquinaAtual, produtos, pedidoMap)}
        />
      )}
    </div>
  );
}
