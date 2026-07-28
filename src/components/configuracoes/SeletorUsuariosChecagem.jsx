import { useState, useMemo } from 'react';
import { Search, UserCheck } from 'lucide-react';

export default function SeletorUsuariosChecagem({ usuarios = [], selecionados = [], onToggle }) {
  const [busca, setBusca] = useState('');

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return usuarios
      .filter(u => u.email !== 'moises.choas@gmail.com')
      .filter(u => !q || (u.full_name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q))
      .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
  }, [usuarios, busca]);

  return (
    <div>
      <label className="text-xs text-muted-foreground mb-2 block font-semibold">
        Usuários específicos que precisam informar a senha ({selecionados.length} selecionado{selecionados.length !== 1 ? 's' : ''})
      </label>

      <div className="flex items-center gap-2 border border-border rounded-xl px-3 py-2 mb-2 bg-background">
        <Search size={14} className="text-muted-foreground flex-shrink-0" />
        <input value={busca} onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por nome ou e-mail..."
          className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground" />
      </div>

      <div className="border border-border rounded-xl divide-y divide-border/60 max-h-60 overflow-y-auto">
        {lista.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">Nenhum usuário encontrado.</p>
        ) : lista.map(u => {
          const sel = selecionados.includes(u.id);
          return (
            <button key={u.id} onClick={() => onToggle(u.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${sel ? 'bg-primary/10' : 'hover:bg-muted/50'}`}>
              <div className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 ${sel ? 'bg-primary border-primary' : 'border-border'}`}>
                {sel && <UserCheck size={12} className="text-primary-foreground" />}
              </div>
              <div className="min-w-0">
                <p className={`text-xs font-semibold truncate ${sel ? 'text-primary' : 'text-foreground'}`}>{u.full_name || 'Sem nome'}</p>
                <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
              </div>
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground mt-2">Vale para qualquer usuário, inclusive administradores. Apenas o gestor (moises.choas@gmail.com) nunca é bloqueado.</p>
    </div>
  );
}