import { useState } from 'react';
import { Save, Check, MessageCircle, Phone, Bell, AlertCircle, Info } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const STORAGE_KEY = 'whatsapp_kanban_config';

const ETAPAS = [
  { key: 'em_producao',  label: 'Em Produção',  emoji: '🏭' },
  { key: 'produzido',    label: 'Produzido',    emoji: '✅' },
  { key: 'em_embalagem', label: 'Em Embalagem', emoji: '📦' },
  { key: 'finalizado',   label: 'Finalizado',   emoji: '🎉' },
];

const VARIAVEIS = [
  { var: '{op}',       desc: 'Número da OP' },
  { var: '{produto}',  desc: 'Nome do produto' },
  { var: '{etapa}',    desc: 'Nome da etapa' },
  { var: '{cliente}',  desc: 'Nome do cliente' },
  { var: '{qtd}',      desc: 'Quantidade' },
];

const DEFAULT_MSG_INTERNO = `📋 *Atualização de Produção*\n\nOP: *{op}*\nProduto: {produto}\nEtapa: *{etapa}*\nCliente: {cliente}\nQuantidade: {qtd}`;
const DEFAULT_MSG_CLIENTE = `Olá! Seu pedido está sendo processado.\n\nProduto: *{produto}*\nStatus atual: *{etapa}*\n\nObrigado pela preferência! 🙏`;

export function getWhatsappKanbanConfig() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (saved) return saved;
  } catch {}
  return {
    etapas_notificar: ['produzido', 'finalizado'],
    notificar_cliente: true,
    notificar_interno: true,
    msg_interno: DEFAULT_MSG_INTERNO,
    msg_cliente: DEFAULT_MSG_CLIENTE,
  };
}

function preview(template, etapaKey) {
  const etapa = ETAPAS.find(e => e.key === etapaKey);
  return template
    .replace(/{op}/g, 'OP-0042')
    .replace(/{produto}/g, 'Vela Âmbar')
    .replace(/{etapa}/g, etapa ? `${etapa.emoji} ${etapa.label}` : etapaKey)
    .replace(/{cliente}/g, 'João Silva')
    .replace(/{qtd}/g, '24');
}

