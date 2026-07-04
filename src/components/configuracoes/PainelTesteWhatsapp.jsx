import { useState } from 'react';
import { Send, FlaskConical, CheckCircle2, AlertCircle, Loader2, Wand2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import {
  TEMPLATES_KANBAN, TEMPLATES_EXPEDICAO,
  renderMensagemKanban, renderMensagemExpedicao,
} from '@/lib/whatsappTemplates';

// Painel de teste de disparo WhatsApp
// Permite escolher um cenário (Kanban/Expedição + etapa + interno/cliente),
// ver preview renderizado com dados de exemplo, e disparar para um número de teste.
// Formata e valida o telefone no formato DD+9+número (ex: 55 61 9 9999-9999)
// DD = código do país (55 Brasil), DDD implícito, 9 obrigatório, 8 dígitos.
function formatarTelefoneWhatsApp(valor) {
  const digits = String(valor || '').replace(/\D/g, '').slice(0, 13);
  // Aplica máscara progressiva
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
  if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4)}`;
  if (digits.length <= 9) return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 5)} ${digits.slice(5)}`;
  return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 5)} ${digits.slice(5, 9)}-${digits.slice(9)}`;
}

function telefoneValido(valor) {
  const digits = String(valor || '').replace(/\D/g, '');
  // 13 dígitos: DD(2) + DDD(2) + 9 + 8 dígitos
  return digits.length === 13 && digits.startsWith('55') && digits[4] === '9';
}

export default function PainelTesteWhatsapp({ kanban, expedicao, onAplicarTemplate }) {
  const [modulo, setModulo] = useState('kanban'); // 'kanban' | 'expedicao'
  const [etapa, setEtapa] = useState('produzido');
  const [tipo, setTipo] = useState('interno'); // 'interno' | 'cliente'
  const [telefone, setTelefone] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null); // { ok, msg }

  const etapas = modulo === 'kanban'
    ? Object.keys(TEMPLATES_KANBAN)
    : Object.keys(TEMPLATES_EXPEDICAO);

  // Garante que etapa é válida para o módulo atual
  const etapaAtual = etapas.includes(etapa) ? etapa : etapas[0];

  // Template atual (do config salvo ou fallback para o template pronto)
  const templateAtual = modulo === 'kanban'
    ? (tipo === 'interno' ? (kanban.msg_interno || '') : (kanban.msg_cliente || ''))
    : (tipo === 'interno' ? (expedicao.msg_interno || '') : (expedicao.msg_cliente || ''));

  const templatePronto = modulo === 'kanban'
    ? TEMPLATES_KANBAN[etapaAtual]?.[tipo] || ''
    : TEMPLATES_EXPEDICAO[etapaAtual]?.[tipo] || '';

  const templatePreview = templateAtual || templatePronto;

  const preview = modulo === 'kanban'
    ? renderMensagemKanban(templatePreview, etapaAtual)
    : renderMensagemExpedicao(templatePreview, etapaAtual);

  const handleEnviarTeste = async () => {
    const tel = telefone.replace(/\D/g, '');
    if (!telefoneValido(telefone)) {
      setResultado({ ok: false, msg: 'Formato inválido. Use DD+9+número (ex: 55 61 9 9999-9999 — 13 dígitos).' });
      return;
    }
    setEnviando(true);
    setResultado(null);
    try {
      const res = await base44.functions.invoke('enviarWhatsappTeste', {
        telefone: tel,
        mensagem: preview,
      });
      if (res.data?.ok) {
        setResultado({ ok: true, msg: `Teste enviado com sucesso para ${tel}!` });
      } else {
        setResultado({ ok: false, msg: res.data?.error || 'Falha no envio.' });
      }
    } catch (e) {
      setResultado({ ok: false, msg: e.message || 'Erro ao chamar função de teste.' });
    } finally {
      setEnviando(false);
    }
  };

  const handleAplicarTemplate = () => {
    onAplicarTemplate(modulo, etapaAtual, tipo, templatePronto);
  };

  return (
    <div className="bg-card border-2 border-primary/20 rounded-2xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <FlaskConical size={16} className="text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-bold text-sm text-foreground">Teste de Disparo</p>
          <p className="text-xs text-muted-foreground">Envie uma mensagem de teste para validar os templates e a conexão com a API.</p>
        </div>
      </div>

      {/* Seletores de cenário */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Módulo</label>
          <div className="flex gap-1.5">
            <button onClick={() => { setModulo('kanban'); setEtapa('produzido'); }}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${modulo === 'kanban' ? 'bg-green-100 border-green-300 text-green-700' : 'bg-muted border-border text-muted-foreground'}`}>
              Kanban
            </button>
            <button onClick={() => { setModulo('expedicao'); setEtapa('nf_emitida'); }}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${modulo === 'expedicao' ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-muted border-border text-muted-foreground'}`}>
              Expedição
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Etapa</label>
          <select value={etapaAtual} onChange={e => setEtapa(e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary">
            {etapas.map(e => (
              <option key={e} value={e}>{e.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Destinatário</label>
          <div className="flex gap-1.5">
            <button onClick={() => setTipo('interno')}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${tipo === 'interno' ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-muted border-border text-muted-foreground'}`}>
              Interno
            </button>
            <button onClick={() => setTipo('cliente')}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${tipo === 'cliente' ? 'bg-purple-100 border-purple-300 text-purple-700' : 'bg-muted border-border text-muted-foreground'}`}>
              Cliente
            </button>
          </div>
        </div>
      </div>

      {/* Preview da mensagem */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Preview da mensagem (com dados de exemplo)</label>
          <button onClick={handleAplicarTemplate}
            disabled={!templatePronto}
            className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline disabled:opacity-40"
            title="Preenche o campo de mensagem com o template pronto desta situação">
            <Wand2 size={12} /> Aplicar template pronto
          </button>
        </div>
        <div className="bg-[#efe7dd] border border-border rounded-2xl p-4 min-h-[80px]">
          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{preview || '(sem conteúdo)'}</p>
        </div>
        {templateAtual && (
          <p className="text-[11px] text-muted-foreground mt-1">Usando mensagem personalizada salva. Clique em "Aplicar template pronto" para usar o sugerido.</p>
        )}
        {!templateAtual && templatePronto && (
          <p className="text-[11px] text-muted-foreground mt-1">Mostrando template pronto padrão (nenhuma mensagem personalizada salva para este campo).</p>
        )}
      </div>

      {/* Telefone + botão de teste */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
        <div className="flex-1">
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Número de teste (DD+9+número)</label>
          <input value={telefone} onChange={e => setTelefone(formatarTelefoneWhatsApp(e.target.value))}
            inputMode="numeric"
            placeholder="55 61 9 9999-9999"
            className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <button onClick={handleEnviarTeste} disabled={enviando}
          className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 shadow-sm whitespace-nowrap">
          {enviando ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          {enviando ? 'Enviando...' : 'Enviar Teste'}
        </button>
      </div>

      {/* Resultado */}
      {resultado && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm ${resultado.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {resultado.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span className="font-medium">{resultado.msg}</span>
        </div>
      )}
    </div>
  );
}