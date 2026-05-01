import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import NotificacoesPanel from '@/components/NotificacoesPanel';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  LayoutDashboard, ShoppingCart, Factory, Package,
  Truck, Settings, ChevronLeft, ChevronRight, ChevronUp,
  Bell, Tag, Users, Archive, SlidersHorizontal, BarChart2,
  Database, MoreHorizontal, RefreshCw, Trash2, MessageCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePermissoes } from '@/lib/usePermissoes.jsx';
import GlobalSearch from '@/components/GlobalSearch';

const bottomTabs = [
  { path: '/Dashboard',    label: 'Dashboard',  icon: LayoutDashboard },
  { path: '/Pedidos',      label: 'Pedidos',    icon: ShoppingCart },
  { path: '/Kanban',       label: 'Kanban',     icon: Factory },
  { path: '/Estoque',      label: 'Estoque',    icon: Archive },
  { path: '/Configuracoes',label: 'Config.',    icon: SlidersHorizontal },
];

const navGroups = [
  {
    label: 'PRINCIPAL',
    items: [
      { path: '/Dashboard',  label: 'Dashboard',       icon: LayoutDashboard },
      { path: '/Pedidos',    label: 'Pedidos',          icon: ShoppingCart },
      { path: '/Kanban',     label: 'Kanban Produção',  icon: Factory },
      { path: '/Estoque',    label: 'Estoque',          icon: Archive },
    ],
  },
  {
    label: 'OPERACIONAL',
    items: [
      { path: '/Etiquetas',  label: 'Etiquetas',  icon: Tag },
      { path: '/Expedicao',  label: 'Expedição',  icon: Truck },
      { path: '/CRM',        label: 'CRM',        icon: MessageCircle },
      { path: '/Clientes',   label: 'Clientes',   icon: Users },
      { path: '/Produtos',   label: 'Produtos',   icon: Settings },
    ],
  },
  {
    label: 'ANÁLISE',
    items: [
      { path: '/Relatorios', label: 'Relatórios', icon: BarChart2 },
      { path: '/Perdas',     label: 'Perdas',     icon: Trash2 },
    ],
  },
  {
    label: 'SISTEMA',
    items: [
      { path: '/Configuracoes', label: 'Configurações', icon: SlidersHorizontal },
    ],
  },
];

const allNavItems = [
  { path: '/Dashboard',      label: 'Dashboard',        icon: LayoutDashboard },
  { path: '/Pedidos',        label: 'Pedidos',           icon: ShoppingCart },
  { path: '/Kanban',         label: 'Kanban Produção',   icon: Factory },
  { path: '/Estoque',        label: 'Estoque',           icon: Archive },
  { path: '/Etiquetas',      label: 'Etiquetas',         icon: Tag },
  { path: '/Expedicao',      label: 'Expedição',         icon: Truck },
  { path: '/CRM',            label: 'CRM',               icon: MessageCircle },
  { path: '/Clientes',       label: 'Clientes',          icon: Users },
  { path: '/Produtos',       label: 'Produtos',          icon: Settings },
  { path: '/Relatorios',     label: 'Relatórios',        icon: BarChart2 },
  { path: '/Perdas',         label: 'Perdas',            icon: Trash2 },
  { path: '/Configuracoes',  label: 'Configurações',     icon: SlidersHorizontal },
];

const PATH_MODULO = {
  '/Dashboard':    'Dashboard',
  '/Pedidos':      'Pedidos',
  '/Kanban':       'Kanban',
  '/Estoque':      'Estoque',
  '/Embalagem':    'Embalagem',
  '/Etiquetas':    'Etiquetas',
  '/Expedicao':    'Expedicao',
  '/CRM':                  'Clientes',
  '/Clientes':     'Clientes',
  '/Produtos':     'Produtos',
  '/Relatorios':   'Relatorios',
  '/Perdas':       'Perdas',
  '/Auditoria':    'Auditoria',
  '/Configuracoes': 'Configuracoes',
  '/SupabaseSchemas': null,
};

