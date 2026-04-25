import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Package, X, CheckCheck, Bell } from 'lucide-react';

export default function AlertaSeparacao() {
  const [alertas, setAlertas] = useState([]);
  const [dismissed, setDismissed] = useState(new Set());

  const loadAlertas = async () => {
    try {
      const notifs = await base44.entities.Notificacao.filter({ tipo: 'producao', lida: false });
      // Apenas notificações de separação (link para Expedição)
      const separacao = notifs.filter(n => n.link === '/Expedicao');
      setAlertas(separacao);

      // Notificação nativa do browser (se permitida)
      if (separacao.length > 0 && 'Notification' in window && Notification.permission === 'granted') {
        const novos = separacao.filter(n => !dismissed.has(n.id));
        for (const n of novos) {
          new Notification(n.titulo, { body: n.descricao, icon: '/favicon.ico' });
        }
      }
    } catch {}
  };

  useEffect(() => {
    // Pede permissão para notificações nativas
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    loadAlertas();

    // Polling a cada 15s + subscription em tempo real
    const interval = setInterval(loadAlertas, 15000);

    const unsubscribe = base44.entities.Notificacao.subscribe((event) => {
      if (event.type === 'create' && event.data?.tipo === 'producao' && event.data?.link === '/Expedicao') {
        setAlertas(prev => [event.data, ...prev]);

        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(event.data.titulo, { body: event.data.descricao, icon: '/favicon.ico' });
        }
      }
      if (event.type === 'update' && event.data?.lida === true) {
        setAlertas(prev => prev.filter(a => a.id !== event.id));
      }
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  const marcarLida = async (id) => {
    await base44.entities.Notificacao.update(id, { lida: true });
    setAlertas(prev => prev.filter(a => a.id !== id));
    setDismissed(prev => new Set([...prev, id]));
  };

  const marcarTodasLidas = async () => {
    await Promise.all(alertas.map(a => base44.entities.Notificacao.update(a.id, { lida: true })));
    setDismissed(prev => new Set([...prev, ...alertas.map(a => a.id)]));
    setAlertas([]);
  };

  if (alertas.length === 0) return null;

  return (
    <div className="flex-shrink-0 space-y-2">
      {/* Banner principal */}
      <div className="bg-amber-50 border border-amber-300 rounded-2xl px-4 py-3 flex items-center gap-3 animate-pulse-once">
        <div className="w-9 h-9 rounded-xl bg-amber-200 flex items-center justify-center flex-shrink-0">
          <Bell size={16} className="text-amber-700" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-amber-800">
            {alertas.length === 1
              ? '1 OP pronta para separação!'
              : `${alertas.length} OPs prontas para separação!`}
          </p>
          <p className="text-xs text-amber-700 truncate">
            {alertas[0]?.descricao}
            {alertas.length > 1 && ` e mais ${alertas.length - 1}...`}
          </p>
        </div>
        <button
          onClick={marcarTodasLidas}
          className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-200 hover:bg-amber-300 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
        >
          <CheckCheck size={12} /> Marcar todas lidas
        </button>
      </div>

      {/* Cards individuais se houver mais de 1 */}
      {alertas.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {alertas.map(alerta => (
            <div key={alerta.id}
              className="flex items-center gap-2 bg-white border border-amber-200 rounded-xl px-3 py-2 text-xs shadow-sm">
              <Package size={12} className="text-amber-600 flex-shrink-0" />
              <span className="font-semibold text-foreground">{alerta.titulo.replace('📦 ', '')}</span>
              <button
                onClick={() => marcarLida(alerta.id)}
                className="p-0.5 hover:text-destructive text-muted-foreground transition-colors">
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}