import { useEffect, useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Send, Plus, Users, MessageCircle, X, User, CheckCircle } from 'lucide-react';

export default function Chat() {
  const [conversas, setConversas] = useState([]);
  const [conversaSelecionada, setConversaSelecionada] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [novaMensagem, setNovaMensagem] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNovaConversa, setShowNovaConversa] = useState(false);
  const [tituloNovaConversa, setTituloNovaConversa] = useState('');
  const [participantesNovaConversa, setParticipantesNovaConversa] = useState([]);
  const [todosUsuarios, setTodosUsuarios] = useState([]);
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const [mensagensNaoLidas, setMensagensNaoLidas] = useState({});
  const [totalNaoLidas, setTotalNaoLidas] = useState(0);

  const mensagensEndRef = useRef(null);

  const scrollToBottom = () => {
    mensagensEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [mensagens]);

  // Carrega usuário atual
  useEffect(() => {
    base44.auth.me().then(setUsuarioAtual).catch(console.error);
  }, []);

  // Carrega conversas
  const loadConversas = async () => {
    try {
      const res = await base44.functions.invoke('chatListarConversas', {});
      setConversas(res.data.conversas || []);
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
    }
  };

  // Carrega usuários para selecionar participantes
  const loadUsuarios = async () => {
    try {
      const usuarios = await base44.entities.User.list();
      setTodosUsuarios(usuarios.filter(u => u.id !== usuarioAtual?.id));
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
  };

  useEffect(() => {
    if (usuarioAtual) {
      loadConversas();
      loadUsuarios();
      loadMensagensNaoLidas();
    }
  }, [usuarioAtual]);

  // Carrega mensagens da conversa selecionada
  const loadMensagens = async (conversaId) => {
    try {
      const res = await base44.functions.invoke('chatListarMensagens', { conversa_id: conversaId });
      setMensagens(res.data.mensagens || []);
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    }
  };

  // Conta mensagens não lidas de todas as conversas
  const loadMensagensNaoLidas = async () => {
    try {
      const todasMensagens = await base44.entities.Mensagem.list();
      const naoLidasPorConversa = {};
      let total = 0;
      
      todasMensagens.forEach(m => {
        if (!m.lida && m.remetente_id !== usuarioAtual?.id) {
          naoLidasPorConversa[m.conversa_id] = (naoLidasPorConversa[m.conversa_id] || 0) + 1;
          total++;
        }
      });
      
      setMensagensNaoLidas(naoLidasPorConversa);
      setTotalNaoLidas(total);
    } catch (error) {
      console.error('Erro ao carregar não lidas:', error);
    }
  };

  // Marca mensagens como lidas ao abrir conversa
  const marcarComoLidas = async (conversaId) => {
    try {
      const mensagens = await base44.entities.Mensagem.filter({ conversa_id: conversaId });
      await Promise.all(
        mensagens
          .filter(m => !m.lida && m.remetente_id !== usuarioAtual?.id)
          .map(m => base44.entities.Mensagem.update(m.id, { lida: true }))
      );
      loadMensagensNaoLidas();
    } catch (error) {
      console.error('Erro ao marcar como lidas:', error);
    }
  };

  // Subscribe em tempo real para novas mensagens
  useEffect(() => {
    if (!conversaSelecionada) return;

    const unsubscribe = base44.entities.Mensagem.subscribe((event) => {
      if (event.type === 'create' && event.data?.conversa_id === conversaSelecionada.id) {
        setMensagens(prev => [...prev, event.data]);
        // Se a mensagem não for minha, marca como lida automaticamente
        if (event.data?.remetente_id !== usuarioAtual?.id) {
          marcarComoLidas(conversaSelecionada.id);
        }
      }
    });

    return () => unsubscribe();
  }, [conversaSelecionada, usuarioAtual]);

  // Subscribe para atualizar lista de conversas
  useEffect(() => {
    const unsubscribe = base44.entities.Conversa.subscribe((event) => {
      if (event.type === 'create' || event.type === 'update') {
        loadConversas();
      }
    });

    return () => unsubscribe();
  }, []);

  const selecionarConversa = (conversa) => {
    setConversaSelecionada(conversa);
    loadMensagens(conversa.id);
    marcarComoLidas(conversa.id);
  };

  const enviarMensagem = async () => {
    if (!novaMensagem.trim() || !conversaSelecionada) return;

    setLoading(true);
    try {
      await base44.functions.invoke('chatEnviarMensagem', {
        conversa_id: conversaSelecionada.id,
        conteudo: novaMensagem,
      });
      setNovaMensagem('');
    } catch (error) {
      alert('Erro ao enviar mensagem: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const criarConversa = async () => {
    if (!tituloNovaConversa.trim() || participantesNovaConversa.length === 0) {
      alert('Preencha o título e selecione ao menos um participante');
      return;
    }

    try {
      await base44.functions.invoke('chatCriarConversa', {
        titulo: tituloNovaConversa,
        participantes: participantesNovaConversa,
      });
      setTituloNovaConversa('');
      setParticipantesNovaConversa([]);
      setShowNovaConversa(false);
      loadConversas();
    } catch (error) {
      alert('Erro ao criar conversa: ' + error.message);
    }
  };

  const toggleParticipante = (userId) => {
    setParticipantesNovaConversa(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const formatarData = (dataString) => {
    if (!dataString) return '';
    const data = new Date(dataString);
    const agora = new Date();
    const diff = agora - data;
    const horas = diff / (1000 * 60 * 60);
    
    if (horas < 24) {
      return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } else if (horas < 48) {
      return 'Ontem';
    } else {
      return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }
  };

  return (
    <div className="flex h-[calc(100vh-80px)] bg-background">
      {/* Lista de Conversas - estilo WhatsApp */}
      <div className="w-96 border-r border-border bg-card flex flex-col" style={{ maxWidth: '420px', minWidth: '320px' }}>
        {/* Header */}
        <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <MessageCircle size={20} className="text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-foreground text-sm">Conversas</h2>
              {totalNaoLidas > 0 && (
                <p className="text-[10px] text-primary font-semibold">{totalNaoLidas} não lida{totalNaoLidas !== 1 ? 's' : ''}</p>
              )}
            </div>
          </div>
          <button 
            onClick={() => setShowNovaConversa(!showNovaConversa)}
            className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
          >
            <Plus size={20} className="text-primary" />
          </button>
        </div>

        {/* Nova Conversa - Modal estilo WhatsApp */}
        {showNovaConversa && (
          <div className="p-4 border-b border-border bg-muted/30 space-y-3 max-h-64 overflow-y-auto">
            <input
              type="text"
              value={tituloNovaConversa}
              onChange={(e) => setTituloNovaConversa(e.target.value)}
              placeholder="Nome da conversa..."
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div>
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <Users size={12} /> Selecione os participantes:
              </p>
              <div className="space-y-1">
                {todosUsuarios.map(usuario => (
                  <button
                    key={usuario.id}
                    onClick={() => toggleParticipante(usuario.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      participantesNovaConversa.includes(usuario.id)
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      participantesNovaConversa.includes(usuario.id) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}>
                      {usuario.full_name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <span className="flex-1 text-left truncate">{usuario.full_name || usuario.email}</span>
                    {participantesNovaConversa.includes(usuario.id) && (
                      <CheckCircle size={16} className="text-primary flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={criarConversa}
                disabled={!tituloNovaConversa.trim() || participantesNovaConversa.length === 0}
                className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Criar conversa
              </button>
              <button
                onClick={() => setShowNovaConversa(false)}
                className="px-4 border border-border rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Lista de Conversas */}
        <div className="flex-1 overflow-y-auto">
          {conversas.map(conversa => {
            const naoLidas = mensagensNaoLidas[conversa.id] || 0;
            return (
              <button
                key={conversa.id}
                onClick={() => selecionarConversa(conversa)}
                className={`w-full px-4 py-3 border-b border-border/50 hover:bg-muted/50 transition-colors text-left flex items-center gap-3 ${
                  conversaSelecionada?.id === conversa.id ? 'bg-muted/70' : ''
                }`}
              >
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary">
                    {conversa.titulo.charAt(0).toUpperCase()}
                  </span>
                </div>
                {/* Conteúdo */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`font-semibold text-sm truncate ${naoLidas > 0 ? 'text-foreground' : 'text-foreground'}`}>
                      {conversa.titulo}
                    </p>
                    {conversa.data_ultima_mensagem && (
                      <span className={`text-[10px] flex-shrink-0 ${naoLidas > 0 ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                        {formatarData(conversa.data_ultima_mensagem)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className={`text-xs truncate ${naoLidas > 0 ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                      {conversa.ultima_mensagem || 'Sem mensagens'}
                    </p>
                    {naoLidas > 0 && (
                      <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center flex-shrink-0">
                        {naoLidas}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
          {conversas.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <MessageCircle size={40} className="mb-3 opacity-30" />
              <p className="text-sm">Nenhuma conversa</p>
              <p className="text-xs opacity-70 mt-1">Clique no + para começar</p>
            </div>
          )}
        </div>
      </div>

      {/* Área de Mensagens - estilo WhatsApp */}
      {conversaSelecionada ? (
        <div className="flex-1 flex flex-col bg-[#efe7dd]">
          {/* Header */}
          <div className="px-4 py-2.5 border-b border-border bg-card flex items-center gap-3 flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-primary">
                {conversaSelecionada.titulo.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-foreground text-sm truncate">{conversaSelecionada.titulo}</p>
              <p className="text-xs text-muted-foreground truncate">
                {conversaSelecionada.participantes?.length || 0} participante{conversaSelecionada.participantes?.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={() => setConversaSelecionada(null)}
              className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
            >
              <X size={18} className="text-muted-foreground" />
            </button>
          </div>

          {/* Mensagens com fundo estilo WhatsApp */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundRepeat: 'repeat', backgroundOpacity: 0.03 }}>
            {mensagens.map((mensagem, idx) => {
              const ehMeu = mensagem.remetente_id === usuarioAtual?.id;
              return (
                <div
                  key={mensagem.id || idx}
                  className={`flex ${ehMeu ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg px-3 py-2 shadow-sm ${
                      ehMeu
                        ? 'bg-[#d9fdd3] text-foreground'
                        : 'bg-white text-foreground'
                    }`}
                  >
                    {!ehMeu && (
                      <p className="text-[10px] font-semibold mb-0.5 text-primary">
                        {mensagem.remetente_nome || 'Usuário'}
                      </p>
                    )}
                    <p className="text-sm break-words">{mensagem.conteudo}</p>
                    <p className={`text-[10px] mt-1 text-right ${ehMeu ? 'text-green-700/70' : 'text-muted-foreground'}`}>
                      {mensagem.created_date 
                        ? new Date(mensagem.created_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                        : ''
                      }
                    </p>
                  </div>
                </div>
              );
            })}
            {mensagens.length === 0 && (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <div className="text-center bg-white/80 rounded-lg px-6 py-4">
                  <MessageCircle size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">Nenhuma mensagem ainda</p>
                  <p className="text-xs opacity-70 mt-1">Seja o primeiro a enviar!</p>
                </div>
              </div>
            )}
            <div ref={mensagensEndRef} />
          </div>

          {/* Input de Mensagem - estilo WhatsApp */}
          <div className="px-4 py-3 bg-card border-t border-border flex items-center gap-3 flex-shrink-0">
            <input
              type="text"
              value={novaMensagem}
              onChange={(e) => setNovaMensagem(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && enviarMensagem()}
              placeholder="Digite uma mensagem"
              className="flex-1 border border-border rounded-full px-4 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={loading}
            />
            <button
              onClick={enviarMensagem}
              disabled={loading || !novaMensagem.trim()}
              className="w-11 h-11 rounded-full bg-primary text-white flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            >
              <Send size={18} className="ml-0.5" />
            </button>
          </div>
        </div>
      ) : (
        /* Tela vazia - estilo WhatsApp Web */
        <div className="flex-1 flex flex-col items-center justify-center bg-[#efe7dd] border-b border-border">
          <div className="text-center max-w-md px-6">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <MessageCircle size={48} className="text-primary opacity-50" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">WhatsApp Web do Chat</h3>
            <p className="text-sm text-muted-foreground">
              Selecione uma conversa para começar ou crie uma nova conversa clicando no ícone de +
            </p>
          </div>
        </div>
      )}
    </div>
  );
}