import { useEffect, useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Send, Plus, Users, MessageCircle, X, User, CheckCircle, ChevronLeft } from 'lucide-react';

export default function Chat() {
  const [usuariosDisponiveis, setUsuariosDisponiveis] = useState([]);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState(null);
  const [conversaAtiva, setConversaAtiva] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [novaMensagem, setNovaMensagem] = useState('');
  const [loading, setLoading] = useState(false);
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

  // Carrega usuários disponíveis para chat
  const loadUsuarios = async () => {
    try {
      const usuarios = await base44.entities.User.list();
      const outrosUsuarios = usuarios.filter(u => u.id !== usuarioAtual?.id);
      
      // Carrega conversas existentes para contar mensagens não lidas
      const todasConversas = await base44.entities.Conversa.list();
      
      // Mapeia usuários com status de mensagens não lidas
      const usuariosComStatus = outrosUsuarios.map(usuario => {
        const conversa = todasConversas.find(c => 
          c.participantes?.includes(usuario.id) && c.participantes?.includes(usuarioAtual.id)
        );
        const naoLidas = mensagensNaoLidas[conversa?.id] || 0;
        
        return {
          ...usuario,
          ultimaMensagem: conversa?.ultima_mensagem || null,
          dataUltimaMensagem: conversa?.data_ultima_mensagem || null,
          conversaId: conversa?.id || null,
          naoLidas,
        };
      });
      
      setUsuariosDisponiveis(usuariosComStatus);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
  };

  useEffect(() => {
    if (usuarioAtual) {
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
    if (!conversaAtiva) return;

    const unsubscribe = base44.entities.Mensagem.subscribe((event) => {
      if (event.type === 'create' && event.data?.conversa_id === conversaAtiva.id) {
        setMensagens(prev => [...prev, event.data]);
        // Se a mensagem não for minha, marca como lida automaticamente
        if (event.data?.remetente_id !== usuarioAtual?.id) {
          marcarComoLidas(conversaAtiva.id);
        }
        loadUsuarios(); // Atualiza lista de usuários
      }
    });

    return () => unsubscribe();
  }, [conversaAtiva, usuarioAtual]);

  // Subscribe para atualizar lista de usuários
  useEffect(() => {
    const unsubscribe = base44.entities.Conversa.subscribe((event) => {
      if (event.type === 'create' || event.type === 'update') {
        loadUsuarios();
      }
    });

    return () => unsubscribe();
  }, []);

  // Seleciona usuário e cria/abre conversa
  const selecionarUsuario = async (usuario) => {
    setUsuarioSelecionado(usuario);
    
    // Verifica se já existe conversa
    if (usuario.conversaId) {
      setConversaAtiva({ id: usuario.conversaId, titulo: usuario.full_name || usuario.email });
      loadMensagens(usuario.conversaId);
      marcarComoLidas(usuario.conversaId);
    } else {
      // Cria nova conversa automaticamente
      try {
        const novaConversa = await base44.functions.invoke('chatCriarConversa', {
          titulo: `${usuarioAtual.full_name || usuarioAtual.email} ↔ ${usuario.full_name || usuario.email}`,
          participantes: [usuario.id, usuarioAtual.id],
        });
        
        const conversaCriada = {
          id: novaConversa.data.id || novaConversa.data.conversa_id,
          titulo: usuario.full_name || usuario.email,
        };
        setConversaAtiva(conversaCriada);
        loadUsuarios(); // Recarrega para atualizar status
      } catch (error) {
        console.error('Erro ao criar conversa:', error);
      }
    }
  };

  const enviarMensagem = async () => {
    if (!novaMensagem.trim() || !conversaAtiva) return;

    setLoading(true);
    try {
      await base44.functions.invoke('chatEnviarMensagem', {
        conversa_id: conversaAtiva.id,
        conteudo: novaMensagem,
      });
      setNovaMensagem('');
      loadUsuarios(); // Atualiza última mensagem na lista
    } catch (error) {
      alert('Erro ao enviar mensagem: ' + error.message);
    } finally {
      setLoading(false);
    }
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
      {/* Mobile: Lista de Usuários */}
      <div className={`md:flex w-full ${usuarioSelecionado ? 'hidden' : 'flex'} flex-col bg-card`}>
        {/* Header */}
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Users size={20} className="text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-foreground text-sm">Usuários</h2>
              {totalNaoLidas > 0 && (
                <p className="text-[10px] text-primary font-semibold">{totalNaoLidas} não lida{totalNaoLidas !== 1 ? 's' : ''}</p>
              )}
            </div>
          </div>
        </div>

        {/* Lista de Usuários */}
        <div className="flex-1 overflow-y-auto">
          {usuariosDisponiveis.map(usuario => (
            <button
              key={usuario.id}
              onClick={() => selecionarUsuario(usuario)}
              className="w-full px-4 py-3 border-b border-border/50 hover:bg-muted/50 transition-colors text-left flex items-center gap-3"
            >
              {/* Avatar */}
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 relative">
                <span className="text-sm font-bold text-primary">
                  {usuario.full_name?.charAt(0).toUpperCase() || 'U'}
                </span>
                {/* Indicador online */}
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
              </div>
              {/* Conteúdo */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-sm truncate text-foreground">
                    {usuario.full_name || usuario.email}
                  </p>
                  {usuario.dataUltimaMensagem && (
                    <span className={`text-[10px] flex-shrink-0 ${usuario.naoLidas > 0 ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                      {formatarData(usuario.dataUltimaMensagem)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className={`text-xs truncate ${usuario.naoLidas > 0 ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                    {usuario.ultimaMensagem || 'Clique para iniciar conversa'}
                  </p>
                  {usuario.naoLidas > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center flex-shrink-0">
                      {usuario.naoLidas}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
          {usuariosDisponiveis.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <Users size={40} className="mb-3 opacity-30" />
              <p className="text-sm">Nenhum usuário disponível</p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile: Tela de Conversa (tela cheia) */}
      <div className={`md:flex flex-1 ${usuarioSelecionado ? 'flex' : 'hidden'} md:w-auto md:flex md:flex-col bg-[#efe7dd]`}>
        {/* Área de Mensagens - estilo WhatsApp */}
        {usuarioSelecionado && conversaAtiva ? (
          <div className="flex-1 flex flex-col w-full h-full">
            {/* Header */}
            <div className="px-4 py-2.5 border-b border-border bg-card flex items-center gap-3 flex-shrink-0">
              <button
                onClick={() => {
                  setUsuarioSelecionado(null);
                  setConversaAtiva(null);
                }}
                className="md:hidden w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
              >
                <ChevronLeft size={20} className="text-muted-foreground" />
              </button>
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 relative">
                <span className="text-sm font-bold text-primary">
                  {usuarioSelecionado.full_name?.charAt(0).toUpperCase() || 'U'}
                </span>
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground text-sm truncate">{usuarioSelecionado.full_name || usuarioSelecionado.email}</p>
                <p className="text-xs text-green-600 font-medium">Online</p>
              </div>
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
                      className={`max-w-[80%] md:max-w-[70%] rounded-lg px-3 py-2 shadow-sm ${
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
          <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-[#efe7dd]">
            <div className="text-center max-w-md px-6">
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Users size={48} className="text-primary opacity-50" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Selecione um usuário</h3>
              <p className="text-sm text-muted-foreground">
                Clique em um usuário da lista para começar a conversar
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}