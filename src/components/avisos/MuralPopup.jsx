import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Megaphone, X } from 'lucide-react';

// Pop-up central de avisos do mural — mostra avisos ativos que o usuário ainda não viu
export default function MuralPopup() {
  const { user } = useAuth();
  const [pendentes, setPendentes] = useState([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!user) return;
    base44.entities.Aviso.filter({ ativo: true }, '-created_date')
      .then(avisos => {
        const vistos = new Set(user.avisos_vistos || []);
        setPendentes(avisos.filter(a => !vistos.has(a.id)));
      })
      .catch(() => {});
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (pendentes.length === 0 || idx >= pendentes.length) return null;

  const aviso = pendentes[idx];

  const fechar = async () => {
    const vistos = [...new Set([...(user?.avisos_vistos || []), aviso.id])];
    base44.auth.updateMe({ avisos_vistos: vistos }).catch(() => {});
    if (user) user.avisos_vistos = vistos;
    setIdx(i => i + 1);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4" style={{ background: '#0D3B45' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#C9A227' }}>
            <Megaphone size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#C9A227' }}>Mural de Avisos</p>
            <p className="text-sm font-bold text-white truncate">{aviso.titulo}</p>
          </div>
          <button onClick={fechar} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <X size={16} className="text-white/70" />
          </button>
        </div>
        <div className="px-5 py-5">
          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{aviso.mensagem}</p>
          <p className="text-xs text-muted-foreground mt-4">
            {aviso.criado_por_nome ? `Por ${aviso.criado_por_nome} · ` : ''}
            {aviso.created_date ? new Date(aviso.created_date).toLocaleDateString('pt-BR') : ''}
          </p>
        </div>
        <div className="px-5 pb-5 flex items-center justify-between gap-3">
          {pendentes.length > 1 && (
            <p className="text-xs text-muted-foreground">{idx + 1} de {pendentes.length}</p>
          )}
          <button onClick={fechar}
            className="ml-auto bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
}