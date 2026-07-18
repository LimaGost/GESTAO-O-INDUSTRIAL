import { memo } from 'react';
import { Link } from 'react-router-dom';
import { MoreHorizontal } from 'lucide-react';

// Barra de abas inferior (mobile) — memoizada para evitar re-renders completos
// e preservar o estado visual das abas entre navegações (simula stack preservation).
function BottomTabBar({ tabs, activePath, isMoreActive, onMore }) {
  return (
    <nav
      className="md:hidden flex-shrink-0 flex items-center"
      style={{
        background: '#0D3B45',
        borderTop: '1px solid rgba(255,255,255,0.10)',
        height: 'calc(60px + env(safe-area-inset-bottom))',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {tabs.map(({ path, label, icon: Icon }) => {
        const active = activePath === path;
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
        onClick={onMore}
        className="flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[44px] transition-all"
        style={{ color: isMoreActive ? '#C9A227' : 'rgba(255,255,255,0.45)' }}
      >
        <MoreHorizontal size={20} />
        <span className="text-[10px] font-medium leading-tight">Mais</span>
      </button>
    </nav>
  );
}

export default memo(BottomTabBar, (prev, next) =>
  prev.activePath === next.activePath &&
  prev.isMoreActive === next.isMoreActive &&
  prev.tabs.map(t => t.path).join(',') === next.tabs.map(t => t.path).join(',')
);