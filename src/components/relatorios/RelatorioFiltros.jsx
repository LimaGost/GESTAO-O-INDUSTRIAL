import { useState } from 'react';
import { Filter, Star, X, ChevronDown, ChevronUp } from 'lucide-react';

export default function RelatorioFiltros({ pedidos, clientes, produtos, expedicoes, filters, onChange }) {
  const [expanded, setExpanded] = useState(false);
  const [favNome, setFavNome] = useState('');

  const transportadoras = [...new Set((expedicoes || []).map(e => e.transportadora).filter(Boolean))];
  const vendedores = [...new Set(pedidos.map(p => p.vendedor || p.responsavel).filter(Boolean))];
  const unidades = [...new Set(pedidos.map(p => p.destino_unidade).filter(Boolean))];
  const statusList = ['rascunho', 'aguardando_estoque', 'separacao', 'separado', 'expedido', 'entregue', 'cancelado'];
  const statusLabel = { rascunho: 'Rascunho', aguardando_estoque: 'Ag. Estoque', separacao: 'Em Separação', separado: 'Separado', expedido: 'Expedido', entregue: 'Entregue', cancelado: 'Cancelado' };

  const set = (k, v) => onChange({ ...filters, [k]: v });

  const favKey = 'relatorios_filtros_favoritos';
  const savedFavs = (() => { try { return JSON.parse(localStorage.getItem(favKey) || '[]'); } catch { return []; } })();

  const salvarFavorito = () => {
    if (!favNome.trim()) return;
    const favs = [...savedFavs, { nome: favNome, filtros: filters }];
    localStorage.setItem(favKey, JSON.stringify(favs));
    setFavNome('');
  };

  const carregarFavorito = (f) => onChange(f.filtros);
  const removerFavorito = (i) => {
    const favs = savedFavs.filter((_, idx) => idx !== i);
    localStorage.setItem(favKey, JSON.stringify(favs));
    onChange({ ...filters }); // força re-render
  };

  const temFiltro = filters.cliente || filters.produto || filters.status || filters.wl !== undefined || filters.transportadora || filters.unidade;

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-primary" />
          <span className="text-sm font-semibold text-foreground">Filtros Avançados</span>
          {temFiltro && <span className="text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-bold">Ativo</span>}
        </div>
        {expanded ? <ChevronUp size={15} className="text-muted-foreground" /> : <ChevronDown size={15} className="text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-5 pb-4 space-y-4 border-t border-border">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pt-3">
            {/* Cliente */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Cliente</label>
              <select value={filters.cliente || ''} onChange={e => set('cliente', e.target.value)}
                className="w-full border border-border rounded-lg px-2 py-1.5 text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="">Todos</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            {/* Produto */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Produto</label>
              <select value={filters.produto || ''} onChange={e => set('produto', e.target.value)}
                className="w-full border border-border rounded-lg px-2 py-1.5 text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="">Todos</option>
                {produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
            {/* Status */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Status</label>
              <select value={filters.status || ''} onChange={e => set('status', e.target.value)}
                className="w-full border border-border rounded-lg px-2 py-1.5 text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="">Todos</option>
                {statusList.map(s => <option key={s} value={s}>{statusLabel[s]}</option>)}
              </select>
            </div>
            {/* Transportadora */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Transportadora</label>
              <select value={filters.transportadora || ''} onChange={e => set('transportadora', e.target.value)}
                className="w-full border border-border rounded-lg px-2 py-1.5 text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="">Todas</option>
                {transportadoras.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            {/* Unidade */}
            {unidades.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Unidade</label>
                <select value={filters.unidade || ''} onChange={e => set('unidade', e.target.value)}
                  className="w-full border border-border rounded-lg px-2 py-1.5 text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                  <option value="">Todas</option>
                  {unidades.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            )}
            {/* White Label */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">White Label</label>
              <select value={filters.wl === undefined ? '' : String(filters.wl)} onChange={e => set('wl', e.target.value === '' ? undefined : e.target.value === 'true')}
                className="w-full border border-border rounded-lg px-2 py-1.5 text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="">Todos</option>
                <option value="true">Somente WL</option>
                <option value="false">Sem WL</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-2">
            <button onClick={() => onChange({ cliente: '', produto: '', status: '', wl: undefined, transportadora: '', unidade: '' })}
              className="text-xs px-3 py-1.5 border border-border rounded-lg text-muted-foreground hover:bg-muted transition-colors">
              Limpar filtros
            </button>

            {/* Salvar favorito */}
            <div className="flex items-center gap-2">
              <input value={favNome} onChange={e => setFavNome(e.target.value)} placeholder="Nome do filtro favorito..."
                className="text-xs border border-border rounded-lg px-2 py-1.5 bg-background text-foreground w-44 focus:outline-none focus:ring-1 focus:ring-primary" />
              <button onClick={salvarFavorito} disabled={!favNome.trim()}
                className="flex items-center gap-1 text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:opacity-90 disabled:opacity-40">
                <Star size={11} /> Salvar
              </button>
            </div>
          </div>

          {savedFavs.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1 border-t border-border">
              <span className="text-xs text-muted-foreground self-center">Favoritos:</span>
              {savedFavs.map((f, i) => (
                <div key={i} className="flex items-center gap-1 bg-primary/10 border border-primary/20 rounded-full px-3 py-1">
                  <button onClick={() => carregarFavorito(f)} className="text-xs font-semibold text-primary">{f.nome}</button>
                  <button onClick={() => removerFavorito(i)} className="text-muted-foreground hover:text-foreground ml-1">
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}