function usePullToRefresh(onRefresh) {
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);
  const mainRef = useRef(null);

  const onTouchStart = useCallback((e) => {
    if (mainRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
    }
  }, []);

  const onTouchEnd = useCallback(async (e) => {
    if (startY.current === null) return;
    const delta = e.changedTouches[0].clientY - startY.current;
    startY.current = null;
    if (delta > 70) {
      setRefreshing(true);
      await onRefresh();
      setRefreshing(false);
    }
  }, [onRefresh]);

  return { mainRef, refreshing, onTouchStart, onTouchEnd };
}

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { temAcesso } = usePermissoes();
  const [collapsed, setCollapsed] = useState(false);
  const [moreOpen, setMoreOpen]   = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const filtrarItens = (itens) => itens.filter(item => {
    const modulo = PATH_MODULO[item.path];
    if (modulo === undefined) return true;
    if (modulo === null) return true;
    return temAcesso(modulo);
  });

  const currentItem = allNavItems.find(n => n.path === location.pathname);
  const isBottomTab = bottomTabs.some(t => t.path === location.pathname);

  const bottomTabsVisiveis = filtrarItens(bottomTabs);
  const navGroupsVisiveis = navGroups.map(g => ({ ...g, items: filtrarItens(g.items) })).filter(g => g.items.length > 0);
  const allNavItemsVisiveis = filtrarItens(allNavItems);
  const moreItemsVisiveis = allNavItemsVisiveis.filter(n => !bottomTabsVisiveis.find(t => t.path === n.path));
  const isMoreActive = moreItemsVisiveis.some(n => n.path === location.pathname);

  const { mainRef, refreshing, onTouchStart, onTouchEnd } = usePullToRefresh(
    () => new Promise(res => { setRefreshKey(k => k + 1); setTimeout(res, 600); })
  );

  useEffect(() => { setMoreOpen(false); }, [location.pathname]);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'hsl(200,15%,97%)' }}>

      {/* SIDEBAR (desktop) */}
      <aside
        className={cn("hidden md:flex flex-col transition-all duration-300 flex-shrink-0", collapsed ? "w-16" : "w-60")}
        style={{ background: '#0D3B45' }}
      >
        {(() => {
          let vc = {}; try { vc = JSON.parse(localStorage.getItem('visual_config') || '{}'); } catch {}
          let ec = {}; try { ec = JSON.parse(localStorage.getItem('empresa_config') || '{}'); } catch {}
          const titulo = vc.titulo_sidebar || ec.nome || 'Raio do Sol';
          const subtitulo = vc.subtitulo_sidebar || 'Gestão Industrial';
          const logoUrl = ec.logo_url || '';
          return (
            <div className={cn("flex items-center gap-3 px-4 py-5", collapsed && "justify-center px-2")}
              style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg overflow-hidden"
                style={{ background: '#C9A227' }}>
                {logoUrl
                  ? <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                  : <span className="text-lg">☀️</span>
                }
              </div>
              {!collapsed && (
                <div>
                  <p className="font-bold text-sm leading-tight" style={{ color: '#C9A227' }}>{titulo}</p>
                  <p className="text-xs leading-tight" style={{ color: 'rgba(255,255,255,0.45)' }}>{subtitulo}</p>
                </div>
              )}
            </div>
          );
        })()}

        <nav className="flex-1 py-2 overflow-y-auto">
          {collapsed ? (
            allNavItemsVisiveis.map(({ path, label, icon: Icon }) => {
              const active = location.pathname === path;
              return (
                <Link key={path} to={path} title={label}
                  className="flex items-center justify-center mx-2 p-2.5 rounded-xl mb-0.5 transition-all min-h-[44px]"
                  style={active ? { background: '#C9A227', color: '#0D3B45' } : { color: 'rgba(255,255,255,0.55)' }}
                  onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(201,162,39,0.15)'; e.currentTarget.style.color = '#C9A227'; } }}
                  onMouseLeave={e => { if (!active) { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; } }}
                >
                  <Icon size={18} />
                </Link>
              );
            })
          ) : (
            navGroupsVisiveis.map(group => (
              <div key={group.label} className="mb-2">
                <p className="px-4 pt-4 pb-1.5 text-[10px] font-bold tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {group.label}
                </p>
                {group.items.map(({ path, label, icon: Icon }) => {
                  const active = location.pathname === path;
                  return (
                    <Link key={path} to={path}
                      className="flex items-center gap-3 mx-2 px-3 py-2.5 rounded-xl mb-0.5 transition-all text-sm font-semibold min-h-[44px] relative"
                      style={active
                        ? { background: 'rgba(201,162,39,0.18)', color: '#C9A227' }
                        : { color: 'rgba(255,255,255,0.55)' }
                      }
                      onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(201,162,39,0.10)'; e.currentTarget.style.color = '#C9A227'; } }}
                      onMouseLeave={e => { if (!active) { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; } }}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full" style={{ background: '#C9A227' }} />
                      )}
                      <Icon size={17} className="flex-shrink-0" />
                      <span>{label}</span>
                    </Link>
                  );
                })}
              </div>
            ))
          )}
        </nav>

        <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl transition-all min-h-[44px] text-sm"
            style={{ color: 'rgba(255,255,255,0.4)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(201,162,39,0.12)'; e.currentTarget.style.color = '#C9A227'; }}
            onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
          >
            {collapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} /><span className="font-medium">Recolher</span></>}
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Topbar desktop */}
        <header className="hidden md:flex bg-white border-b px-6 py-3.5 items-center justify-between gap-4 flex-shrink-0"
          style={{ borderColor: 'hsl(200,20%,88%)' }}>
          <div className="flex-shrink-0">
            <h1 className="text-lg font-bold leading-tight" style={{ color: '#0D3B45' }}>
              {currentItem?.label || 'Raio do Sol'}
            </h1>
            <p className="text-xs" style={{ color: 'hsl(200,20%,50%)' }}>Sistema de Gestão Industrial</p>
          </div>
          <div className="flex-1 flex justify-center">
            <GlobalSearch />
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <NotificacoesPanel />
            <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm"
              style={{ background: '#C9A227', color: '#fff' }}>RS</div>
          </div>
        </header>

        {/* Topbar mobile */}
        <header
          className="md:hidden flex px-4 items-center justify-between flex-shrink-0"
          style={{ height: 'calc(52px + env(safe-area-inset-top))', paddingTop: 'env(safe-area-inset-top)', background: '#0D3B45' }}
        >
          {!isBottomTab ? (
            <button onClick={() => navigate(-1)}
              className="flex items-center justify-center w-11 h-11 -ml-2 rounded-xl"
              style={{ color: 'rgba(255,255,255,0.7)' }}>
              <ChevronLeft size={22} />
            </button>
          ) : (
            <div className="w-11 h-11" />
          )}
          <h1 className="text-base font-bold truncate" style={{ color: 'white' }}>
            {currentItem?.label || 'Raio do Sol'}
          </h1>
          <button className="flex items-center justify-center w-11 h-11 -mr-2 rounded-xl"
            style={{ color: 'rgba(255,255,255,0.6)' }}>
            <Bell size={20} />
          </button>
        </header>

        {refreshing && (
          <div className="md:hidden flex items-center justify-center py-2 text-xs gap-2"
            style={{ background: 'rgba(245,158,11,0.1)', color: '#D97706' }}>
            <RefreshCw size={13} className="animate-spin" /> Atualizando...
          </div>
        )}

        <main
          ref={mainRef}
          key={refreshKey}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          className="flex-1 overflow-auto p-4 md:p-6"
          style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom) + 64px)' }}
        >
          <Outlet />
        </main>

        {/* BOTTOM TAB BAR (mobile) */}
        <nav
          className="md:hidden flex-shrink-0 flex items-center"
          style={{
            background: '#0D3B45',
            borderTop: '1px solid rgba(255,255,255,0.10)',
            height: 'calc(60px + env(safe-area-inset-bottom))',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          {bottomTabsVisiveis.map(({ path, label, icon: Icon }) => {
            const active = location.pathname === path;
            return (
              <Link key={path} to={path}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[44px] transition-all"
                style={{ color: active ? '#C9A227' : 'rgba(255,255,255,0.45)' }}
              >
                <Icon size={20} className="flex-shrink-0" />
                <span className="text-[10px] font-medium leading-tight">{label}</span>
              </Link>
            );
          })}

          <button
            onClick={() => setMoreOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[44px] transition-all"
            style={{ color: isMoreActive ? '#C9A227' : 'rgba(255,255,255,0.45)' }}
          >
            <MoreHorizontal size={20} />
            <span className="text-[10px] font-medium leading-tight">Mais</span>
          </button>
        </nav>
      </div>

      {/* "MAIS" DRAWER (mobile) */}
      {moreOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setMoreOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl"
            style={{ background: '#0D3B45', paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }} />
            </div>
            <div className="flex items-center justify-between px-5 py-3"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-sm font-semibold text-white">Mais opções</p>
              <button onClick={() => setMoreOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg"
                style={{ color: 'rgba(255,255,255,0.4)' }}>
                <ChevronUp size={16} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1 p-4">
              {moreItemsVisiveis.map(({ path, label, icon: Icon }) => {
                const active = location.pathname === path;
                return (
                  <Link key={path} to={path}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all min-h-[70px] justify-center"
                    style={active
                      ? { background: 'rgba(201,162,39,0.2)', color: '#C9A227' }
                      : { color: 'rgba(255,255,255,0.55)' }
                    }
                  >
                    <Icon size={22} />
                    <span className="text-[11px] font-medium text-center leading-tight">{label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}