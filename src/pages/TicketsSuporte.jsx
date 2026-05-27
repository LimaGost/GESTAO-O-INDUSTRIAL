import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { MessageSquare, CheckCircle, Send, X, RefreshCw, Clock, User, Circle } from 'lucide-react';

const STATUS_CONFIG = {
  aberto:         { label: 'Aberto',          color: 'bg-red-100 text-red-700',    dot: 'bg-red-500' },
  em_atendimento: { label: 'Em Atendimento',  color: 'bg-blue-100 text-blue-700',  dot: 'bg-blue-500' },
  respondido:     { label: 'Respondido',      color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  fechado:        { label: 'Fechado',         color: 'bg-gray-100 text-gray-600',  dot: 'bg-gray-400' },
};

const TIPO_EMOJIS = { suporte: '🆘', melhoria: '💡', bug: '🐛', elogio: '⭐', outro: '📌' };
const PRIORIDADE = { alta: '🔴 Alta', media: '🟡 Média', baixa: '🟢 Baixa' };

export default function TicketsSuporte() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ticketAberto, setTicketAberto] = useState(null);
  const [resposta, setResposta] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [user, setUser] = useState(null);
  const [buscandoDiscord, setBuscandoDiscord] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.TicketSuporte.list('-created_date');
    setTickets(data);
    setLoading(false);
  };

  const abrirTicket = (ticket) => {
    setTicketAberto(ticket);
    setResposta(ticket.resposta || '');
  };

  const criarNotificacaoTicket = async (ticket, titulo, descricao) => {
    const destinatario = ticket.created_by_id;
    if (!destinatario) return;
    await base44.entities.Notificacao.create({
      titulo,
      descricao,
      tipo: 'suporte',
      lida: false,
      link: '/Suporte',
      usuario_id: destinatario,
    });
  };

  const enviarResposta = async () => {
    if (!resposta.trim()) return;
    setSalvando(true);
    await base44.functions.invoke('responderTicketDiscord', {
      ticket_id: ticketAberto.id,
      resposta,
    });
    await criarNotificacaoTicket(
      ticketAberto,
      `Seu ticket foi respondido: ${ticketAberto.titulo}`,
      resposta.slice(0, 120)
    );
    await load();
    setTicketAberto(null);
    setResposta('');
    setSalvando(false);
  };

  const buscarDoDiscord = async () => {
    if (!ticketAberto?.discord_thread_id) return;
    setBuscandoDiscord(true);
    await base44.functions.invoke('verificarRespostasDiscord', {});
    const data = await base44.entities.TicketSuporte.list('-created_date');
    setTickets(data);
    const atualizado = data.find(t => t.id === ticketAberto.id);
    if (atualizado) {
      setTicketAberto(atualizado);
      setResposta(atualizado.resposta || '');
    }
    setBuscandoDiscord(false);
  };

  const mudarStatus = async (id, novoStatus) => {
    await base44.entities.TicketSuporte.update(id, { status: novoStatus });
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status: novoStatus } : t));
    if (ticketAberto?.id === id) setTicketAberto(prev => ({ ...prev, status: novoStatus }));
    const STATUS_MSG = {
      em_atendimento: 'Seu ticket está sendo atendido',
      respondido: 'Seu ticket foi respondido',
      fechado: 'Seu ticket foi encerrado',
    };
    if (STATUS_MSG[novoStatus] && ticketAberto?.created_by_id) {
      await base44.entities.Notificacao.create({
        titulo: `${STATUS_MSG[novoStatus]}: ${ticketAberto.titulo}`,
        descricao: ticketAberto.resposta ? ticketAberto.resposta.slice(0, 120) : `Status atualizado para: ${STATUS_CONFIG[novoStatus]?.label}`,
        tipo: 'suporte',
        lida: false,
        link: '/Suporte',
        usuario_id: ticketAberto.created_by_id,
      });
    }
  };

  const ticketsFiltrados = filtroStatus === 'todos'
    ? tickets
    : tickets.filter(t => t.status === filtroStatus);

  const abertos = tickets.filter(t => t.status === 'aberto').length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <MessageSquare size={19} className="text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Tickets de Suporte</h2>
            <p className="text-xs text-muted-foreground">{abertos} ticket(s) aberto(s) aguardando resposta</p>
          </div>
        </div>
        <button onClick={load} className="p-2 border border-border rounded-xl hover:bg-muted transition-colors">
          <RefreshCw size={15} className="text-muted-foreground" />
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {[{ k: 'todos', l: 'Todos' }, { k: 'aberto', l: 'Abertos' }, { k: 'em_atendimento', l: 'Em Atendimento' }, { k: 'respondido', l: 'Respondidos' }, { k: 'fechado', l: 'Fechados' }].map(f => (
          <button key={f.k} onClick={() => setFiltroStatus(f.k)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${filtroStatus === f.k ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground hover:bg-muted'}`}>
            {f.l} {f.k !== 'todos' && <span className="ml-1 opacity-70">{tickets.filter(t => t.status === f.k).length}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-20 animate-pulse bg-muted rounded-2xl" />)}</div>
      ) : ticketsFiltrados.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <MessageSquare size={32} className="mx-auto mb-2 opacity-20" />
          <p className="text-sm">Nenhum ticket encontrado.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {ticketsFiltrados.map(t => {
            const st = STATUS_CONFIG[t.status] || STATUS_CONFIG.aberto;
            return (
              <div key={t.id}
                className="bg-card border border-border rounded-2xl p-4 hover:shadow-md transition-all cursor-pointer"
                onClick={() => abrirTicket(t)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span className="text-xl flex-shrink-0">{TIPO_EMOJIS[t.tipo] || '📌'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-semibold text-foreground text-sm truncate">{t.titulo}</p>
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold ${st.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} /> {st.label}
                        </span>
                        <span className="text-xs text-muted-foreground">{PRIORIDADE[t.prioridade]}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{t.descricao}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t.usuario_nome || t.usuario_email} · {new Date(t.created_date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  {t.resposta && <CheckCircle size={16} className="text-green-500 flex-shrink-0 mt-1" />}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal ticket */}
      {ticketAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xl">{TIPO_EMOJIS[ticketAberto.tipo] || '📌'}</span>
                <div className="min-w-0">
                  <p className="font-bold text-foreground text-sm truncate">{ticketAberto.titulo}</p>
                  <p className="text-xs text-muted-foreground">{ticketAberto.usuario_nome} · {PRIORIDADE[ticketAberto.prioridade]}</p>
                </div>
              </div>
              <button onClick={() => setTicketAberto(null)} className="p-1.5 hover:bg-muted rounded-lg flex-shrink-0">
                <X size={16} className="text-muted-foreground" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Mensagem original */}
              <div className="bg-muted/40 rounded-xl p-4">
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Mensagem do usuário</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{ticketAberto.descricao}</p>
              </div>

              {/* Histórico de ações */}
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-muted/30 border-b border-border flex items-center justify-between">
                 <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Histórico</p>
                 {ticketAberto.discord_thread_id && (
                   <button onClick={buscarDoDiscord} disabled={buscandoDiscord}
                     className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:bg-primary/10 px-2 py-1 rounded-lg transition-colors disabled:opacity-50">
                     <RefreshCw size={11} className={buscandoDiscord ? 'animate-spin' : ''} />
                     {buscandoDiscord ? 'Buscando...' : 'Buscar do Discord'}
                   </button>
                 )}
                </div>
                <div className="divide-y divide-border/40">
                  {/* Criação */}
                  <div className="flex items-start gap-3 px-4 py-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Circle size={8} className="text-blue-500 fill-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground">Ticket aberto por {ticketAberto.usuario_nome || ticketAberto.usuario_email}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {new Date(ticketAberto.created_date).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  {/* Resposta */}
                  {ticketAberto.resposta && (
                    <div className="flex items-start gap-3 px-4 py-3 bg-green-50/50">
                      <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CheckCircle size={12} className="text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground">Respondido por <span className="text-green-700">{ticketAberto.respondido_por}</span></p>
                        {ticketAberto.data_resposta && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {new Date(ticketAberto.data_resposta).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                        <p className="text-xs text-foreground mt-2 bg-white border border-green-200 rounded-lg px-3 py-2 whitespace-pre-wrap">{ticketAberto.resposta}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Campo de resposta */}
              {ticketAberto.status !== 'fechado' && (
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">
                    {ticketAberto.resposta ? 'Editar resposta' : 'Sua resposta'}
                  </label>
                  <textarea
                    value={resposta}
                    onChange={e => setResposta(e.target.value)}
                    placeholder="Digite sua resposta para o usuário..."
                    rows={4}
                    className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                </div>
              )}

              {/* Status */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">Mudar status</p>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <button key={k} onClick={() => mudarStatus(ticketAberto.id, k)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${ticketAberto.status === k ? v.color + ' ring-1 ring-current' : 'bg-muted text-muted-foreground hover:bg-border'}`}>
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {ticketAberto.status !== 'fechado' && (
              <div className="px-5 py-4 border-t border-border flex gap-3 flex-shrink-0">
                <button onClick={enviarResposta} disabled={salvando || !resposta.trim()}
                  className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity">
                  <Send size={14} /> {salvando ? 'Salvando...' : 'Salvar Resposta'}
                </button>
                <button onClick={() => setTicketAberto(null)}
                  className="px-4 border border-border rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors">
                  Fechar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}