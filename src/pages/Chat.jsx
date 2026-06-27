import { useEffect, useState, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Send, Users, MessageCircle, ChevronLeft, Search, Bell, BellOff } from 'lucide-react';

// Som de notificação via Web Audio API (sem arquivo externo)
function tocarSomNotificacao() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch {}
}

function getIniciais(nome, email) {
  const n = nome || email || 'U';
  return n.trim().charAt(0).toUpperCase();
}

function formatarHora(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const agora = new Date();
  const diffH = (agora - d) / 3600000;
  if (diffH < 24) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (diffH < 48) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export default function Chat() {
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [conversas, setConversas] = useState([]);
  const [conversaAtiva, setConversaAtiva] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [novaMensagem, setNovaMensagem] = useState('');
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingUsuarios, setLoadingUsuarios] = useState(true);
  const [somAtivado, setSomAtivado] = useState(true);
  const [naoLidas, setNaoLidas] = useState({}); // { conversaId: count }
  const mensagensEndRef = useRef(null);
  const conversaAtivaRef = useRef(null);
  const usuarioAtualRef = useRef(null);

  // Mantém refs atualizadas para usar dentro de callbacks
  useEffect(() => { conversaAtivaRef.current = conversaAtiva; }, [conversaAtiva]);
  useEffect(() => { usuarioAtualRef.current = usuarioAtual; }, [usuarioAtual]);

  // Carrega usuário atual
  useEffect(() => {
    base44.auth.me().then(u => {
      setUsuarioAtual(u);
    }).catch(() => {});
  }, []);

  // Carrega dados quando usuário está pronto
  useEffect(() => {
    if (!usuarioAtual) return;
    carregarDados();
  }, [usuarioAtual]);

  const carregarDados = useCallback(async () => {
    if (!usuarioAtualRef.current) return;
    const uid = usuarioAtualRef.current.id;
    try {
      const [resUsuarios, todasConversas] = await Promise.all([
        base44.functions.invoke('chatListarUsuarios', {}),
        base44.entities.Conversa.list('-data_ultima_mensagem'),
      ]);

      const lista = resUsuarios.data?.usuarios || [];
      setUsuarios(lista);

      const minhasConversas = todasConversas.filter(c => c.participantes?.includes(uid));
      setConversas(minhasConversas);

      contarNaoLidas(minhasConversas, uid);
    } catch (e) {
      console.warn('[Chat] Erro ao carregar dados:', e.message);
    } finally {
      setLoadingUsuarios(false);
    }
  }, []);

  const contarNaoLidas = async (convs, uid) => {
    const counts = {};
    await Promise.all(convs.map(async (c) => {
      const msgs = await base44.entities.Mensagem.filter({ conversa_id: c.id });
      const nLidas = msgs.filter(m => !m.lida && m.remetente_id !== uid).length;
      if (nLidas > 0) counts[c.id] = nLidas;
    }));
    setNaoLidas(counts);
  };

  // Scroll automático
  useEffect(() => {
    mensagensEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  // Subscribe mensagens em tempo real
  useEffect(() => {
    if (!conversaAtiva) return;
    const unsubscribe = base44.entities.Mensagem.subscribe((event) => {
      if (event.type === 'create' && event.data?.conversa_id === conversaAtivaRef.current?.id) {
        setMensagens(prev => {
          if (prev.find(m => m.id === event.data.id)) return prev;
          // Som apenas para mensagens de outros
          if (event.data.remetente_id !== usuarioAtualRef.current?.id && somAtivado) {
            tocarSomNotificacao();
          }
          return [...prev, event.data];
        });
      }
    });
    return () => unsubscribe();
  }, [conversaAtiva, somAtivado]);

  // Subscribe global para notificações de novas mensagens em outras conversas
  useEffect(() => {
    if (!usuarioAtual) return;
    const unsubscribe = base44.entities.Mensagem.subscribe((event) => {
      if (event.type !== 'create') return;
      const msg = event.data;
      if (!msg || msg.remetente_id === usuarioAtualRef.current?.id) return;
      // Se não é da conversa ativa → notificação
      if (msg.conversa_id !== conversaAtivaRef.current?.id) {
        if (somAtivado) tocarSomNotificacao();
        setNaoLidas(prev => ({ ...prev, [msg.conversa_id]: (prev[msg.conversa_id] || 0) + 1 }));
        // Notificação do browser
        if (Notification.permission === 'granted') {
          new Notification('Nova mensagem', {
            body: msg.conteudo?.slice(0, 80) || 'Nova mensagem recebida',
            icon: '/favicon.ico',
          });
        }
      }
    });
    return () => unsubscribe();
  }, [usuarioAtual, somAtivado]);

  // Solicita permissão de notificação
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Subscribe conversas
  useEffect(() => {
    if (!usuarioAtual) return;
    const unsubscribe = base44.entities.Conversa.subscribe(() => {
      carregarDados();
    });
    return () => unsubscribe();
  }, [usuarioAtual, carregarDados]);

  // Retorna a conversa 1:1 única entre os dois usuários (participantes exatamente [uid, outroId])
  const getConversaComUsuario = (usuarioId) => {
    return conversas.find(c => {
      const p = c.participantes || [];
      return p.length === 2 && p.includes(usuarioId) && p.includes(usuarioAtual?.id);
    });
  };

  const abrirConversa = async (usuario) => {
    // 1. Tenta achar no estado local primeiro
    let conversa = getConversaComUsuario(usuario.id);

    // 2. Se não achou localmente, busca no banco para evitar duplicatas
    if (!conversa) {
      const todasConversas = await base44.entities.Conversa.list('-data_ultima_mensagem');
      const uid = usuarioAtual.id;
      conversa = todasConversas.find(c => {
        const p = c.participantes || [];
        return p.length === 2 && p.includes(uid) && p.includes(usuario.id);
      });
    }

    // 3. Só cria se realmente não existir
    if (!conversa) {
      const res = await base44.functions.invoke('chatCriarConversa', {
        titulo: `${usuarioAtual.full_name || usuarioAtual.email} ↔ ${usuario.full_name || usuario.email}`,
        participantes: [usuarioAtual.id, usuario.id],
      });
      conversa = res.data?.conversa;
      if (!conversa) return;
      await carregarDados();
    }

    setConversaAtiva({ ...conversa, _usuario: usuario });
    const res = await base44.functions.invoke('chatListarMensagens', { conversa_id: conversa.id });
    setMensagens(res.data?.mensagens || []);
    marcarComoLidas(conversa.id);
    setNaoLidas(prev => { const n = { ...prev }; delete n[conversa.id]; return n; });
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
    } catch {
      alert('Erro ao enviar mensagem');
    } finally {
      setLoading(false);
    }
  };

  const totalNaoLidas = Object.values(naoLidas).reduce((s, v) => s + v, 0);

  // Monta lista sidebar
  const itensLista = usuarios
    .filter(u => {
      if (!busca.trim()) return true;
      return (u.full_name || u.email || '').toLowerCase().includes(busca.toLowerCase());
    })
    .map(u => ({ ...u, conversa: getConversaComUsuario(u.id) }))
    .sort((a, b) => {
      const da = a.conversa?.data_ultima_mensagem ? new Date(a.conversa.data_ultima_mensagem) : new Date(0);
      const db = b.conversa?.data_ultima_mensagem ? new Date(b.conversa.data_ultima_mensagem) : new Date(0);
      return db - da;
    });

  const usuarioAtivo = conversaAtiva?._usuario;

  return (
    <div className="flex h-[calc(100vh-80px)] bg-background overflow-hidden">

      {/* Sidebar */}
      <div className={`${conversaAtiva ? 'hidden md:flex' : 'flex'} w-full md:w-80 lg:w-96 flex-col bg-card border-r border-border flex-shrink-0`}>
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-border flex items-center gap-2">
          <h2 className="font-bold text-foreground text-lg flex-1">
            Mensagens
            {totalNaoLidas > 0 && (
              <span className="ml-2 text-xs bg-primary text-white rounded-full px-2 py-0.5 font-bold">{totalNaoLidas}</span>
            )}
          </h2>
          <button
            onClick={() => setSomAtivado(v => !v)}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${somAtivado ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}
            title={somAtivado ? 'Desativar som' : 'Ativar som'}
          >
            {somAtivado ? <Bell size={15} /> : <BellOff size={15} />}
          </button>
        </div>

        {/* Busca */}
        <div className="px-3 py-2.5 border-b border-border/50">
          <div className="flex items-center gap-2 bg-muted/60 rounded-full px-3.5 py-2">
            <Search size={14} className="text-muted-foreground flex-shrink-0" />
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Pesquisar usuário..."
              className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none flex-1"
            />
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {loadingUsuarios && (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          )}
          {!loadingUsuarios && itensLista.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground px-4 text-center">
              <Users size={36} className="mb-2 opacity-20" />
              <p className="text-sm">{busca ? 'Nenhum resultado' : 'Nenhum usuário encontrado'}</p>
              {!busca && <p className="text-xs mt-1 opacity-60">Outros usuários do sistema aparecerão aqui</p>}
            </div>
          )}
          {itensLista.map(usuario => {
            const ativo = conversaAtiva?._usuario?.id === usuario.id;
            const qtdNaoLidas = naoLidas[usuario.conversa?.id] || 0;
            return (
              <button
                key={usuario.id}
                onClick={() => abrirConversa(usuario)}
                className={`w-full px-3 py-3 transition-colors text-left flex items-center gap-3 border-b border-border/30 ${ativo ? 'bg-primary/10' : 'hover:bg-muted/40'}`}
              >
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-base font-bold text-primary">{getIniciais(usuario.full_name, usuario.email)}</span>
                  </div>
                  {qtdNaoLidas > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {qtdNaoLidas > 9 ? '9+' : qtdNaoLidas}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-1 mb-0.5">
                    <p className={`text-sm truncate ${qtdNaoLidas > 0 ? 'font-bold text-foreground' : 'font-semibold text-foreground'}`}>
                      {usuario.full_name || usuario.email}
                    </p>
                    <span className="text-[11px] text-muted-foreground flex-shrink-0">
                      {formatarHora(usuario.conversa?.data_ultima_mensagem)}
                    </span>
                  </div>
                  <p className={`text-xs truncate ${qtdNaoLidas > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
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
            {/* Header */}
            <div className="px-4 py-2.5 border-b border-border bg-card flex items-center gap-3 flex-shrink-0">
              <button
                onClick={() => { setConversaAtiva(null); setMensagens([]); }}
                className="md:hidden w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center"
              >
                <ChevronLeft size={20} className="text-muted-foreground" />
              </button>
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-primary">{getIniciais(usuarioAtivo.full_name, usuarioAtivo.email)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground text-sm">{usuarioAtivo.full_name || usuarioAtivo.email}</p>
                <p className="text-xs text-muted-foreground truncate">{usuarioAtivo.email}</p>
              </div>
            </div>

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
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
                const msgAnterior = mensagens[idx - 1];
                const mesmoRemetente = msgAnterior && msgAnterior.remetente_id === msg.remetente_id;
                return (
                  <div key={msg.id || idx} className={`flex ${ehMeu ? 'justify-end' : 'justify-start'} ${mesmoRemetente ? 'mt-0.5' : 'mt-3'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2 shadow-sm ${ehMeu ? 'bg-[#d9fdd3] rounded-tr-sm' : 'bg-white rounded-tl-sm'}`}>
                      {!ehMeu && !mesmoRemetente && (
                        <p className="text-xs font-semibold text-primary mb-0.5">{msg.remetente_nome || 'Usuário'}</p>
                      )}
                      <p className="text-sm break-words leading-relaxed text-foreground">{msg.conteudo}</p>
                      <div className={`flex items-center gap-1 mt-0.5 ${ehMeu ? 'justify-end' : 'justify-start'}`}>
                        <p className="text-[10px] text-muted-foreground">
                          {msg.created_date ? new Date(msg.created_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </p>
                        {ehMeu && <span className="text-[10px] text-muted-foreground">{msg.lida ? '✓✓' : '✓'}</span>}
                      </div>
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
                autoFocus
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