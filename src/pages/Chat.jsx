import { useEffect, useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Send, Users, MessageCircle, ChevronLeft, Search } from 'lucide-react';

export default function Chat() {
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [conversas, setConversas] = useState([]);
  const [conversaAtiva, setConversaAtiva] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [novaMensagem, setNovaMensagem] = useState('');
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(false);
  const mensagensEndRef = useRef(null);

  // Carrega usuário atual
  useEffect(() => {
    base44.auth.me().then(setUsuarioAtual).catch(() => {});
  }, []);

  // Carrega usuários e conversas quando usuário está pronto
  useEffect(() => {
    if (!usuarioAtual) return;
    carregarDados();
  }, [usuarioAtual]);

  const carregarDados = async () => {
    const [resUsuarios, todasConversas] = await Promise.all([
      base44.functions.invoke('chatListarUsuarios', {}),
      base44.entities.Conversa.list('-data_ultima_mensagem'),
    ]);
    setUsuarios(resUsuarios.data?.usuarios || []);
    setConversas(todasConversas.filter(c => c.participantes?.includes(usuarioAtual.id)));
  };

  // Scroll automático ao receber mensagens
  useEffect(() => {
    mensagensEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  // Subscribe em tempo real para novas mensagens
  useEffect(() => {
    if (!conversaAtiva) return;
    const unsubscribe = base44.entities.Mensagem.subscribe((event) => {
      if (event.type === 'create' && event.data?.conversa_id === conversaAtiva.id) {
        setMensagens(prev => {
          // Evita duplicatas
          if (prev.find(m => m.id === event.data.id)) return prev;
          return [...prev, event.data];
        });
      }
    });
    return () => unsubscribe();
  }, [conversaAtiva]);

  // Subscribe para atualizar lista de conversas em tempo real
  useEffect(() => {
    const unsubscribe = base44.entities.Conversa.subscribe(() => {
      carregarDados();
    });
    return () => unsubscribe();
  }, [usuarioAtual]);

  const getConversaComUsuario = (usuarioId) => {
    return conversas.find(c =>
      c.participantes?.includes(usuarioId) && c.participantes?.includes(usuarioAtual.id)
    );
  };

  const abrirConversa = async (usuario) => {
    let conversa = getConversaComUsuario(usuario.id);

    if (!conversa) {
      // Cria nova conversa
      const res = await base44.functions.invoke('chatCriarConversa', {
        titulo: `${usuarioAtual.full_name || usuarioAtual.email} ↔ ${usuario.full_name || usuario.email}`,
        participantes: [usuarioAtual.id, usuario.id],
      });
      conversa = res.data?.conversa;
      if (!conversa) return;
      await carregarDados();
    }

    setConversaAtiva({ ...conversa, _usuario: usuario });

    // Carrega mensagens
    const res = await base44.functions.invoke('chatListarMensagens', { conversa_id: conversa.id });
    setMensagens(res.data?.mensagens || []);

    // Marca como lidas
    marcarComoLidas(conversa.id);
  };

  const marcarComoLidas = async (conversaId) => {
    const msgs = await base44.entities.Mensagem.filter({ conversa_id: conversaId });
    await Promise.all(
      msgs.filter(m => !m.lida && m.remetente_id !== usuarioAtual.id)
          .map(m => base44.entities.Mensagem.update(m.id, { lida: true }))
    );
  };

  const enviarMensagem = async () => {
    if (!novaMensagem.trim() || !conversaAtiva || loading) return;
    setLoading(true);
    const conteudo = novaMensagem.trim();
    setNovaMensagem('');
    try {
      await base44.functions.invoke('chatEnviarMensagem', {
        conversa_id: conversaAtiva.id,
        conteudo,
      });
      await carregarDados();
    } catch (e) {
      alert('Erro ao enviar mensagem');
    } finally {
      setLoading(false);
    }
  };

  const formatarHora = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const agora = new Date();
    const diffH = (agora - d) / 3600000;
    if (diffH < 24) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    if (diffH < 48) return 'Ontem';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  // Monta lista de itens para sidebar: todos os usuários, com info da conversa se existir
  const itensLista = usuarios
    .filter(u => {
      if (!busca.trim()) return true;
      return (u.full_name || u.email || '').toLowerCase().includes(busca.toLowerCase());
    })
    .map(u => {
      const conversa = getConversaComUsuario(u.id);
      return { ...u, conversa };
    })
    .sort((a, b) => {
      // Conversas recentes primeiro
      const da = a.conversa?.data_ultima_mensagem ? new Date(a.conversa.data_ultima_mensagem) : new Date(0);
      const db = b.conversa?.data_ultima_mensagem ? new Date(b.conversa.data_ultima_mensagem) : new Date(0);
      return db - da;
    });

  const usuarioAtivo = conversaAtiva?._usuario;

  return (
    <div className="flex h-[calc(100vh-80px)] bg-background overflow-hidden">

      {/* Sidebar */}
      <div className={`${conversaAtiva ? 'hidden md:flex' : 'flex'} w-full md:w-80 lg:w-96 flex-col bg-card border-r border-border flex-shrink-0`}>
        <div className="px-4 py-3.5 border-b border-border flex items-center">
          <h2 className="font-bold text-foreground text-lg flex-1">Mensagens</h2>
        </div>

        <div className="px-3 py-2.5 border-b border-border/50">
          <div className="flex items-center gap-2 bg-muted/60 rounded-full px-3.5 py-2">
            <Search size={14} className="text-muted-foreground" />
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Pesquisar usuário..."
              className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none flex-1"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {itensLista.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <Users size={36} className="mb-2 opacity-20" />
              <p className="text-sm">Nenhum usuário encontrado</p>
            </div>
          )}
          {itensLista.map(usuario => {
            const ativo = conversaAtiva?.id === usuario.conversa?.id;
            return (
              <button
                key={usuario.id}
                onClick={() => abrirConversa(usuario)}
                className={`w-full px-3 py-2.5 transition-colors text-left flex items-center gap-3 border-b border-border/30 ${ativo ? 'bg-primary/10' : 'hover:bg-muted/40'}`}
              >
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-base font-bold text-primary">
                    {(usuario.full_name || usuario.email || 'U').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-1 mb-0.5">
                    <p className="font-semibold text-sm text-foreground truncate">{usuario.full_name || usuario.email}</p>
                    <span className="text-[11px] text-muted-foreground flex-shrink-0">
                      {formatarHora(usuario.conversa?.data_ultima_mensagem)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {usuario.conversa?.ultima_mensagem || <span className="italic opacity-60">Clique para conversar</span>}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Área de Mensagens */}
      <div className={`${conversaAtiva ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-[#efe7dd] overflow-hidden`}>
        {conversaAtiva && usuarioAtivo ? (
          <>
            {/* Header da conversa */}
            <div className="px-4 py-2.5 border-b border-border bg-card flex items-center gap-3 flex-shrink-0">
              <button
                onClick={() => { setConversaAtiva(null); setMensagens([]); }}
                className="md:hidden w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center"
              >
                <ChevronLeft size={20} className="text-muted-foreground" />
              </button>
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-primary">
                  {(usuarioAtivo.full_name || usuarioAtivo.email || 'U').charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-bold text-foreground text-sm">{usuarioAtivo.full_name || usuarioAtivo.email}</p>
                <p className="text-xs text-muted-foreground">{usuarioAtivo.email}</p>
              </div>
            </div>

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {mensagens.length === 0 && (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center bg-white/80 rounded-xl px-6 py-4">
                    <MessageCircle size={28} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-medium text-foreground">Nenhuma mensagem ainda</p>
                    <p className="text-xs text-muted-foreground mt-1">Seja o primeiro a enviar!</p>
                  </div>
                </div>
              )}
              {mensagens.map((msg, idx) => {
                const ehMeu = msg.remetente_id === usuarioAtual?.id;
                return (
                  <div key={msg.id || idx} className={`flex ${ehMeu ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2 shadow-sm ${ehMeu ? 'bg-[#d9fdd3]' : 'bg-white'}`}>
                      {!ehMeu && (
                        <p className="text-xs font-semibold text-primary mb-0.5">{msg.remetente_nome || 'Usuário'}</p>
                      )}
                      <p className="text-sm break-words leading-relaxed text-foreground">{msg.conteudo}</p>
                      <p className="text-[10px] text-right mt-1 text-muted-foreground">
                        {msg.created_date ? new Date(msg.created_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={mensagensEndRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 bg-card border-t border-border flex items-center gap-3 flex-shrink-0">
              <input
                type="text"
                value={novaMensagem}
                onChange={e => setNovaMensagem(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviarMensagem()}
                placeholder="Digite uma mensagem..."
                className="flex-1 border border-border rounded-full px-4 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={loading}
              />
              <button
                onClick={enviarMensagem}
                disabled={loading || !novaMensagem.trim()}
                className="w-11 h-11 rounded-full bg-primary text-white flex items-center justify-center hover:opacity-90 disabled:opacity-50 flex-shrink-0 shadow"
              >
                <Send size={17} className="ml-0.5" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-white/40 flex items-center justify-center mx-auto mb-4">
                <Users size={36} className="text-primary/50" />
              </div>
              <h3 className="text-base font-bold text-foreground/70 mb-1">Selecione uma conversa</h3>
              <p className="text-sm text-foreground/40">Clique em um usuário para começar a conversar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}