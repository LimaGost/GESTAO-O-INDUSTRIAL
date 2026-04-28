import { useEffect, useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, TrendingUp, TrendingDown, Archive, Plus, X, Check, Search, Eye } from 'lucide-react';
import { registrarLog } from '@/lib/audit';
import { gerarNumero } from '@/lib/numeracao';
import { usePermissoes } from '@/lib/usePermissoes.jsx';

export default function Estoque() {
  const { somenteLeitura } = usePermissoes();
  const readonly = somenteLeitura('Estoque');
  const [produtos, setProdutos] = useState([]);
  const [showAjuste, setShowAjuste] = useState(false);
  const [ajuste, setAjuste] = useState({ produto_id: '', tipo: 'entrada', quantidade: 0, motivo: '' });
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const buscaRef = useRef(null);

  // Autofoco ao montar + atalho "/" para focar busca
  useEffect(() => {
    buscaRef.current?.focus();
    const handler = (e) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        buscaRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const load = async () => {
    const data = await base44.entities.Produto.list();
    setProdutos(data);
  };

  useEffect(() => { load(); }, []);

  const ajustarEstoque = async () => {
    if (!ajuste.produto_id || ajuste.quantidade <= 0) return alert('Selecione produto e quantidade válida.');
    const prod = produtos.find(p => p.id === ajuste.produto_id);
    if (!prod) return;

    let novoEstoque;
    if (ajuste.tipo === 'entrada') {
      novoEstoque = (prod.estoque_atual || 0) + ajuste.quantidade;
    } else {
      novoEstoque = (prod.estoque_atual || 0) - ajuste.quantidade;
      if (novoEstoque < 0) {
        alert('❌ Operação bloqueada! Estoque não pode ficar negativo.');
        return;
      }
    }

    setLoading(true);
    await base44.entities.Produto.update(ajuste.produto_id, { estoque_atual: novoEstoque });
    await registrarLog('Produto', ajuste.produto_id, `AJUSTE_${ajuste.tipo.toUpperCase()}`, `Ajuste manual: ${ajuste.tipo} de ${ajuste.quantidade} — Motivo: ${ajuste.motivo || 'Ajuste manual'}`);

    if (novoEstoque <= (prod.estoque_minimo || 0) && ajuste.tipo === 'saida') {
      const op = await base44.entities.OrdemProducao.create({
        numero: gerarNumero('OP'),
        produto_id: prod.id,
        produto_nome: prod.nome,
        quantidade: (prod.estoque_minimo || 10) * 2,
        status: 'a_produzir',
        origem: 'estoque_minimo',
      });
      await registrarLog('OrdemProducao', op.id, 'ALERTA_ESTOQUE_MINIMO', `OP automática criada por estoque mínimo — ${prod.nome}`);
      alert(`⚠️ Estoque abaixo do mínimo! Ordem de produção criada automaticamente no Kanban.`);
    }

    setShowAjuste(false);
    setAjuste({ produto_id: '', tipo: 'entrada', quantidade: 0, motivo: '' });
    await load();
    setLoading(false);
  };

  const totalProdutos = produtos.length;
  const alertas = produtos.filter(p => (p.estoque_atual || 0) <= (p.estoque_minimo || 0)).length;
  const totalUnidades = produtos.reduce((s, p) => s + (p.estoque_atual || 0), 0);

  const categorias = [...new Set(produtos.map(p => p.categoria).filter(Boolean))].sort();

  const produtosFiltrados = produtos.filter(p => {
    const matchBusca = !busca || (p.nome || '').toLowerCase().includes(busca.toLowerCase()) || (p.codigo || '').toLowerCase().includes(busca.toLowerCase());
    const est = p.estoque_atual || 0;
    const alerta = est <= (p.estoque_minimo || 0);
    const zerado = est === 0;
    const matchCategoria = filtroCategoria === 'todas' || p.categoria === filtroCategoria;
    if (filtroStatus === 'zerado') return matchBusca && matchCategoria && zerado;
    if (filtroStatus === 'alerta') return matchBusca && matchCategoria && alerta && !zerado;
    if (filtroStatus === 'ok') return matchBusca && matchCategoria && !alerta;
    return matchBusca && matchCategoria;
  });

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Produtos Cadastrados', value: totalProdutos, icon: Archive, color: 'text-sky-blue' },
          { label: 'Total em Estoque', value: totalUnidades, icon: TrendingUp, color: 'text-rainbow-green' },
          { label: 'Alertas de Mínimo', value: alertas, icon: AlertTriangle, color: alertas > 0 ? 'text-rainbow-red' : 'text-muted-foreground' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4">
            <Icon size={22} className={color} />
            <div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-2xl font-bold text-foreground">{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">Estoque de Produtos Acabados</h2>
          <p className="text-xs text-muted-foreground">{produtos.length} SKUs cadastrados</p>
        </div>
        {!readonly ? (
          <button onClick={() => setShowAjuste(true)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-amber-500 transition-colors shadow-sm">
            <Plus size={16} /> Ajuste Manual
          </button>
        ) : (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-3 py-2 rounded-xl">
            <Eye size={13} /> Somente visualização
          </span>
        )}
      </div>

      {/* Search + Filtros */}
      <div className="space-y-2">
        <div className="flex items-center gap-2.5 bg-card border border-border rounded-xl px-3.5 py-2.5">
          <Search size={14} className="text-muted-foreground" />
          <input ref={buscaRef} value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome ou código... (tecle / para focar)"
            className="bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground w-full" />
          {busca && <button onClick={() => setBusca('')} className="text-muted-foreground hover:text-foreground"><X size={13} /></button>}
        </div>

        <div className="flex flex-wrap gap-2">
          {[{k:'todos',l:'Todos'},{k:'zerado',l:'Zerados'},{k:'alerta',l:'Alerta'},{k:'ok',l:'OK'}].map(f => (
            <button key={f.k} onClick={() => setFiltroStatus(f.k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filtroStatus === f.k ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground hover:text-foreground'
              }`}>{f.l}</button>
          ))}
        </div>

        {categorias.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setFiltroCategoria('todas')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filtroCategoria === 'todas' ? 'bg-rainbow-purple text-white' : 'bg-card border border-border text-muted-foreground hover:text-foreground'
              }`}>Todas Categorias</button>
            {categorias.map(cat => (
              <button key={cat} onClick={() => setFiltroCategoria(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filtroCategoria === cat ? 'bg-rainbow-purple text-white' : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                }`}>{cat}</button>
            ))}
          </div>
        )}
      </div>

      {showAjuste && !readonly && (
        <div className="bg-white border border-border rounded-xl p-5 space-y-4 shadow-sm">
          <h3 className="font-semibold text-foreground">Ajuste de Estoque</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Produto *</label>
              <select value={ajuste.produto_id} onChange={e => setAjuste(a => ({ ...a, produto_id: e.target.value }))}
                className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="">Selecione...</option>
                {produtos.map(p => <option key={p.id} value={p.id}>{p.nome} (Atual: {p.estoque_atual || 0})</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Tipo</label>
              <select value={ajuste.tipo} onChange={e => setAjuste(a => ({ ...a, tipo: e.target.value }))}
                className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="entrada">Entrada</option>
                <option value="saida">Saída</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Quantidade *</label>
              <input type="number" min="1" value={ajuste.quantidade} onChange={e => setAjuste(a => ({ ...a, quantidade: Number(e.target.value) }))}
                className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Motivo</label>
              <input value={ajuste.motivo} onChange={e => setAjuste(a => ({ ...a, motivo: e.target.value }))}
                placeholder="Ex: inventário, devolução..."
                className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={ajustarEstoque} disabled={loading}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50">
              <Check size={15} /> {loading ? 'Salvando...' : 'Confirmar Ajuste'}
            </button>
            <button onClick={() => setShowAjuste(false)} className="border border-border px-5 py-2 rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="bg-white border border-border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              {['Produto','Código','Unidade','Estoque Atual','Mínimo','Máximo','Status'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {produtosFiltrados.map(p => {
              const alerta = (p.estoque_atual || 0) <= (p.estoque_minimo || 0);
              const zerado = (p.estoque_atual || 0) === 0;
              const alertaMax = (p.estoque_maximo || 0) > 0 && (p.estoque_atual || 0) >= p.estoque_maximo;
              const pct = p.estoque_minimo > 0 ? Math.min(100, Math.round(((p.estoque_atual || 0) / (p.estoque_minimo * 2)) * 100)) : 100;
              return (
                <tr key={p.id} className="border-t border-border hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">
                    <div>
                      <p>{p.nome}</p>
                      <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden w-24">
                        <div className={`h-full rounded-full ${zerado ? 'bg-rainbow-red' : alerta ? 'bg-sun-yellow' : 'bg-rainbow-green'}`}
                          style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{p.codigo || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.unidade || '—'}</td>
                  <td className="px-4 py-3 font-bold text-foreground">{p.estoque_atual || 0}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.estoque_minimo || 0}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.estoque_maximo || '—'}</td>
                  <td className="px-4 py-3">
                    {zerado ? (
                      <span className="text-xs px-2 py-1 rounded-full bg-rainbow-red/10 text-rainbow-red font-semibold">Zerado</span>
                    ) : alertaMax ? (
                      <span className="text-xs px-2 py-1 rounded-full bg-rainbow-purple/10 text-rainbow-purple font-semibold">Excesso</span>
                    ) : alerta ? (
                      <span className="text-xs px-2 py-1 rounded-full bg-sun-yellow/10 text-sun-yellow font-semibold">Abaixo do mínimo</span>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded-full bg-rainbow-green/10 text-rainbow-green font-semibold">OK</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {produtosFiltrados.length === 0 && (
              <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">Nenhum produto encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}