import { base44 } from '@/api/base44Client';
import { Clock, LogOut } from 'lucide-react';

export default function AguardandoAprovacao({ user }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background p-6">
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md text-center p-8 space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto">
          <Clock size={32} className="text-amber-500" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-foreground">Acesso Pendente</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Seu cadastro foi realizado com sucesso, mas seu acesso ainda precisa ser liberado por um administrador.
          </p>
        </div>

        <div className="bg-muted/50 rounded-xl px-4 py-3 text-sm text-foreground">
          <span className="text-muted-foreground">Conta: </span>
          <span className="font-semibold">{user?.email}</span>
        </div>

        <p className="text-xs text-muted-foreground">
          Entre em contato com o administrador do sistema para que ele atribua um perfil ao seu usuário em <strong>Configurações → Usuários</strong>.
        </p>

        <button
          onClick={() => base44.auth.logout()}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <LogOut size={14} /> Sair da conta
        </button>
      </div>
    </div>
  );
}