export default function AbaWhatsapp() {
  const [config, setConfig] = useState(getWhatsappKanbanConfig);
  const [saved, setSaved] = useState(false);
  const [testando, setTestando] = useState(false);
  const [resultadoTeste, setResultadoTeste] = useState(null);
  const [telefoneTest, setTelefoneTest] = useState('');
  const [abaMsg, setAbaMsg] = useState('interno'); // 'interno' | 'cliente'

  const toggleEtapa = (key) => {
    setConfig(prev => {
      const etapas = prev.etapas_notificar.includes(key)
        ? prev.etapas_notificar.filter(e => e !== key)
        : [...prev.etapas_notificar, key];
      return { ...prev, etapas_notificar: etapas };
    });
  };

  const salvar = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new Event('settings:saved'));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const testarDisparo = async () => {
    if (!telefoneTest.trim()) return alert('Informe um telefone para teste.');
    setTestando(true);
    setResultadoTeste(null);
    try {
      const res = await base44.functions.invoke('enviarWhatsappKanban', {
        ordem: { numero: 'OP-TESTE', produto_nome: 'Produto de Teste', quantidade: 10 },
        novoStatus: 'produzido',
        clienteNome: 'Cliente Teste',
        clienteTelefone: config.notificar_cliente ? telefoneTest.trim() : null,
        notificar_interno: config.notificar_interno,
        msg_interno: config.msg_interno,
        msg_cliente: config.msg_cliente,
      });
      setResultadoTeste({ ok: res.data?.ok, resultados: res.data?.resultados });
    } catch (e) {
      setResultadoTeste({ ok: false, erro: e.message });
    }
    setTestando(false);
  };

  const etapaPreview = config.etapas_notificar[0] || 'produzido';

  return (
    <div className="space-y-5">
      {/* Status da integração */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
            <MessageCircle size={18} className="text-green-600" />
          </div>
          <div>
            <p className="font-bold text-sm text-foreground">WhatsApp via SM Click</p>
            <p className="text-xs text-muted-foreground">Envio automático de notificações ao avançar etapas no Kanban</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Configurado
          </div>
        </div>
        <div className="text-xs text-muted-foreground bg-muted/40 rounded-xl px-4 py-3">
          As credenciais da API SM Click estão salvas como secrets no sistema.
        </div>
      </div>

      {/* Etapas que disparam */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <Bell size={15} className="text-primary" />
          <p className="font-bold text-sm text-foreground">Etapas que disparam notificação</p>
        </div>
        <p className="text-xs text-muted-foreground mb-4">Selecione em quais etapas do Kanban o WhatsApp será enviado automaticamente.</p>
        <div className="space-y-2">
          {ETAPAS.map(etapa => {
            const ativo = config.etapas_notificar.includes(etapa.key);
            return (
              <button key={etapa.key} onClick={() => toggleEtapa(etapa.key)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${ativo ? 'border-green-300 bg-green-50' : 'border-border bg-background hover:bg-muted/30'}`}>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${ativo ? 'bg-green-500 border-green-500' : 'border-muted-foreground/40'}`}>
                  {ativo && <Check size={11} className="text-white" />}
                </div>
                <span className="text-lg">{etapa.emoji}</span>
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${ativo ? 'text-green-700' : 'text-foreground'}`}>{etapa.label}</p>
                </div>
                {ativo && <span className="text-[10px] font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">ATIVO</span>}
              </button>
            );
          })}
        </div>
        {config.etapas_notificar.length === 0 && (
          <div className="flex items-center gap-2 mt-3 text-xs text-amber-700 bg-amber-50 px-3 py-2.5 rounded-xl">
            <AlertCircle size={13} /> Nenhuma etapa selecionada — nenhuma notificação será enviada.
          </div>
        )}
      </div>

      {/* Destinatários */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <Phone size={15} className="text-primary" />
          <p className="font-bold text-sm text-foreground">Destinatários</p>
        </div>
        <p className="text-xs text-muted-foreground mb-4">Defina quem receberá as notificações a cada disparo.</p>
        <div className="space-y-3">
          {[
            { key: 'notificar_interno', label: 'Número interno da empresa', desc: 'Configurado via secret SMCLICK_NUMERO_INTERNO' },
            { key: 'notificar_cliente', label: 'Telefone do cliente', desc: 'Enviado ao cliente vinculado ao pedido (se cadastrado)' },
          ].map(item => {
            const ativo = config[item.key];
            return (
              <button key={item.key}
                onClick={() => setConfig(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${ativo ? 'border-primary/30 bg-primary/5' : 'border-border bg-background hover:bg-muted/30'}`}>
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${ativo ? 'bg-primary border-primary' : 'border-muted-foreground/40'}`}>
                  {ativo && <Check size={11} className="text-white" />}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${ativo ? 'text-foreground' : 'text-muted-foreground'}`}>{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mensagens customizáveis */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <MessageCircle size={15} className="text-primary" />
          <p className="font-bold text-sm text-foreground">Mensagens</p>
        </div>
        <p className="text-xs text-muted-foreground mb-4">Personalize o texto enviado para cada destinatário.</p>

        {/* Abas interno / cliente */}
        <div className="flex gap-1 bg-muted p-1 rounded-xl mb-4 w-fit">
          {[
            { key: 'interno', label: '🏢 Número Interno' },
            { key: 'cliente', label: '👤 Cliente' },
          ].map(tab => (
            <button key={tab.key} onClick={() => setAbaMsg(tab.key)}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${abaMsg === tab.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Variáveis disponíveis */}
        <div className="flex items-start gap-2 bg-sky-50 border border-sky-200 rounded-xl px-3 py-2.5 mb-3">
          <Info size={13} className="text-sky-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-sky-700 mb-1">Variáveis disponíveis:</p>
            <div className="flex flex-wrap gap-1.5">
              {VARIAVEIS.map(v => (
                <span key={v.var} className="text-[10px] font-mono bg-white border border-sky-200 text-sky-700 px-1.5 py-0.5 rounded"
                  title={v.desc}>{v.var}</span>
              ))}
            </div>
          </div>
        </div>

        {abaMsg === 'interno' && (
          <div className="space-y-3">
            <textarea
              rows={6}
              value={config.msg_interno ?? DEFAULT_MSG_INTERNO}
              onChange={e => setConfig(prev => ({ ...prev, msg_interno: e.target.value }))}
              className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Pré-visualização:</p>
              <pre className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-xs text-green-900 whitespace-pre-wrap font-sans">
                {preview(config.msg_interno ?? DEFAULT_MSG_INTERNO, etapaPreview)}
              </pre>
            </div>
            <button onClick={() => setConfig(prev => ({ ...prev, msg_interno: DEFAULT_MSG_INTERNO }))}
              className="text-xs text-muted-foreground hover:text-foreground underline">
              Restaurar padrão
            </button>
          </div>
        )}

        {abaMsg === 'cliente' && (
          <div className="space-y-3">
            <textarea
              rows={6}
              value={config.msg_cliente ?? DEFAULT_MSG_CLIENTE}
              onChange={e => setConfig(prev => ({ ...prev, msg_cliente: e.target.value }))}
              className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Pré-visualização:</p>
              <pre className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-xs text-green-900 whitespace-pre-wrap font-sans">
                {preview(config.msg_cliente ?? DEFAULT_MSG_CLIENTE, etapaPreview)}
              </pre>
            </div>
            <button onClick={() => setConfig(prev => ({ ...prev, msg_cliente: DEFAULT_MSG_CLIENTE }))}
              className="text-xs text-muted-foreground hover:text-foreground underline">
              Restaurar padrão
            </button>
          </div>
        )}
      </div>

      {/* Teste de disparo */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <MessageCircle size={15} className="text-sky-500" />
          <p className="font-bold text-sm text-foreground">Testar Disparo</p>
        </div>
        <p className="text-xs text-muted-foreground mb-4">Envie uma mensagem de teste com as mensagens configuradas acima.</p>
        <div className="flex gap-2 mb-3">
          <input
            value={telefoneTest}
            onChange={e => setTelefoneTest(e.target.value)}
            placeholder="Ex: 5511999999999 (sem + ou espaços)"
            className="flex-1 border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button onClick={testarDisparo} disabled={testando}
            className="flex items-center gap-2 px-4 py-2.5 bg-sky-500 text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity flex-shrink-0">
            {testando ? 'Enviando...' : 'Testar'}
          </button>
        </div>
        {resultadoTeste && (
          <div className={`text-xs rounded-xl px-4 py-3 ${resultadoTeste.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {resultadoTeste.ok ? (
              <>
                <p className="font-bold mb-1">✅ Mensagem enviada com sucesso!</p>
                {resultadoTeste.resultados?.map((r, i) => (
                  <p key={i}>{r.destino === 'interno' ? '🏢 Número interno' : '👤 Cliente'}: {r.ok ? 'enviado' : 'falhou'}</p>
                ))}
              </>
            ) : (
              <p className="font-bold">❌ Falha: {resultadoTeste.erro || 'Erro desconhecido'}</p>
            )}
          </div>
        )}
      </div>

      {/* Salvar */}
      <button onClick={salvar}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${saved ? 'bg-green-500 text-white' : 'bg-primary text-primary-foreground hover:opacity-90'}`}>
        {saved ? <><Check size={14} /> Configuração salva!</> : <><Save size={14} /> Salvar configuração</>}
      </button>
    </div>
  );
}