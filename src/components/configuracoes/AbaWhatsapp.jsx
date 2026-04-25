import { useState } from 'react';
import { Save, Check, MessageCircle, Phone, Bell, AlertCircle, Info, Plus, Trash2, UserCheck, Factory, Truck, ChevronDown } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const STORAGE_KEY = 'whatsapp_kanban_config';
const STORAGE_KEY_EXP = 'whatsapp_expedicao_config';

// ── Etapas disponíveis ──────────────────────────────────────────────────────
const ETAPAS_KANBAN = [
  { key: 'em_producao',  label: 'Em Produção',  emoji: '🏭' },
  { key: 'produzido',    label: 'Produzido',    emoji: '✅' },
  { key: 'em_embalagem', label: 'Em Embalagem', emoji: '📦' },
  { key: 'em_separacao', label: 'Em Separação', emoji: '🔀' },
  { key: 'finalizado',   label: 'Finalizado',   emoji: '🎉' },
];

const ETAPAS_EXPEDICAO = [
  { key: 'nf_emitida', label: 'NF Emitida',   emoji: '📄' },
  { key: 'enviada',    label: 'Em Trânsito',  emoji: '🚚' },
  { key: 'entregue',   label: 'Entregue',     emoji: '✅' },
];

const VARIAVEIS_KANBAN = [
  { var: '{op}',       desc: 'Número da OP' },
  { var: '{produto}',  desc: 'Nome do produto' },
  { var: '{etapa}',    desc: 'Nome da etapa' },
  { var: '{cliente}',  desc: 'Nome do cliente' },
  { var: '{qtd}',      desc: 'Quantidade' },
];

const VARIAVEIS_EXP = [
  { var: '{nf}',       desc: 'Número da NF' },
  { var: '{cliente}',  desc: 'Nome do cliente' },
  { var: '{etapa}',    desc: 'Nome da etapa' },
  { var: '{pedido}',   desc: 'Número do pedido' },
];

// ── Defaults ────────────────────────────────────────────────────────────────
const DEFAULT_KANBAN_MSG_INTERNO = `📋 *Atualização de Produção*\n\nOP: *{op}*\nProduto: {produto}\nEtapa: *{etapa}*\nCliente: {cliente}\nQuantidade: {qtd}`;
const DEFAULT_KANBAN_MSG_CLIENTE = `Olá! Seu pedido está sendo processado.\n\nProduto: *{produto}*\nStatus atual: *{etapa}*\n\nObrigado pela preferência! 🙏`;
const DEFAULT_EXP_MSG_INTERNO = `🚚 *Atualização de Expedição*\n\nNF: *{nf}*\nCliente: {cliente}\nPedido: #{pedido}\nStatus: *{etapa}*`;
const DEFAULT_EXP_MSG_CLIENTE = `Olá, {cliente}! Atualização sobre seu pedido #{pedido}.\n\nStatus: *{etapa}*\n\nObrigado pela preferência! 🙏`;

// ── Getters públicos ─────────────────────────────────────────────────────────
export function getWhatsappKanbanConfig() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (saved) return saved;
  } catch {}
  return {
    etapas_notificar: ['produzido', 'finalizado'],
    notificar_cliente: true,
    numeros_internos: [],
    msg_interno: DEFAULT_KANBAN_MSG_INTERNO,
    msg_cliente: DEFAULT_KANBAN_MSG_CLIENTE,
  };
}

