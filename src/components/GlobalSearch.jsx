import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Search, X, Package, Users, Factory, Loader2 } from 'lucide-react';

function highlight(text, query) {
  if (!query || !text) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-primary/20 text-primary rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

const SECTION_CONFIG = {
  ordens:   { label: 'Ordens de Produção', icon: Factory,  color: 'text-sky-600',   bg: 'bg-sky-50'   },
  clientes: { label: 'Clientes',            icon: Users,   color: 'text-purple-600', bg: 'bg-purple-50' },
  produtos: { label: 'Produtos',            icon: Package, color: 'text-amber-600',  bg: 'bg-amber-50'  },
};

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ ordens: [], clientes: [], produtos: [] });
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(0);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const debounceRef = useRef(null);
  const navigate = useNavigate();

  const allResults = [
    ...results.ordens.map(r => ({ ...r, _section: 'ordens' })),
    ...results.clientes.map(r => ({ ...r, _section: 'clientes' })),
    ...results.produtos.map(r => ({ ...r, _section: 'produtos' })),
  ];

  const search = useCallback(async (q) => {
    if (!q.trim() || q.length < 2) {
      setResults({ ordens: [], clientes: [], produtos: [] });
      setOpen(false);
      return;
    }
    setLoading(true);
    const lower = q.toLowerCase();

    const [ordens, clientes, produtos] = await Promise.all([
      base44.entities.OrdemProducao.list('-created_date', 200),
      base44.entities.Cliente.list(),
      base44.entities.Produto.list(),
    ]);

    setResults({
      ordens: ordens.filter(o =>
        o.numero?.toLowerCase().includes(lower) ||
        o.produto_nome?.toLowerCase().includes(lower) ||
        o.pedido_numero?.toLowerCase().includes(lower)
      ).slice(0, 5),
      clientes: clientes.filter(c =>
        c.nome?.toLowerCase().includes(lower) ||
        c.email?.toLowerCase().includes(lower) ||
        c.cnpj_cpf?.toLowerCase().includes(lower)
      ).slice(0, 5),
      produtos: produtos.filter(p =>
        p.nome?.toLowerCase().includes(lower) ||
        p.codigo?.toLowerCase().includes(lower) ||
        p.categoria?.toLowerCase().includes(lower)
      ).slice(0, 5),
    });

    setOpen(true);
    setFocused(0);
    setLoading(false);
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults({ ordens: [], clientes: [], produtos: [] }); setOpen(false); return; }
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, search]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (!dropdownRef.current?.contains(e.target) && !inputRef.current?.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const navigateTo = (item) => {
    setOpen(false);
    setQuery('');
    if (item._section === 'ordens') navigate('/Kanban');
    else if (item._section === 'clientes') navigate('/Clientes');
    else if (item._section === 'produtos') navigate('/Produtos');
  };

  const handleKeyDown = (e) => {
    if (!open || allResults.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setFocused(f => Math.min(f + 1, allResults.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setFocused(f => Math.max(f - 1, 0)); }
    if (e.key === 'Enter')     { e.preventDefault(); navigateTo(allResults[focused]); }
    if (e.key === 'Escape')    { setOpen(false); inputRef.current?.blur(); }
  };

  const hasResults = allResults.length > 0;

  return (
    <div className="relative w-full max-w-xs lg:max-w-sm">
      {/* Input */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${open ? 'border-primary/50 ring-2 ring-primary/20 bg-white' : 'border-border bg-muted/40 hover:bg-muted/70'}`}>
        {loading
          ? <Loader2 size={15} className="text-muted-foreground animate-spin flex-shrink-0" />
          : <Search size={15} className="text-muted-foreground flex-shrink-0" />
        }
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => { if (query.length >= 2) setOpen(true); }}
          onKeyDown={handleKeyDown}
          placeholder="Buscar OPs, clientes, produtos..."
          className="bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground w-full"
        />
        {query && (
          <button onClick={() => { setQuery(''); setOpen(false); inputRef.current?.focus(); }}
            className="p-0.5 hover:bg-muted rounded">
            <X size={13} className="text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div
          ref={dropdownRef}
          className="absolute top-full mt-2 left-0 right-0 z-50 bg-white border border-border rounded-2xl shadow-xl overflow-hidden"
          style={{ minWidth: 320, maxWidth: 420 }}
        >
          {!hasResults && !loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Nenhum resultado para "<strong>{query}</strong>"
            </div>
          ) : (
            Object.entries(results).map(([section, items]) => {
              if (items.length === 0) return null;
              const cfg = SECTION_CONFIG[section];
              const Icon = cfg.icon;
              const globalOffset = [
                ...results.ordens.map(r => ({ ...r, _section: 'ordens' })),
                ...results.clientes.map(r => ({ ...r, _section: 'clientes' })),
                ...results.produtos.map(r => ({ ...r, _section: 'produtos' })),
              ].findIndex(r => r._section === section && r === items[0]);

              return (
                <div key={section}>
                  {/* Section header */}
                  <div className={`flex items-center gap-2 px-4 py-2 border-b border-border/40 ${cfg.bg}`}>
                    <Icon size={12} className={cfg.color} />
                    <p className={`text-[10px] font-bold uppercase tracking-wide ${cfg.color}`}>{cfg.label}</p>
                  </div>

                  {items.map((item, localIdx) => {
                    const globalIdx = allResults.findIndex(r => r === item || (r.id === item.id && r._section === section));
                    const isFocused = focused === globalIdx;

                    let title = '', subtitle = '', badge = '';
                    if (section === 'ordens') {
                      title = item.numero || '—';
                      subtitle = item.produto_nome || '';
                      badge = item.status || '';
                    } else if (section === 'clientes') {
                      title = item.nome || '—';
                      subtitle = item.email || item.cnpj_cpf || '';
                      badge = item.ativo === false ? 'inativo' : 'ativo';
                    } else if (section === 'produtos') {
                      title = item.nome || '—';
                      subtitle = item.categoria || '';
                      badge = `Est: ${item.estoque_atual ?? 0}`;
                    }

                    return (
                      <button
                        key={item.id}
                        onMouseEnter={() => setFocused(globalIdx)}
                        onMouseDown={(e) => { e.preventDefault(); navigateTo({ ...item, _section: section }); }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors border-b border-border/20 last:border-b-0 ${isFocused ? 'bg-primary/8' : 'hover:bg-muted/40'}`}
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                          <Icon size={13} className={cfg.color} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {highlight(title, query)}
                          </p>
                          {subtitle && (
                            <p className="text-xs text-muted-foreground truncate">
                              {highlight(subtitle, query)}
                            </p>
                          )}
                        </div>
                        {badge && (
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${cfg.bg} ${cfg.color}`}>
                            {badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}

          {/* Footer hint */}
          {hasResults && (
            <div className="px-4 py-2 border-t border-border bg-muted/20 flex items-center gap-3 text-[10px] text-muted-foreground">
              <span>↑↓ navegar</span>
              <span>Enter abrir</span>
              <span>Esc fechar</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}