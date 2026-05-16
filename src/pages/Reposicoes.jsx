import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { registrarLog } from '@/lib/audit';
import { gerarNumero, gerarLote } from '@/lib/numeracao';
import { AlertTriangle, RefreshCw, Zap, CheckCircle, Package, Search } from 'lucide-react';
import { usePermissoes } from '@/lib/usePermissoes.jsx';

export default function Reposicoes() {
  const { somenteLeitura } = usePermissoes();
  const readonly = somenteLeitura('Estoque');
  const [produtos, setProdutos] = useState([]);
  const [ordens, setOrdens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [criandoOP, setCriandoOP] = useState({});
  const [busca, setBusca] = useState('');

  const load = async () => {
    setLoading(true);
    const [prods, ops] = await Promise.all([
      base44.entities.Produto.list(),
      base44.entities.OrdemProducao.list(),
    ]);
    setProdutos(prods);
    setOrdens(ops.filter(o => o.status !== 'finalizado' && o.status !== 'cancelado'));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const alertas = produtos.filter(p => (p.estoque_atual || 0) <= (p.estoque_minimo || 0));
  const filtrados = alertas.filter(p =>
    !busca || p.nome.toLowerCase().includes(busca.toLowerCase())
  );
  const zerados = alertas.filter(p => (p.estoque_atual || 0) === 0).length;

  const criarOPReposicao = async (produto) => {
    const jaTemOP = ordens.some(o => o.produto_id === produto.id && o.origem === 'estoque_minimo');
    if (jaTemOP) { alert(`⚠️ Já existe uma OP de reposição ativa para "${produto.nome}".`); return; }
    setCriandoOP(p => ({ ...p, [produto.id]: true }));
    const qtd = Math.max((produto.estoque_minimo || 10) * 2 - (produto.estoque_atual || 0), produto.estoque_minimo || 10);
    const op = await base44.entities.OrdemProducao.create({
      numero: gerarNumero('OP'), produto_id: produto.id, produto_nome: produto.nome,
      quantidade: qtd, status: 'a_produzir', origem: 'estoque_minimo', lote: gerarLote(produto.id),
    });
    registrarLog('OrdemProducao', op.id, 'CRIACAO_REPOSICAO', `OP de reposição — ${produto.nome} — qtd ${qtd}`).catch(() => {});
    setOrdens(prev => [...prev, op]);
    setCriandoOP(p => ({ ...p, [produto.id]: false }));
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-100 flex items-center justify-center">
            <AlertTriangle size={20} className="text-amber-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Reposição de Estoque</h2>
            <p className="text-sm text-muted-foreground">
              {loading ? '…' : `${alertas.length} produto(s) abaixo do mínimo · ${zerados} zerado(s)`}
            </p>
          </div>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border px-3 py-2 rounded-xl transition-colors">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Atualizar
        </button>
      </div>

      {/* Busca */}
      <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2.5">
        <Search size={14} className="text-muted-foreground flex-shrink-0" />
        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Filtrar produtos..."
          className="bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground w-full"
        />
      </div>

      {/* Conteúdo */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse bg-muted rounded-xl" />
          ))}
        </div>
      ) : filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <CheckCircle size={48} className="text-green-500 opacity-60" />
          <p className="font-semibold text-foreground">
            {busca ? 'Nenhum produto encontrado' : 'Todos os estoques estão OK!'}
          </p>
          <p className="text-sm text-muted-foreground">
            {busca ? 'Tente outro termo de busca.' : 'Nenhum produto abaixo do estoque mínimo.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtrados.map(p => {
            const pct = p.estoque_minimo > 0 ? Math.min(100, Math.round(((p.estoque_atual || 0) / p.estoque_minimo) * 100)) : 0;
            const jaTemOP = ordens.some(o => o.produto_id === p.id && o.origem === 'estoque_minimo');
            const criando = criandoOP[p.id];
            const qtd = Math.max((p.estoque_minimo || 10) * 2 - (p.estoque_atual || 0), p.estoque_minimo || 10);
            const zerado = (p.estoque_atual || 0) === 0;
            return (
              <div key={p.id} className="rounded-xl border p-3.5 flex flex-col gap-2 bg-card"
                style={{ borderColor: jaTemOP ? '#86EFAC' : zerado ? '#FCA5A5' : '#FDE68A' }}>
                <div className="flex items-start gap-2">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${zerado ? 'bg-red-100' : 'bg-amber-100'}`}>
                    <Package size={12} className={zerado ? 'text-red-500' : 'text-amber-600'} />
                  </div>
                  <p className="text-xs font-semibold leading-tight text-foreground flex-1">{p.nome}</p>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Estoque atual / mínimo:</span>
                  <strong style={{ color: zerado ? '#DC2626' : '#D97706' }}>
                    {p.estoque_atual || 0} / {p.estoque_minimo} un
                  </strong>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden bg-amber-100">
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${Math.max(pct, 3)}%`, background: pct === 0 ? '#DC2626' : '#F59E0B' }} />
                </div>
                {jaTemOP ? (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-green-600 bg-green-50 rounded-lg px-2 py-1.5">
                    <CheckCircle size={12} /> OP já criada
                  </div>
                ) : !readonly ? (
                  <button onClick={() => criarOPReposicao(p)} disabled={criando}
                    className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50">
                    {criando ? <RefreshCw size={12} className="animate-spin" /> : <Zap size={12} />}
                    {criando ? 'Criando...' : `Criar OP (+${qtd} un)`}
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}