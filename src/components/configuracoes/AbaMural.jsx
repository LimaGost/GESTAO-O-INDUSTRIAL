import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Megaphone, Plus, Trash2, Save } from 'lucide-react';

// Gerenciamento do Mural de Avisos (somente admins)
export default function AbaMural() {
  const { user } = useAuth();
  const [avisos, setAvisos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [titulo, setTitulo] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [salvando, setSalvando] = useState(false);

  const load = () => {
    base44.entities.Aviso.list('-created_date').then(data => {
      setAvisos(data);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const publicar = async () => {
    if (!titulo.trim() || !mensagem.trim()) return;
    setSalvando(true);
    await base44.entities.Aviso.create({
      titulo: titulo.trim(),
      mensagem: mensagem.trim(),
      ativo: true,
      criado_por_nome: user?.full_name || user?.email || '',
    });
    setTitulo('');
    setMensagem('');
    setSalvando(false);
    load();
  };

  const toggleAtivo = async (aviso) => {
    await base44.entities.Aviso.update(aviso.id, { ativo: !aviso.ativo });
    load();
  };

  const excluir = async (aviso) => {
    if (!confirm(`Excluir o aviso "${aviso.titulo}"?`)) return;
    await base44.entities.Aviso.delete(aviso.id);
    load();
  };

  if (loading) return <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">Carregando avisos...</div>;

  return (
    <div className="space-y-4">
      {/* Novo aviso */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Megaphone size={18} className="text-primary" />
          </div>
          <div>
            <p className="font-bold text-sm text-foreground">Novo Aviso</p>
            <p className="text-xs text-muted-foreground">O aviso aparece no centro da tela para todos os usuários ao entrarem no sistema.</p>
          </div>
        </div>
        <input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Título do aviso..."
          className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground/50" />
        <textarea value={mensagem} onChange={e => setMensagem(e.target.value)} placeholder="Mensagem do aviso..." rows={4}
          className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground/50 resize-none" />
        <button onClick={publicar} disabled={salvando || !titulo.trim() || !mensagem.trim()}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-50">
          <Plus size={14} /> {salvando ? 'Publicando...' : 'Publicar Aviso'}
        </button>
      </div>

      {/* Lista de avisos */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <p className="font-bold text-sm text-foreground">Avisos Publicados</p>
          <p className="text-xs text-muted-foreground">{avisos.length} aviso(s)</p>
        </div>
        <div className="p-4 space-y-2">
          {avisos.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-muted-foreground/60">
              <Megaphone size={24} className="mb-2 opacity-40" />
              <p className="text-xs">Nenhum aviso publicado.</p>
            </div>
          ) : (
            avisos.map(aviso => (
              <div key={aviso.id} className="bg-muted/30 border border-border/60 rounded-xl px-4 py-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{aviso.titulo}</p>
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-2">{aviso.mensagem}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {aviso.criado_por_nome ? `Por ${aviso.criado_por_nome} · ` : ''}
                    {aviso.created_date ? new Date(aviso.created_date).toLocaleDateString('pt-BR') : ''}
                  </p>
                </div>
                <button onClick={() => toggleAtivo(aviso)}
                  className={`text-[10px] px-2.5 py-1 rounded-full font-semibold border transition-all flex-shrink-0 ${
                    aviso.ativo ? 'bg-green-100 text-green-700 border-green-300' : 'bg-muted text-muted-foreground border-border'
                  }`}>
                  {aviso.ativo ? 'Ativo' : 'Inativo'}
                </button>
                <button onClick={() => excluir(aviso)}
                  className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors flex-shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}