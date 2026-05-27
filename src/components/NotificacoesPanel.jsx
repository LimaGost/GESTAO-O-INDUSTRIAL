import { useState, useEffect, useRef } from 'react';
import { Bell, X, CheckCheck, Package, ShoppingCart, Factory, Users, MessageSquare } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';

const TIPO_CONFIG = {
  pedido:   { icon: ShoppingCart,  color: 'text-blue-500',   bg: 'bg-blue-50',   label: 'Pedido' },
  estoque:  { icon: Package,       color: 'text-amber-500',  bg: 'bg-amber-50',  label: 'Estoque' },
  producao: { icon: Factory,       color: 'text-purple-500', bg: 'bg-purple-50', label: 'Produção' },
  cliente:  { icon: Users,         color: 'text-green-500',  bg: 'bg-green-50',  label: 'Cliente' },
  suporte:  { icon: MessageSquare, color: 'text-primary',    bg: 'bg-primary/10', label: 'Suporte' },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min atrás`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atrás`;
  return `${Math.floor(hrs / 24)}d atrás`;
}

export default function NotificacoesPanel() {
  const [open, setOpen] = useState(false);
  const [notificacoes, setNotificacoes] = useState([]);
  const [userId, setUserId] = useState(null);
  const panelRef = useRef(null);
  const navigate = useNavigate();

  const naoLidas = notificacoes.filter(n => !n.lida).length;

  const load = async (uid) => {
    try {
      const data = await base44.entities.Notificacao.list('-created_date', 60);
      const currentId = uid || userId;
      const filtradas = data.filter(n => !n.usuario_id || n.usuario_id === currentId);
      setNotificacoes(filtradas.slice(0, 30));
    } catch {
      // ignora erros silenciosamente
    }
  };

  useEffect(() => {
    base44.auth.me().then(u => {
      setUserId(u?.id);
      load(u?.id);
    }).catch(() => load());
    const interval = setInterval(() => load(), 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const marcarLida = async (n) => {
    if (!n.lida) {
      await base44.entities.Notificacao.update(n.id, { lida: true });
      setNotificacoes(prev => prev.map(x => x.id === n.id ? { ...x, lida: true } : x));
    }
    if (n.link) {
      setOpen(false);
      navigate(n.link);
    }
  };

  const marcarTodasLidas = async () => {
    const naoLidasList = notificacoes.filter(n => !n.lida);
    await Promise.all(naoLidasList.map(n => base44.entities.Notificacao.update(n.id, { lida: true })));
    setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })));
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => { setOpen(v => !v); if (!open) load(); }}
        className="relative p-2 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-amber-50"
      >
        <Bell size={18} style={{ color: '#A8937E' }} />
        {naoLidas > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
            {naoLidas > 9 ? '9+' : naoLidas}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40">
            <div className="flex items-center gap-2">
              <Bell size={14} className="text-muted-foreground" />
              <span className="text-sm font-bold text-foreground">Notificações</span>
              {naoLidas > 0 && (
                <span className="text-[10px] bg-red-500 text-white font-bold px-1.5 py-0.5 rounded-full">{naoLidas}</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {naoLidas > 0 && (
                <button onClick={marcarTodasLidas} title="Marcar todas como lidas"
                  className="flex items-center gap-1 text-[10px] text-primary hover:underline px-2 py-1">
                  <CheckCheck size={12} /> Todas lidas
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1 hover:bg-muted rounded-lg">
                <X size={14} className="text-muted-foreground" />
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-border">
            {notificacoes.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">
                <Bell size={28} className="mx-auto mb-2 opacity-20" />
                <p className="text-sm">Nenhuma notificação</p>
              </div>
            ) : (
              notificacoes.map(n => {
                const cfg = TIPO_CONFIG[n.tipo] || TIPO_CONFIG.pedido;
                const Icon = cfg.icon;
                return (
                  <button key={n.id} onClick={() => marcarLida(n)}
                    className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left ${!n.lida ? 'bg-primary/5' : ''}`}>
                    <div className={`w-8 h-8 rounded-xl ${cfg.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <Icon size={14} className={cfg.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-xs font-semibold leading-tight ${!n.lida ? 'text-foreground' : 'text-muted-foreground'}`}>{n.titulo}</p>
                        {!n.lida && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />}
                      </div>
                      {n.descricao && <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{n.descricao}</p>}
                      <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo(n.created_date)}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}