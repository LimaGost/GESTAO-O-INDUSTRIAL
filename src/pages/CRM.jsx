import { useEffect, useState, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import {
  MessageCircle, Search, X, Send, Phone, User, RefreshCw,
  ChevronLeft, AlertCircle, Loader2, CheckCheck, Plus, UserPlus
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

// ── Painel de chat ────────────────────────────────────────────────────────────
function ChatPanel({ contato, chatId, onClose }) {
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
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card flex-shrink-0">
        <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg md:hidden">
          <ChevronLeft size={16} className="text-muted-foreground" />
        </button>
        <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center font-bold text-green-700 text-sm flex-shrink-0 overflow-hidden">
          {contato.photo
            ? <img src={contato.photo} alt={contato.name} className="w-full h-full object-cover" />
            : (contato.name || 'C').charAt(0).toUpperCase()
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-foreground truncate">{contato.name}</p>
          <p className="text-xs text-muted-foreground">{contato.telephone || 'sem telefone'}</p>
        </div>
        <button onClick={carregarMensagens} className="p-1.5 hover:bg-muted rounded-lg">
          <RefreshCw size={14} className="text-muted-foreground" />
        </button>
      </div>

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
                <div className={`max-w-[75%] px-3 py-2 rounded-2xl shadow-sm text-sm leading-relaxed ${
                  deSistema ? 'bg-green-100 text-green-900 rounded-br-sm' : 'bg-white text-foreground rounded-bl-sm'
                }`}>
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

// ── Card de contato ───────────────────────────────────────────────────────────
function ContatoCard({ contato, chatAtivo, onIniciarChat, onAbrirChat, iniciando }) {
  const temTelefone = !!contato.telephone;
  const temChat = !!chatAtivo;

  return (
    <div className={`bg-card border rounded-2xl p-4 transition-all hover:shadow-md ${temChat ? 'border-green-200' : 'border-border'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary flex-shrink-0 overflow-hidden">
            {contato.photo
              ? <img src={contato.photo} alt={contato.name} className="w-full h-full object-cover rounded-full" />
              : (contato.name || 'C').charAt(0).toUpperCase()
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-foreground truncate">{contato.name}</p>
            {contato.telephone && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Phone size={10} /> {contato.telephone}
              </p>
            )}
            {contato.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {contato.tags.slice(0, 3).map((tag, i) => (
                  <span key={i} className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">{tag}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 flex-shrink-0">
          {temChat ? (
            <button
              onClick={() => onAbrirChat(contato, chatAtivo)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-green-500 text-white hover:bg-green-600 transition-colors"
            >
              <MessageCircle size={13} /> Abrir Chat
            </button>
          ) : temTelefone ? (
            <button
              onClick={() => onIniciarChat(contato)}
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

// ── Modal iniciar chat ────────────────────────────────────────────────────────
function ModalIniciarChat({ contato, onConfirmar, onClose, iniciando }) {
  const [departmentId, setDepartmentId] = useState(() => localStorage.getItem('crm_department_id') || '');
  const [attendantId, setAttendantId] = useState(() => localStorage.getItem('crm_attendant_id') || '');

  const handleConfirmar = () => {
    if (!departmentId.trim()) return alert('Informe o ID do departamento.');
    if (!attendantId.trim()) return alert('Informe o ID do atendente.');
    localStorage.setItem('crm_department_id', departmentId.trim());
    localStorage.setItem('crm_attendant_id', attendantId.trim());
    onConfirmar({ departmentId: departmentId.trim(), attendantId: attendantId.trim() });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center font-bold text-green-700 flex-shrink-0 overflow-hidden">
            {contato.photo
              ? <img src={contato.photo} alt={contato.name} className="w-full h-full object-cover rounded-full" />
              : (contato.name || 'C').charAt(0).toUpperCase()
            }
          </div>
          <div>
            <p className="font-bold text-foreground">{contato.name}</p>
            <p className="text-xs text-muted-foreground">{contato.telephone}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">ID do Departamento *</label>
            <input
              value={departmentId}
              onChange={e => setDepartmentId(e.target.value)}
              placeholder="uuid do departamento"
              className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-mono"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">ID do Atendente *</label>
            <input
              value={attendantId}
              onChange={e => setAttendantId(e.target.value)}
              placeholder="uuid do atendente"
              className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-mono"
            />
            <p className="text-[11px] text-muted-foreground mt-1">Encontre o UUID do atendente no SM Click → Equipe. Os valores são salvos automaticamente.</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleConfirmar}
            disabled={iniciando || !departmentId.trim() || !attendantId.trim()}
            className="flex-1 flex items-center justify-center gap-2 bg-green-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-green-600 disabled:opacity-50 transition-colors"
          >
            {iniciando ? <Loader2 size={15} className="animate-spin" /> : <MessageCircle size={15} />}
            {iniciando ? 'Iniciando...' : 'Iniciar Chat'}
          </button>
          <button onClick={onClose} className="px-4 border border-border rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal novo contato ────────────────────────────────────────────────────────
function ModalNovoContato({ onCriar, onClose, criando }) {
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');

  const handleCriar = () => {
    if (!nome.trim()) return alert('Nome obrigatório.');
    if (!telefone.trim()) return alert('Telefone obrigatório.');
    onCriar({ name: nome.trim(), telephone: fmtTelefone(telefone) });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <UserPlus size={16} className="text-primary" />
          </div>
          <p className="font-bold text-foreground">Novo Contato</p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Nome *</label>
            <input
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Nome do contato"
              className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Telefone * (com DDI)</label>
            <input
              value={telefone}
              onChange={e => setTelefone(e.target.value)}
              placeholder="5511999999999"
              className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-[11px] text-muted-foreground mt-1">Formato: código do país + DDD + número (ex: 5511999999999)</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleCriar}
            disabled={criando || !nome.trim() || !telefone.trim()}
            className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-colors"
          >
            {criando ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            {criando ? 'Criando...' : 'Criar Contato'}
          </button>
          <button onClick={onClose} className="px-4 border border-border rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Página principal CRM ──────────────────────────────────────────────────────
export default function CRM() {
  const [contatos, setContatos] = useState([]);
  const [busca, setBusca] = useState('');
  const [buscaInput, setBuscaInput] = useState('');
  const [chatsAtivos, setChatsAtivos] = useState({});
  const [iniciandoId, setIniciandoId] = useState(null);
  const [chatAberto, setChatAberto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalContato, setModalContato] = useState(null);
  const [showNovoContato, setShowNovoContato] = useState(false);
  const [criandoContato, setCriandoContato] = useState(false);
  const [totalContatos, setTotalContatos] = useState(0);
  const buscaTimeout = useRef(null);

  const carregarContatos = useCallback(async (buscaTermo = '') => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('smClickListarContatos', { busca: buscaTermo, page: 1 });
      setContatos(res.data?.contatos || []);
      setTotalContatos(res.data?.total || 0);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    carregarContatos();
    try {
      const saved = JSON.parse(localStorage.getItem('crm_chats_ativos') || '{}');
      setChatsAtivos(saved);
    } catch {}
  }, []);

  // Debounce da busca
  useEffect(() => {
    clearTimeout(buscaTimeout.current);
    buscaTimeout.current = setTimeout(() => {
      setBusca(buscaInput);
      carregarContatos(buscaInput);
    }, 500);
    return () => clearTimeout(buscaTimeout.current);
  }, [buscaInput]);

  const salvarChats = (novos) => {
    setChatsAtivos(novos);
    localStorage.setItem('crm_chats_ativos', JSON.stringify(novos));
  };

  const iniciarChat = (contato) => setModalContato(contato);

  const confirmarIniciarChat = async ({ departmentId, attendantId }) => {
    const contato = modalContato;
    const tel = fmtTelefone(contato.telephone);
    setIniciandoId(contato.id);

    try {
      // 1. Cria/reutiliza o chat
      const res = await base44.functions.invoke('smClickCriarChat', {
        telefone: tel,
        nomeCliente: contato.name,
        department: departmentId,
      });

      if (!res.data?.chat_id) {
        alert('Erro ao criar chat: ' + (res.data?.erro || JSON.stringify(res.data)));
        setIniciandoId(null);
        setModalContato(null);
        return;
      }

      const chatId = res.data.chat_id;

      // 2. Inicia o atendimento (start) vinculando atendente
      try {
        await base44.functions.invoke('smClickIniciarAtendimento', {
          chatId,
          attendantId,
          departmentId,
        });
      } catch {
        // start pode falhar se já estiver active — não bloqueia
      }

      // 3. Salva e abre o chat
      const novos = { ...chatsAtivos, [contato.id]: { chat_id: chatId } };
      salvarChats(novos);
      setModalContato(null);
      setChatAberto({ contato, chat_id: chatId });
    } catch (e) {
      alert('Erro ao iniciar chat: ' + e.message);
    }

    setIniciandoId(null);
  };

  const criarContato = async ({ name, telephone }) => {
    setCriandoContato(true);
    try {
      const res = await base44.functions.invoke('smClickCriarContato', { name, telephone });
      if (res.data?.ok) {
        setShowNovoContato(false);
        await carregarContatos(buscaInput);
      } else {
        alert('Erro ao criar contato: ' + (res.data?.error || 'Erro desconhecido'));
      }
    } catch (e) {
      alert('Erro: ' + e.message);
    }
    setCriandoContato(false);
  };

  return (
    <div className="flex h-full gap-4" style={{ minHeight: 'calc(100vh - 140px)' }}>
      {modalContato && (
        <ModalIniciarChat
          contato={modalContato}
          iniciando={iniciandoId === modalContato.id}
          onConfirmar={confirmarIniciarChat}
          onClose={() => setModalContato(null)}
        />
      )}
      {showNovoContato && (
        <ModalNovoContato
          criando={criandoContato}
          onCriar={criarContato}
          onClose={() => setShowNovoContato(false)}
        />
      )}

      {/* Lista de contatos */}
      <div className={`flex flex-col ${chatAberto ? 'hidden md:flex md:w-80 flex-shrink-0' : 'flex-1'}`}>
        {/* Header */}
        <div className="bg-card border border-border rounded-2xl px-4 py-4 mb-4 flex-shrink-0">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-green-100 flex items-center justify-center">
              <MessageCircle size={19} className="text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-foreground">CRM WhatsApp</h2>
              <p className="text-xs text-muted-foreground">
                {totalContatos.toLocaleString('pt-BR')} contato(s) · {Object.keys(chatsAtivos).length} chat(s) ativo(s)
              </p>
            </div>
            <button
              onClick={() => setShowNovoContato(true)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity flex-shrink-0"
            >
              <UserPlus size={13} /> Novo
            </button>
          </div>
          <div className="flex items-center gap-2 bg-muted/40 border border-border rounded-xl px-3 py-2">
            <Search size={14} className="text-muted-foreground flex-shrink-0" />
            <input
              value={buscaInput}
              onChange={e => setBuscaInput(e.target.value)}
              placeholder="Buscar contato..."
              className="bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground w-full"
            />
            {buscaInput && (
              <button onClick={() => setBuscaInput('')} className="text-muted-foreground hover:text-foreground">
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
          ) : contatos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <User size={40} className="opacity-20 mb-2" />
              <p className="text-sm">Nenhum contato encontrado</p>
            </div>
          ) : (
            contatos.map(contato => (
              <ContatoCard
                key={contato.id}
                contato={contato}
                chatAtivo={chatsAtivos[contato.id]}
                iniciando={iniciandoId === contato.id}
                onIniciarChat={iniciarChat}
                onAbrirChat={(c, chat) => setChatAberto({ contato: c, chat_id: chat.chat_id })}
              />
            ))
          )}
        </div>
      </div>

      {/* Painel de chat */}
      {chatAberto ? (
        <div className="flex-1 bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
          <ChatPanel
            contato={chatAberto.contato}
            chatId={chatAberto.chat_id}
            onClose={() => setChatAberto(null)}
          />
        </div>
      ) : (
        <div className="hidden md:flex flex-1 bg-card border border-border rounded-2xl items-center justify-center">
          <div className="text-center text-muted-foreground">
            <MessageCircle size={56} className="mx-auto mb-4 opacity-20" />
            <p className="font-semibold">Selecione um contato</p>
            <p className="text-sm mt-1">Inicie ou abra um chat para conversar</p>
          </div>
        </div>
      )}
    </div>
  );
}