export function getWhatsappExpedicaoConfig() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_EXP) || 'null');
    if (saved) return saved;
  } catch {}
  return {
    etapas_notificar: ['enviada', 'entregue'],
    notificar_cliente: true,
    msg_interno: DEFAULT_EXP_MSG_INTERNO,
    msg_cliente: DEFAULT_EXP_MSG_CLIENTE,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function previewKanban(template, etapaKey) {
  const etapa = ETAPAS_KANBAN.find(e => e.key === etapaKey);
  return template
    .replace(/{op}/g, 'OP-0042').replace(/{produto}/g, 'Vela Âmbar')
    .replace(/{etapa}/g, etapa ? `${etapa.emoji} ${etapa.label}` : etapaKey)
    .replace(/{cliente}/g, 'João Silva').replace(/{qtd}/g, '24');
}

function previewExp(template, etapaKey) {
  const etapa = ETAPAS_EXPEDICAO.find(e => e.key === etapaKey);
  return template
    .replace(/{nf}/g, 'NF-00123').replace(/{cliente}/g, 'João Silva')
    .replace(/{pedido}/g, 'PED-0042')
    .replace(/{etapa}/g, etapa ? `${etapa.emoji} ${etapa.label}` : etapaKey);
}

// ── Sub-componente: Seção colapsável ─────────────────────────────────────────
function Secao({ icon: Icon, iconBg, iconColor, title, subtitle, open, onToggle, children }) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-3 px-5 py-4 text-left transition-colors ${open ? 'bg-muted/20' : 'hover:bg-muted/10'}`}
      >
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          <Icon size={16} className={iconColor} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
        </div>
        <ChevronDown size={15} className={`text-muted-foreground transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="border-t border-border px-5 pb-5 pt-4 space-y-4">{children}</div>}
    </div>
  );
}

// ── Sub-componente: Lista de etapas ──────────────────────────────────────────
function EtapasToggle({ etapas, ativas, onToggle }) {
  return (
    <div className="space-y-2">
      {etapas.map(etapa => {
        const ativo = ativas.includes(etapa.key);
        return (
          <button key={etapa.key} onClick={() => onToggle(etapa.key)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${ativo ? 'border-green-300 bg-green-50' : 'border-border bg-background hover:bg-muted/30'}`}>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${ativo ? 'bg-green-500 border-green-500' : 'border-muted-foreground/40'}`}>
              {ativo && <Check size={11} className="text-white" />}
            </div>
            <span className="text-lg">{etapa.emoji}</span>
            <p className={`text-sm font-semibold flex-1 ${ativo ? 'text-green-700' : 'text-foreground'}`}>{etapa.label}</p>
            {ativo && <span className="text-[10px] font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">ATIVO</span>}
          </button>
        );
      })}
    </div>
  );
}

