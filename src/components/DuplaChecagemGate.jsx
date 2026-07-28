import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Lock, LogOut } from 'lucide-react';

const SESSION_KEY = 'dupla_checagem_ok';

// Bloqueia o acesso ao sistema até o usuário informar a senha de dupla checagem,
// quando o cargo dele estiver na lista configurada.
export default function DuplaChecagemGate({ user, children }) {
  const [estado, setEstado] = useState(() =>
    sessionStorage.getItem(SESSION_KEY) === '1' ? 'liberado' : 'carregando'
  );
  const [pin, setPin] = useState('');
  const [erro, setErro] = useState('');
  const [verificando, setVerificando] = useState(false);

  useEffect(() => {
    if (estado !== 'carregando') return;
    base44.functions.invoke('duplaChecagem', { acao: 'status' })
      .then(res => setEstado(res.data?.requerida ? 'bloqueado' : 'liberado'))
      .catch(() => setEstado('liberado'));
  }, [estado]);

  const confirmar = async () => {
    if (!pin.trim() || verificando) return;
    setVerificando(true);
    setErro('');
    try {
      const res = await base44.functions.invoke('duplaChecagem', { acao: 'verificar', pin: pin.trim() });
      if (res.data?.ok) {
        sessionStorage.setItem(SESSION_KEY, '1');
        setEstado('liberado');
      } else {
        setErro('Senha incorreta. Tente novamente.');
        setPin('');
      }
    } catch {
      setErro('Erro ao verificar. Tente novamente.');
    }
    setVerificando(false);
  };

  if (estado === 'liberado') return children;

  if (estado === 'carregando') {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl p-8 space-y-5 text-center">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <Lock size={26} className="text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Dupla Checagem</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Olá, {user?.full_name || user?.email}. Seu perfil requer uma senha adicional para acessar o sistema.
          </p>
        </div>
        <div className="space-y-3">
          <input
            type="password"
            value={pin}
            onChange={e => setPin(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && confirmar()}
            placeholder="Senha de acesso"
            autoFocus
            className="w-full border border-border rounded-xl px-4 py-3 text-center text-lg tracking-widest bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {erro && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{erro}</p>}
          <button
            onClick={confirmar}
            disabled={verificando || !pin.trim()}
            className="w-full bg-primary text-primary-foreground py-3 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity">
            {verificando ? 'Verificando...' : 'Entrar'}
          </button>
        </div>
        <button
          onClick={() => base44.auth.logout('/')}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <LogOut size={12} /> Sair da conta
        </button>
      </div>
    </div>
  );
}