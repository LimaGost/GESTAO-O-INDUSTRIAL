import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { GraduationCap, Plus, Search, X } from 'lucide-react';
import TutorialCard from '@/components/conhecimento/TutorialCard';
import ModalNovoTutorial from '@/components/conhecimento/ModalNovoTutorial';

export default function BaseConhecimento() {
  const { user } = useAuth();
  const podeEditar = ['admin', 'gerente_producao'].includes(user?.role);

  const [tutoriais, setTutoriais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroModulo, setFiltroModulo] = useState('todos');
  const [modal, setModal] = useState(null); // 'novo' | tutorial (edição)

  const load = async () => {
    setLoading(true);
    const lista = await base44.entities.Tutorial.filter({ ativo: true }, '-created_date');
    setTutoriais(lista);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const modulos = useMemo(() => {
    const set = new Set(tutoriais.map(t => t.modulo || 'Outros'));
    return ['todos', ...Array.from(set)];
  }, [tutoriais]);

  const filtrados = useMemo(() => {
    let list = tutoriais;
    if (filtroModulo !== 'todos') list = list.filter(t => (t.modulo || 'Outros') === filtroModulo);
    if (busca) {
      const b = busca.toLowerCase();
      list = list.filter(t => t.titulo?.toLowerCase().includes(b) || t.descricao?.toLowerCase().includes(b));
    }
    return list;
  }, [tutoriais, filtroModulo, busca]);

  const excluir = async (tutorial) => {
    if (!confirm(`Excluir o tutorial "${tutorial.titulo}"?`)) return;
    await base44.entities.Tutorial.delete(tutorial.id);
    await load();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-card border border-border rounded-2xl px-5 py-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
              <GraduationCap size={19} className="text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Base de Conhecimento</h2>
              <p className="text-xs text-muted-foreground">Tutoriais em vídeo de como usar o sistema · {tutoriais.length} vídeo(s)</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-1 md:flex-none justify-end">
            <div className="relative flex-1 md:flex-none">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar tutorial..."
                className="border border-border rounded-xl pl-8 pr-8 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary w-full md:w-52" />
              {busca && (
                <button onClick={() => setBusca('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X size={13} />
                </button>
              )}
            </div>
            {podeEditar && (
              <button onClick={() => setModal('novo')}
                className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm whitespace-nowrap">
                <Plus size={15} /> Novo Tutorial
              </button>
            )}
          </div>
        </div>

        {/* Filtro por módulo */}
        {modulos.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 flex-nowrap md:flex-wrap">
            {modulos.map(m => (
              <button key={m} onClick={() => setFiltroModulo(m)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex-shrink-0 whitespace-nowrap ${filtroModulo === m ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-border'}`}>
                {m === 'todos' ? '📚 Todos' : m}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grid de tutoriais */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl py-16 flex flex-col items-center gap-3 text-center px-6">
          <GraduationCap size={32} className="text-muted-foreground opacity-40" />
          <p className="font-bold text-foreground">Nenhum tutorial encontrado</p>
          <p className="text-sm text-muted-foreground">
            {podeEditar
              ? 'Grave a tela do sistema e clique em "Novo Tutorial" para publicar o primeiro vídeo.'
              : 'Os tutoriais publicados pelo administrador aparecerão aqui.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtrados.map(t => (
            <TutorialCard key={t.id} tutorial={t} podeEditar={podeEditar}
              onEditar={(tut) => setModal(tut)} onExcluir={excluir} />
          ))}
        </div>
      )}

      {modal && (
        <ModalNovoTutorial
          tutorial={modal === 'novo' ? null : modal}
          onSalvo={() => { setModal(null); load(); }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}