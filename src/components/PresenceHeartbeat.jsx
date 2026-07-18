import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';

// Marca o usuário como ativo a cada 60s enquanto o app está aberto
export default function PresenceHeartbeat() {
  useEffect(() => {
    const ping = () => {
      if (document.visibilityState === 'visible') {
        base44.auth.updateMe({ ultima_atividade: new Date().toISOString() }).catch(() => {});
      }
    };
    ping();
    const interval = setInterval(ping, 60000);
    document.addEventListener('visibilitychange', ping);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', ping);
    };
  }, []);
  return null;
}