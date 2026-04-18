import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Truck, Send, MessageSquare, Bot, User, Loader2, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const AGENT_NAME = 'expedicao_agent';

export default function RastreamentoCliente() {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => {
    initConversation();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initConversation = async () => {
    setLoading(true);
    const conv = await base44.agents.createConversation({
      agent_name: AGENT_NAME,
      metadata: { name: 'Rastreamento de Entrega' },
    });
    setConversation(conv);
    setMessages(conv.messages || []);
    setLoading(false);

    const unsub = base44.agents.subscribeToConversation(conv.id, (data) => {
      setMessages(data.messages || []);
    });

    return unsub;
  };

  const sendMessage = async () => {
    if (!input.trim() || !conversation || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);
    await base44.agents.addMessage(conversation, { role: 'user', content: text });
    setSending(false);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const isTyping = messages.length > 0 &&
    messages[messages.length - 1]?.role === 'user' && sending === false &&
    !messages.find((m, i) => i === messages.length - 1 && m.role === 'assistant');

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-card border border-border rounded-2xl px-5 py-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 flex items-center justify-center">
              <Truck size={19} className="text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Assistente de Entregas</h2>
              <p className="text-xs text-muted-foreground">Rastreie pedidos e acompanhe entregas via chat</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* WhatsApp link */}
            <a
              href={base44.agents.getWhatsAppConnectURL(AGENT_NAME)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-green-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-green-600 transition-colors shadow-sm"
            >
              💬 WhatsApp
            </a>
            <button
              onClick={() => { setConversation(null); setMessages([]); initConversation(); }}
              className="p-2.5 border border-border rounded-xl hover:bg-muted transition-colors"
              title="Nova conversa"
            >
              <RefreshCw size={15} className="text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>

      {/* Chat window */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col" style={{ height: '65vh' }}>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <Loader2 size={24} className="animate-spin" />
                <p className="text-sm">Iniciando assistente...</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
              <div className="w-16 h-16 rounded-2xl bg-purple-100 flex items-center justify-center">
                <Bot size={28} className="text-purple-600" />
              </div>
              <div>
                <p className="font-bold text-foreground">Assistente de Entregas</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Olá! Posso rastrear pedidos e expedições para seus clientes.<br />
                  Digite o nome do cliente ou número do pedido para começar.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {[
                  'Qual o status do pedido do cliente João?',
                  'Quais expedições estão em trânsito?',
                  'Pedidos entregues esta semana',
                ].map(s => (
                  <button key={s} onClick={() => setInput(s)}
                    className="text-xs bg-muted px-3 py-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors text-left">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, i) => {
              const isUser = msg.role === 'user';
              return (
                <div key={i} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                  {!isUser && (
                    <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Bot size={14} className="text-purple-600" />
                    </div>
                  )}
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${isUser ? 'bg-primary text-primary-foreground' : 'bg-muted/50 border border-border text-foreground'}`}>
                    {isUser ? (
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                    ) : (
                      <ReactMarkdown className="text-sm prose prose-sm prose-slate max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                        {msg.content}
                      </ReactMarkdown>
                    )}
                    {/* Tool calls */}
                    {msg.tool_calls?.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {msg.tool_calls.map((tc, j) => (
                          <div key={j} className="text-xs bg-muted/50 rounded-lg px-2 py-1 flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                            <span className="text-muted-foreground">Consultando dados...</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {isUser && (
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <User size={14} className="text-primary" />
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Typing indicator */}
          {sending && (
            <div className="flex gap-3 justify-start">
              <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                <Bot size={14} className="text-purple-600" />
              </div>
              <div className="bg-muted/50 border border-border rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-border p-4 flex-shrink-0">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Digite o nome do cliente, número do pedido ou NF..."
              rows={1}
              className="flex-1 border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none placeholder:text-muted-foreground"
              style={{ minHeight: 42, maxHeight: 120 }}
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || sending || loading}
              className="flex items-center justify-center w-11 h-11 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40 flex-shrink-0"
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Enter para enviar · Shift+Enter para nova linha · Disponível também via{' '}
            <a href={base44.agents.getWhatsAppConnectURL(AGENT_NAME)} target="_blank" rel="noopener noreferrer"
              className="text-green-600 hover:underline font-medium">WhatsApp</a>
          </p>
        </div>
      </div>
    </div>
  );
}