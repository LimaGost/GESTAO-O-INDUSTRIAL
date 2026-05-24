import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { MessageCircle, Send, CheckCircle, AlertTriangle, Lightbulb, Bug, Star, HelpCircle, Clock, RefreshCw } from 'lucide-react';

const TIPOS = [
  { key: 'suporte',  label: 'Suporte',   icon: HelpCircle,  color: 'text-red-500',    bg: 'bg-red-50 border-red-200',    activeBg: 'bg-red-500 border-red-500 text-white' },
  { key: 'bug',      label: 'Bug',        icon: Bug,         color: 'text-amber-500',  bg: 'bg-amber-50 border-amber-200', activeBg: 'bg-amber-500 border-amber-500 text-white' },
  { key: 'melhoria', label: 'Melhoria',  icon: Lightbulb,   color: 'text-blue-500',   bg: 'bg-blue-50 border-blue-200',   activeBg: 'bg-blue-500 border-blue-500 text-white' },
  { key: 'elogio',   label: 'Elogio',    icon: Star,        color: 'text-green-500',  bg: 'bg-green-50 border-green-200', activeBg: 'bg-green-500 border-green-500 text-white' },
  { key: 'outro',    label: 'Outro',     icon: MessageCircle, color: 'text-gray-500', bg: 'bg-gray-50 border-gray-200',   activeBg: 'bg-gray-500 border-gray-500 text-white' },
];

const PRIORIDADES = [
  { key: 'baixa',  label: '🟢 Baixa' },
  { key: 'media',  label: '🟡 Média' },
  { key: 'alta',   label: '🔴 Alta' },
];

const STATUS_CONFIG = {
  aberto:         { label: 'Aberto',         color: 'bg-red-100 text-red-700' },
  em_atendimento: { label: 'Em Atendimento', color: 'bg-blue-100 text-blue-700' },
  respondido:     { label: 'Respondido',     color: 'bg-green-100 text-green-700' },
  fechado:        { label: 'Fechado',        color: 'bg-gray-100 text-gray-600' },
};
const TIPO_EMOJIS = { suporte: '🆘', melhoria: '💡', bug: '🐛', elogio: '⭐', outro: '📌' };