// ── Sub-componente: Editor de mensagem ───────────────────────────────────────
function MsgEditor({ variaveis, msgInterno, msgCliente, defaultInterno, defaultCliente, onChange, previewFn, etapaPreview }) {
  const [aba, setAba] = useState('interno');
  return (
    <div>
      <div className="flex gap-1 bg-muted p-1 rounded-xl mb-4 w-fit">
        {[{ key: 'interno', label: '🏢 Número Interno' }, { key: 'cliente', label: '👤 Cliente' }].map(tab => (
          <button key={tab.key} onClick={() => setAba(tab.key)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${aba === tab.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex items-start gap-2 bg-sky-50 border border-sky-200 rounded-xl px-3 py-2.5 mb-3">
        <Info size={13} className="text-sky-500 flex-shrink-0 mt-0.5" />
        <div className="flex flex-wrap gap-1.5">
          {variaveis.map(v => (
            <span key={v.var} className="text-[10px] font-mono bg-white border border-sky-200 text-sky-700 px-1.5 py-0.5 rounded" title={v.desc}>{v.var}</span>
          ))}
        </div>
      </div>
      {aba === 'interno' && (
        <div className="space-y-3">
          <textarea rows={5} value={msgInterno ?? defaultInterno}
            onChange={e => onChange('msg_interno', e.target.value)}
            className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
          <pre className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-xs text-green-900 whitespace-pre-wrap font-sans">
            {previewFn(msgInterno ?? defaultInterno, etapaPreview)}
          </pre>
          <button onClick={() => onChange('msg_interno', defaultInterno)} className="text-xs text-muted-foreground hover:text-foreground underline">Restaurar padrão</button>
        </div>
      )}
      {aba === 'cliente' && (
        <div className="space-y-3">
          <textarea rows={5} value={msgCliente ?? defaultCliente}
            onChange={e => onChange('msg_cliente', e.target.value)}
            className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
          <pre className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-xs text-green-900 whitespace-pre-wrap font-sans">
            {previewFn(msgCliente ?? defaultCliente, etapaPreview)}
          </pre>
          <button onClick={() => onChange('msg_cliente', defaultCliente)} className="text-xs text-muted-foreground hover:text-foreground underline">Restaurar padrão</button>
        </div>
      )}
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function AbaWhatsapp() {
  const [kanban, setKanban] = useState(getWhatsappKanbanConfig);
  const [expedicao, setExpedicao] = useState(getWhatsappExpedicaoConfig);
  const [saved, setSaved] = useState(false);
  const [secao, setSecao] = useState('kanban'); // 'kanban' | 'expedicao' | 'numeros' | 'teste'
  const [novoNome, setNovoNome] = useState('');
  const [novoTelefone, setNovoTelefone] = useState('');
  const [testando, setTestando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [telefoneTest, setTelefoneTest] = useState('');
  const [areaTest, setAreaTest] = useState('kanban');

  const toggleSecao = (key) => setSecao(prev => prev === key ? null : key);

  // Numeros internos compartilhados (ficam no config kanban por retrocompatibilidade)
  const numeros_internos = kanban.numeros_internos || [];

  const adicionarNumero = () => {
    if (!novoTelefone.trim()) return;
    const numero = { nome: novoNome.trim() || 'Sem nome', telefone: novoTelefone.trim().replace(/\D/g, ''), ativo: true };
    setKanban(prev => ({ ...prev, numeros_internos: [...(prev.numeros_internos || []), numero] }));
    setNovoNome(''); setNovoTelefone('');
  };
  const removerNumero = (idx) => setKanban(prev => ({ ...prev, numeros_internos: prev.numeros_internos.filter((_, i) => i !== idx) }));
  const toggleNumero = (idx) => setKanban(prev => ({ ...prev, numeros_internos: prev.numeros_internos.map((n, i) => i === idx ? { ...n, ativo: !n.ativo } : n) }));

  const toggleEtapaKanban = (key) => setKanban(prev => ({
    ...prev,
    etapas_notificar: prev.etapas_notificar.includes(key)
      ? prev.etapas_notificar.filter(e => e !== key)
      : [...prev.etapas_notificar, key],
  }));

  const toggleEtapaExp = (key) => setExpedicao(prev => ({
    ...prev,
    etapas_notificar: prev.etapas_notificar.includes(key)
      ? prev.etapas_notificar.filter(e => e !== key)
      : [...prev.etapas_notificar, key],
  }));

  const salvar = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(kanban));
    localStorage.setItem(STORAGE_KEY_EXP, JSON.stringify(expedicao));
    window.dispatchEvent(new Event('settings:saved'));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const testar = async () => {
    if (!telefoneTest.trim()) return alert('Informe um telefone para teste.');
    setTestando(true); setResultado(null);
    try {
      let res;
      if (areaTest === 'kanban') {
        res = await base44.functions.invoke('enviarWhatsappKanban', {
          ordem: { numero: 'OP-TESTE', produto_nome: 'Produto de Teste', quantidade: 10 },
          novoStatus: 'produzido', clienteNome: 'Cliente Teste',
          clienteTelefone: kanban.notificar_cliente ? telefoneTest.trim() : null,
          numeros_internos: kanban.numeros_internos || [],
          msg_interno: kanban.msg_interno, msg_cliente: kanban.msg_cliente,
        });
      } else {
        res = await base44.functions.invoke('enviarWhatsappExpedicao', {
          expedicao: { numero_nf: 'NF-TESTE', cliente_nome: 'Cliente Teste', pedido_numero: 'PED-001' },
          novoStatus: 'enviada', clienteTelefone: expedicao.notificar_cliente ? telefoneTest.trim() : null,
          numeros_internos: kanban.numeros_internos || [],
          msg_interno: expedicao.msg_interno, msg_cliente: expedicao.msg_cliente,
        });
      }
      setResultado({ ok: res.data?.ok, resultados: res.data?.resultados });
    } catch (e) {
      setResultado({ ok: false, erro: e.message });
    }
    setTestando(false);
  };

  return (
    <div className="space-y-4">
      {/* Status */}
      <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
          <MessageCircle size={16} className="text-green-600" />
        </div>
        <div className="flex-1">
          <p className="font-bold text-sm text-foreground">WhatsApp via SM Click</p>
          <p className="text-xs text-muted-foreground">Notificações automáticas para produção e expedição</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-full flex-shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Configurado
        </div>
      </div>

      {/* Números Internos */}
      <Secao icon={UserCheck} iconBg="bg-primary/10" iconColor="text-primary"
        title="Números Internos" subtitle={`${numeros_internos.filter(n => n.ativo).length} ativo(s) — recebem notificações de todas as áreas`}
        open={secao === 'numeros'} onToggle={() => toggleSecao('numeros')}>

        {numeros_internos.length > 0 && (
          <div className="space-y-2 mb-2">
            {numeros_internos.map((n, idx) => (
              <div key={idx} className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${n.ativo ? 'border-green-300 bg-green-50' : 'border-border bg-muted/20'}`}>
                <button onClick={() => toggleNumero(idx)}
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${n.ativo ? 'bg-green-500 border-green-500' : 'border-muted-foreground/40'}`}>
                  {n.ativo && <Check size={11} className="text-white" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${n.ativo ? 'text-foreground' : 'text-muted-foreground'}`}>{n.nome}</p>
                  <p className="text-xs text-muted-foreground font-mono">{n.telefone}</p>
                </div>
                <button onClick={() => removerNumero(idx)} className="p-1.5 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
        {numeros_internos.length === 0 && (
          <div className="flex flex-col items-center py-5 text-muted-foreground/50 bg-muted/30 rounded-xl">
            <Phone size={20} className="mb-1 opacity-40" />
            <p className="text-xs">Nenhum número cadastrado ainda.</p>
          </div>
        )}
        <div className="flex gap-2 pt-1">
          <input value={novoNome} onChange={e => setNovoNome(e.target.value)} placeholder="Nome (ex: Maria)"
            className="flex-1 border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
          <input value={novoTelefone} onChange={e => setNovoTelefone(e.target.value)} onKeyDown={e => e.key === 'Enter' && adicionarNumero()} placeholder="5511999999999"
            className="flex-1 border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
          <button onClick={adicionarNumero} className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 flex-shrink-0">
            <Plus size={14} /> Adicionar
          </button>
        </div>
      </Secao>

      {/* Kanban de Produção */}
      <Secao icon={Factory} iconBg="bg-amber-100" iconColor="text-amber-600"
        title="Kanban de Produção" subtitle={`${kanban.etapas_notificar.length} etapa(s) ativa(s)`}
        open={secao === 'kanban'} onToggle={() => toggleSecao('kanban')}>

        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1"><Bell size={12} /> Etapas que disparam notificação</p>
          <EtapasToggle etapas={ETAPAS_KANBAN} ativas={kanban.etapas_notificar} onToggle={toggleEtapaKanban} />
          {kanban.etapas_notificar.length === 0 && (
            <div className="flex items-center gap-2 mt-2 text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-xl">
              <AlertCircle size={12} /> Nenhuma etapa ativa.
            </div>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1"><Phone size={12} /> Notificação ao cliente</p>
          <button onClick={() => setKanban(prev => ({ ...prev, notificar_cliente: !prev.notificar_cliente }))}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${kanban.notificar_cliente ? 'border-primary/30 bg-primary/5' : 'border-border bg-background hover:bg-muted/30'}`}>
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${kanban.notificar_cliente ? 'bg-primary border-primary' : 'border-muted-foreground/40'}`}>
              {kanban.notificar_cliente && <Check size={11} className="text-white" />}
            </div>
            <p className={`text-sm font-semibold ${kanban.notificar_cliente ? 'text-foreground' : 'text-muted-foreground'}`}>Notificar cliente via WhatsApp</p>
          </button>
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1"><MessageCircle size={12} /> Mensagens</p>
          <MsgEditor
            variaveis={VARIAVEIS_KANBAN}
            msgInterno={kanban.msg_interno} msgCliente={kanban.msg_cliente}
            defaultInterno={DEFAULT_KANBAN_MSG_INTERNO} defaultCliente={DEFAULT_KANBAN_MSG_CLIENTE}
            onChange={(field, val) => setKanban(prev => ({ ...prev, [field]: val }))}
            previewFn={previewKanban}
            etapaPreview={kanban.etapas_notificar[0] || 'produzido'}
          />
        </div>
      </Secao>

      {/* Expedição */}
      <Secao icon={Truck} iconBg="bg-purple-100" iconColor="text-purple-600"
        title="Expedição" subtitle={`${expedicao.etapas_notificar.length} etapa(s) ativa(s)`}
        open={secao === 'expedicao'} onToggle={() => toggleSecao('expedicao')}>

        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1"><Bell size={12} /> Etapas que disparam notificação</p>
          <EtapasToggle etapas={ETAPAS_EXPEDICAO} ativas={expedicao.etapas_notificar} onToggle={toggleEtapaExp} />
          {expedicao.etapas_notificar.length === 0 && (
            <div className="flex items-center gap-2 mt-2 text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-xl">
              <AlertCircle size={12} /> Nenhuma etapa ativa.
            </div>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1"><Phone size={12} /> Notificação ao cliente</p>
          <button onClick={() => setExpedicao(prev => ({ ...prev, notificar_cliente: !prev.notificar_cliente }))}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${expedicao.notificar_cliente ? 'border-primary/30 bg-primary/5' : 'border-border bg-background hover:bg-muted/30'}`}>
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${expedicao.notificar_cliente ? 'bg-primary border-primary' : 'border-muted-foreground/40'}`}>
              {expedicao.notificar_cliente && <Check size={11} className="text-white" />}
            </div>
            <p className={`text-sm font-semibold ${expedicao.notificar_cliente ? 'text-foreground' : 'text-muted-foreground'}`}>Notificar cliente via WhatsApp</p>
          </button>
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1"><MessageCircle size={12} /> Mensagens</p>
          <MsgEditor
            variaveis={VARIAVEIS_EXP}
            msgInterno={expedicao.msg_interno} msgCliente={expedicao.msg_cliente}
            defaultInterno={DEFAULT_EXP_MSG_INTERNO} defaultCliente={DEFAULT_EXP_MSG_CLIENTE}
            onChange={(field, val) => setExpedicao(prev => ({ ...prev, [field]: val }))}
            previewFn={previewExp}
            etapaPreview={expedicao.etapas_notificar[0] || 'enviada'}
          />
        </div>
      </Secao>

      {/* Teste */}
      <Secao icon={MessageCircle} iconBg="bg-sky-100" iconColor="text-sky-600"
        title="Testar Disparo" subtitle="Envie uma mensagem de teste"
        open={secao === 'teste'} onToggle={() => toggleSecao('teste')}>

        <div className="flex gap-1 bg-muted p-1 rounded-xl mb-3 w-fit">
          {[{ key: 'kanban', label: '🏭 Produção' }, { key: 'expedicao', label: '🚚 Expedição' }].map(t => (
            <button key={t.key} onClick={() => setAreaTest(t.key)}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${areaTest === t.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input value={telefoneTest} onChange={e => setTelefoneTest(e.target.value)}
            placeholder="5511999999999"
            className="flex-1 border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
          <button onClick={testar} disabled={testando}
            className="flex items-center gap-2 px-4 py-2.5 bg-sky-500 text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex-shrink-0">
            {testando ? 'Enviando...' : 'Testar'}
          </button>
        </div>
        {resultado && (
          <div className={`text-xs rounded-xl px-4 py-3 mt-2 ${resultado.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {resultado.ok ? (
              <><p className="font-bold mb-1">✅ Enviado com sucesso!</p>
                {resultado.resultados?.map((r, i) => <p key={i}>{r.destino === 'interno' ? '🏢 Interno' : '👤 Cliente'}: {r.ok ? 'enviado' : 'falhou'}</p>)}
              </>
            ) : <p className="font-bold">❌ Falha: {resultado.erro || 'Erro desconhecido'}</p>}
          </div>
        )}
      </Secao>

      {/* Salvar */}
      <button onClick={salvar}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${saved ? 'bg-green-500 text-white' : 'bg-primary text-primary-foreground hover:opacity-90'}`}>
        {saved ? <><Check size={14} /> Configuração salva!</> : <><Save size={14} /> Salvar configuração</>}
      </button>
    </div>
  );
}