import { useEffect, useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import {
  MessageCircle, Search, X, Send, Phone, User, RefreshCw,
  ChevronLeft, AlertCircle, Loader2, CheckCheck
} from 'lucide-react';

function fmtTelefone(tel) {
  if (!tel) return '';
  return tel.replace(/\D/g, '');
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min atrás`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atrás`;
  return `${Math.floor(hrs / 24)}d atrás`;
}

// ── Componente de chat individual ────────────────────────────────────────────
function ChatPanel({ cliente, chatId, onClose }) {
  const [mensagem, setMensagem] = useState('');
  const [mensagens, setMensagens] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(true);
  const bottomRef = useRef(null);

  const carregarMensagens = async () => {
    try {
      const res = await base44.functions.invoke('smClickChatMensagens', { chatId });
      if (res.data?.mensagens) setMensagens(res.data.mensagens);
    } catch {}
    setLoadingMsgs(false);
  };

  useEffect(() => {
    carregarMensagens();
    const interval = setInterval(carregarMensagens, 10000);
    return () => clearInterval(interval);
  }, [chatId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  const enviar = async () => {
    const texto = mensagem.trim();
    if (!texto || enviando) return;
    setEnviando(true);
    const msgTemp = { id: Date.now(), texto, de: 'sistema', created_date: new Date().toISOString() };
    setMensagens(prev => [...prev, msgTemp]);
    setMensagem('');
    try {
      await base44.functions.invoke('smClickEnviarMensagem', { chatId, mensagem: texto });
      await carregarMensagens();
    } catch (e) {
      alert('Erro ao enviar mensagem: ' + e.message);
    }
    setEnviando(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header do chat */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card flex-shrink-0">
        <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg md:hidden">
          <ChevronLeft size={16} className="text-muted-foreground" />
        </button>
        <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center font-bold text-green-700 text-sm flex-shrink-0">
          {(cliente.nome || 'C').charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-foreground truncate">{cliente.nome}</p>
          <p className="text-xs text-muted-foreground">Chat ID: {chatId.slice(0, 8)}…</p>
        </div>
        <button onClick={carregarMensagens} className="p-1.5 hover:bg-muted rounded-lg">
          <RefreshCw size={14} className="text-muted-foreground" />
        </button>
      </div>

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ background: '#ECE5DD' }}>
        {loadingMsgs ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={24} className="animate-spin text-muted-foreground" />
          </div>
        ) : mensagens.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <MessageCircle size={40} className="text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda.<br />Inicie a conversa!</p>
          </div>
        ) : (
          mensagens.map((msg, i) => {
            const deSistema = msg.de === 'sistema' || msg.fromMe;
            return (
              <div key={msg.id || i} className={`flex ${deSistema ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] px-3 py-2 rounded-2xl shadow-sm text-sm leading-relaxed ${
                    deSistema
                      ? 'bg-green-100 text-green-900 rounded-br-sm'
                      : 'bg-white text-foreground rounded-bl-sm'
                  }`}
                >
                  <p>{msg.texto || msg.body || msg.message || msg.content}</p>
                  <p className={`text-[10px] mt-1 text-right ${deSistema ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {timeAgo(msg.created_date || msg.createdAt)}
                    {deSistema && <CheckCheck size={11} className="inline ml-1" />}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input de mensagem */}
      <div className="flex items-end gap-2 px-4 py-3 border-t border-border bg-card flex-shrink-0">
        <textarea
          value={mensagem}
          onChange={e => setMensagem(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } }}
          placeholder="Digite uma mensagem..."
          rows={1}
          className="flex-1 border border-border rounded-2xl px-4 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          style={{ maxHeight: '100px', overflowY: 'auto' }}
        />
        <button
          onClick={enviar}
          disabled={enviando || !mensagem.trim()}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-green-500 text-white hover:bg-green-600 transition-colors disabled:opacity-40 flex-shrink-0"
        >
          {enviando ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
}

// ── Card de cliente na lista ─────────────────────────────────────────────────
function ClienteCard({ cliente, chatAtivo, onIniciarChat, onAbrirChat, iniciando }) {
  const temTelefone = !!cliente.telefone;
  const temChat = !!chatAtivo;

  return (
    <div className={`bg-card border rounded-2xl p-4 transition-all hover:shadow-md ${temChat ? 'border-green-200' : 'border-border'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary flex-shrink-0">
            {(cliente.nome || 'C').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-foreground truncate">{cliente.nome}</p>
            {cliente.telefone && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Phone size={10} /> {cliente.telefone}
              </p>
            )}
            {cliente.cidade && (
              <p className="text-xs text-muted-foreground truncate">{cliente.cidade}{cliente.estado ? `, ${cliente.estado}` : ''}</p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 flex-shrink-0">
          {temChat ? (
            <button
              onClick={() => onAbrirChat(cliente, chatAtivo)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-green-500 text-white hover:bg-green-600 transition-colors"
            >
              <MessageCircle size={13} /> Abrir Chat
            </button>
          ) : temTelefone ? (
            <button
              onClick={() => onIniciarChat(cliente)}
              disabled={iniciando}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-green-100 text-green-700 border border-green-300 hover:bg-green-200 transition-colors disabled:opacity-50"
            >
              {iniciando ? <Loader2 size={13} className="animate-spin" /> : <MessageCircle size={13} />}
              {iniciando ? 'Iniciando...' : 'Iniciar Chat'}
            </button>
          ) : (
            <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-3 py-2 rounded-xl">
              <AlertCircle size={12} /> Sem telefone
            </span>
          )}
        </div>
      </div>

      {temChat && (
        <div className="mt-2 pt-2 border-t border-border">
          <p className="text-[11px] text-green-600 font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
            Chat ativo · ID: {chatAtivo.chat_id.slice(0, 12)}…
          </p>
        </div>
      )}
    </div>
  );
}

// ── Página principal CRM ─────────────────────────────────────────────────────
export default function CRM() {
  const [clientes, setClientes] = useState([]);
  const [busca, setBusca] = useState('');
  const [chatsAtivos, setChatsAtivos] = useState({}); // clienteId -> { chat_id }
  const [iniciandoId, setIniciandoId] = useState(null);
  const [chatAberto, setChatAberto] = useState(null); // { cliente, chat_id }
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Cliente.list().then(data => {
      setClientes(data);
      setLoading(false);
    });

    // Carrega chats salvos do localStorage
    try {
      const saved = JSON.parse(localStorage.getItem('crm_chats_ativos') || '{}');
      setChatsAtivos(saved);
    } catch {}
  }, []);

  const salvarChats = (novos) => {
    setChatsAtivos(novos);
    localStorage.setItem('crm_chats_ativos', JSON.stringify(novos));
  };

  const iniciarChat = async (cliente) => {
    const tel = fmtTelefone(cliente.telefone);
    if (!tel) return alert('Cliente sem telefone cadastrado.');
    setIniciandoId(cliente.id);
    try {
      const res = await base44.functions.invoke('smClickCriarChat', {
        telefone: tel,
        nomeCliente: cliente.nome,
      });
      if (res.data?.chat_id) {
        const novos = { ...chatsAtivos, [cliente.id]: { chat_id: res.data.chat_id } };
        salvarChats(novos);
        setChatAberto({ cliente, chat_id: res.data.chat_id });
      } else {
        alert('Erro ao criar chat: ' + (res.data?.erro || 'Resposta inesperada'));
      }
    } catch (e) {
      alert('Erro ao iniciar chat: ' + e.message);
    }
    setIniciandoId(null);
  };

  const filtrados = clientes.filter(c =>
    c.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (c.telefone || '').includes(busca)
  );

  return (
    <div className="flex h-full gap-4" style={{ minHeight: 'calc(100vh - 140px)' }}>
      {/* Lista de clientes */}
      <div className={`flex flex-col ${chatAberto ? 'hidden md:flex md:w-80 flex-shrink-0' : 'flex-1'}`}>
        {/* Header */}
        <div className="bg-card border border-border rounded-2xl px-4 py-4 mb-4 flex-shrink-0">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-green-100 flex items-center justify-center">
              <MessageCircle size={19} className="text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">CRM WhatsApp</h2>
              <p className="text-xs text-muted-foreground">
                {clientes.length} cliente(s) · {Object.keys(chatsAtivos).length} chat(s) ativo(s)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-muted/40 border border-border rounded-xl px-3 py-2">
            <Search size={14} className="text-muted-foreground flex-shrink-0" />
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar cliente ou telefone..."
              className="bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground w-full"
            />
            {busca && (
              <button onClick={() => setBusca('')} className="text-muted-foreground hover:text-foreground">
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="animate-spin text-muted-foreground" />
            </div>
          ) : filtrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <User size={40} className="opacity-20 mb-2" />
              <p className="text-sm">Nenhum cliente encontrado</p>
            </div>
          ) : (
            filtrados.map(cliente => (
              <ClienteCard
                key={cliente.id}
                cliente={cliente}
                chatAtivo={chatsAtivos[cliente.id]}
                iniciando={iniciandoId === cliente.id}
                onIniciarChat={iniciarChat}
                onAbrirChat={(c, chat) => setChatAberto({ cliente: c, chat_id: chat.chat_id })}
              />
            ))
          )}
        </div>
      </div>

      {/* Painel de chat */}
      {chatAberto ? (
        <div className="flex-1 bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
          <ChatPanel
            cliente={chatAberto.cliente}
            chatId={chatAberto.chat_id}
            onClose={() => setChatAberto(null)}
          />
        </div>
      ) : (
        <div className="hidden md:flex flex-1 bg-card border border-border rounded-2xl items-center justify-center">
          <div className="text-center text-muted-foreground">
            <MessageCircle size={56} className="mx-auto mb-4 opacity-20" />
            <p className="font-semibold">Selecione um cliente</p>
            <p className="text-sm mt-1">Inicie ou abra um chat para conversar</p>
          </div>
        </div>
      )}
    </div>
  );
}