export default function Suporte() {
  const [tipo, setTipo] = useState('suporte');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [prioridade, setPrioridade] = useState('media');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState(null);
  const [meusTickets, setMeusTickets] = useState([]);
  const [ticketExpandido, setTicketExpandido] = useState(null);

  useEffect(() => {
    carregarTickets();
  }, []);

  const carregarTickets = async () => {
    const user = await base44.auth.me().catch(() => null);
    if (!user) return;
    const todos = await base44.entities.TicketSuporte.list('-created_date');
    setMeusTickets(todos.filter(t => t.usuario_email === user.email));
  };

  const handleEnviar = async () => {
    if (!titulo.trim() || !descricao.trim()) {
      setErro('Preencha o título e a descrição.');
      return;
    }
    setErro(null);
    setEnviando(true);
    const res = await base44.functions.invoke('enviarDiscord', { tipo, titulo, descricao, prioridade });
    setEnviando(false);
    if (res.data?.ok) {
      setEnviado(true);
      setTitulo('');
      setDescricao('');
      setTipo('suporte');
      setPrioridade('media');
      setTimeout(() => setEnviado(false), 5000);
      carregarTickets();
    } else {
      setErro('Erro ao enviar. Tente novamente.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
          <MessageCircle size={19} className="text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Central de Suporte</h2>
          <p className="text-xs text-muted-foreground">Envie relatos, sugestões e pedidos de suporte direto para nossa equipe</p>
        </div>
      </div>

      {/* Sucesso */}
      {enviado && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl p-4 text-green-700">
          <CheckCircle size={20} className="flex-shrink-0" />
          <div>
            <p className="font-semibold text-sm">Mensagem enviada com sucesso!</p>
            <p className="text-xs text-green-600">Nossa equipe recebeu sua mensagem e irá responder em breve.</p>
          </div>
        </div>
      )}

      {/* Card do formulário */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-5">

        {/* Tipo */}
        <div>
          <label className="text-sm font-semibold text-foreground mb-3 block">Tipo de relato *</label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {TIPOS.map(t => {
              const Icon = t.icon;
              const ativo = tipo === t.key;
              return (
                <button key={t.key} onClick={() => setTipo(t.key)}
                  className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-xs font-semibold transition-all ${ativo ? t.activeBg : `${t.bg} ${t.color} hover:opacity-80`}`}>
                  <Icon size={18} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Prioridade */}
        <div>
          <label className="text-sm font-semibold text-foreground mb-2 block">Prioridade</label>
          <div className="flex gap-2 flex-wrap">
            {PRIORIDADES.map(p => (
              <button key={p.key} onClick={() => setPrioridade(p.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${prioridade === p.key ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-transparent hover:border-border'}`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Título */}
        <div>
          <label className="text-sm font-semibold text-foreground mb-1.5 block">Título *</label>
          <input
            value={titulo}
            onChange={e => setTitulo(e.target.value)}
            placeholder="Resumo do seu relato..."
            className="w-full border border-border rounded-xl px-4 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Descrição */}
        <div>
          <label className="text-sm font-semibold text-foreground mb-1.5 block">Descrição *</label>
          <textarea
            value={descricao}
            onChange={e => setDescricao(e.target.value)}
            placeholder="Descreva detalhadamente o que aconteceu, o que gostaria de melhorar, ou sua dúvida..."
            rows={5}
            className="w-full border border-border rounded-xl px-4 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>

        {/* Erro */}
        {erro && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
            <AlertTriangle size={15} /> {erro}
          </div>
        )}

        {/* Botão enviar */}
        <button
          onClick={handleEnviar}
          disabled={enviando}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
          <Send size={16} />
          {enviando ? 'Enviando...' : 'Enviar para equipe'}
        </button>
      </div>

      {/* Meus tickets */}
      {meusTickets.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-foreground text-sm">Meus Tickets</h3>
            <button onClick={carregarTickets} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
              <RefreshCw size={13} className="text-muted-foreground" />
            </button>
          </div>
          <div className="space-y-2">
            {meusTickets.map(t => {
              const st = STATUS_CONFIG[t.status] || STATUS_CONFIG.aberto;
              const aberto = ticketExpandido === t.id;
              return (
                <div key={t.id} className="border border-border rounded-xl overflow-hidden">
                  <button
                    onClick={() => setTicketExpandido(aberto ? null : t.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left">
                    <span className="text-base">{TIPO_EMOJIS[t.tipo] || '📌'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{t.titulo}</p>
                      <p className="text-xs text-muted-foreground">{new Date(t.created_date).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${st.color}`}>{st.label}</span>
                  </button>
                  {aberto && (
                    <div className="px-4 pb-4 space-y-3 border-t border-border/50">
                      <div className="bg-muted/40 rounded-lg p-3 mt-3">
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Sua mensagem</p>
                        <p className="text-sm text-foreground whitespace-pre-wrap">{t.descricao}</p>
                      </div>
                      {t.resposta ? (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <p className="text-xs font-semibold text-green-700 mb-1">Resposta — {t.respondido_por}</p>
                          <p className="text-sm text-foreground whitespace-pre-wrap">{t.resposta}</p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                          <Clock size={12} /> Aguardando resposta da equipe...
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="bg-muted/40 border border-border rounded-2xl p-4 text-xs text-muted-foreground space-y-1">
        <p className="font-semibold text-foreground text-sm">ℹ️ Como funciona?</p>
        <p>Sua mensagem é enviada para a equipe e um ticket é gerado no sistema.</p>
        <p>Acompanhe as respostas diretamente nesta página.</p>
      </div>
    </div>
  );
}