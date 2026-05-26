import { useEffect, useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Send, Plus, Users, MessageCircle, X, User } from 'lucide-react';

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

  // Subscribe em tempo real para novas mensagens
  useEffect(() => {
    if (!conversaSelecionada) return;

    const unsubscribe = base44.entities.Mensagem.subscribe((event) => {
      if (event.type === 'create' && event.data?.conversa_id === conversaSelecionada.id) {
        setMensagens(prev => [...prev, event.data]);
      }
    });

    return () => unsubscribe();
  }, [conversaSelecionada]);

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
    <div className="flex h-[calc(100vh-100px)] gap-4">
      {/* Lista de Conversas */}
      <div className="w-80 bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle size={18} className="text-primary" />
            <h2 className="font-bold text-foreground">Conversas</h2>
          </div>
          <button 
            onClick={() => setShowNovaConversa(!showNovaConversa)}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <Plus size={18} className="text-primary" />
          </button>
        </div>

        {/* Nova Conversa */}
        {showNovaConversa && (
          <div className="p-4 border-b border-border bg-muted/30 space-y-3">
            <input
              type="text"
              value={tituloNovaConversa}
              onChange={(e) => setTituloNovaConversa(e.target.value)}
              placeholder="Título da conversa..."
              className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Users size={12} /> Participantes:
              </p>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {todosUsuarios.map(usuario => (
                  <button
                    key={usuario.id}
                    onClick={() => toggleParticipante(usuario.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
                      participantesNovaConversa.includes(usuario.id)
                        ? 'bg-primary/10 text-primary border border-primary/30'
                        : 'bg-background border border-border hover:bg-muted'
                    }`}
                  >
                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                      {usuario.full_name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    {usuario.full_name || usuario.email}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={criarConversa}
                className="flex-1 bg-primary text-primary-foreground py-2 rounded-xl text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                Criar
              </button>
              <button
                onClick={() => setShowNovaConversa(false)}
                className="px-3 border border-border rounded-xl text-xs text-muted-foreground hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {conversas.map(conversa => (
            <button
              key={conversa.id}
              onClick={() => selecionarConversa(conversa)}
              className={`w-full p-4 border-b border-border/50 hover:bg-muted/50 transition-colors text-left ${
                conversaSelecionada?.id === conversa.id ? 'bg-muted/70' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm truncate">{conversa.titulo}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {conversa.ultima_mensagem || 'Sem mensagens'}
                  </p>
                </div>
                {conversa.data_ultima_mensagem && (
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">
                    {formatarData(conversa.data_ultima_mensagem)}
                  </span>
                )}
              </div>
            </button>
          ))}
          {conversas.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              <MessageCircle size={24} className="mx-auto mb-2 opacity-50" />
              <p className="text-xs">Nenhuma conversa ainda</p>
            </div>
          )}
        </div>
      </div>

      {/* Área de Mensagens */}
      {conversaSelecionada ? (
        <div className="flex-1 bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                {conversaSelecionada.titulo.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-foreground text-sm">{conversaSelecionada.titulo}</p>
                <p className="text-xs text-muted-foreground">
                  {conversaSelecionada.participantes?.length || 0} participante(s)
                </p>
              </div>
            </div>
            <button
              onClick={() => setConversaSelecionada(null)}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <X size={18} className="text-muted-foreground" />
            </button>
          </div>

          {/* Mensagens */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {mensagens.map((mensagem, idx) => {
              const ehMeu = mensagem.remetente_id === usuarioAtual?.id;
              return (
                <div
                  key={mensagem.id || idx}
                  className={`flex ${ehMeu ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                      ehMeu
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                    }`}
                  >
                    {!ehMeu && (
                      <p className="text-[10px] font-semibold mb-0.5 opacity-70">
                        {mensagem.remetente_nome || 'Usuário'}
                      </p>
                    )}
                    <p className="text-sm">{mensagem.conteudo}</p>
                    <p className={`text-[9px] mt-1 ${ehMeu ? 'opacity-70' : 'opacity-50'}`}>
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
                <div className="text-center">
                  <MessageCircle size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Nenhuma mensagem ainda</p>
                  <p className="text-[10px] opacity-70">Seja o primeiro a enviar!</p>
                </div>
              </div>
            )}
            <div ref={mensagensEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-border">
            <div className="flex gap-2">
              <input
                type="text"
                value={novaMensagem}
                onChange={(e) => setNovaMensagem(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && enviarMensagem()}
                placeholder="Digite sua mensagem..."
                className="flex-1 border border-border rounded-xl px-4 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={loading}
              />
              <button
                onClick={enviarMensagem}
                disabled={loading || !novaMensagem.trim()}
                className="bg-primary text-primary-foreground px-5 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 bg-card border border-border rounded-2xl flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <MessageCircle size={48} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Selecione uma conversa para começar</p>
          </div>
        </div>
      )}
    </div>
  );
}