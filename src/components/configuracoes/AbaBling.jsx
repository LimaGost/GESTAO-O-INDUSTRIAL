import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle, XCircle, RefreshCw, ExternalLink, Copy, Loader2 } from 'lucide-react';

export default function AbaBling() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authUrl, setAuthUrl] = useState('');
  const [code, setCode] = useState('');

  const [processando, setProcessando] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    carregarConfig();
    gerarUrl();
  }, []);

  const carregarConfig = async () => {
    setLoading(true);
    const configs = await base44.entities.BlingConfig.list();
    setConfig(configs[0] || null);
    setLoading(false);
  };

  const gerarUrl = async () => {
    const redirectUri = window.location.origin + '/BlingCallback';
    const res = await base44.functions.invoke('blingGetAuthUrl', { redirectUri });
    if (res.data?.url) setAuthUrl(res.data.url);
  };

  const copiar = () => {
    navigator.clipboard.writeText(authUrl);
    setMsg({ tipo: 'ok', texto: 'URL copiada!' });
    setTimeout(() => setMsg(null), 2000);
  };

  const autenticar = async () => {
    if (!code.trim()) { setMsg({ tipo: 'erro', texto: 'Cole o código retornado pelo Bling.' }); return; }
    setProcessando(true);
    setMsg(null);
    const redirectUri = window.location.origin + '/BlingCallback';
    const res = await base44.functions.invoke('blingExchangeCode', { code: code.trim(), redirectUri });
    setProcessando(false);
    if (res.data?.ok) {
      setMsg({ tipo: 'ok', texto: 'Bling conectado com sucesso! 🎉' });
      setCode('');
      carregarConfig();
    } else {
      setMsg({ tipo: 'erro', texto: res.data?.error || 'Erro ao autenticar. Verifique o código.' });
    }
  };

  const desconectar = async () => {
    if (!confirm('Deseja desconectar o Bling?')) return;
    const configs = await base44.entities.BlingConfig.list();
    for (const c of configs) await base44.entities.BlingConfig.delete(c.id);
    setConfig(null);
    setMsg({ tipo: 'ok', texto: 'Bling desconectado.' });
  };

  const conectado = config?.conectado && config?.access_token;
  const expiresDate = config?.expires_at ? new Date(config.expires_at).toLocaleString('pt-BR') : null;

  return (
    <div className="space-y-5 max-w-xl">
      <div>
        <h3 className="font-bold text-foreground text-base">Integração Bling</h3>
        <p className="text-sm text-muted-foreground mt-0.5">Conecte sua conta Bling para importar pedidos automaticamente.</p>
      </div>

      {/* Status */}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 size={14} className="animate-spin" /> Verificando conexão...
        </div>
      ) : (
        <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${conectado ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          {conectado
            ? <CheckCircle size={18} className="text-green-600 flex-shrink-0" />
            : <XCircle size={18} className="text-red-500 flex-shrink-0" />}
          <div className="flex-1">
            <p className={`text-sm font-semibold ${conectado ? 'text-green-700' : 'text-red-700'}`}>
              {conectado ? 'Bling Conectado' : 'Bling não conectado'}
            </p>
            {conectado && expiresDate && (
              <p className="text-xs text-green-600">Token válido até: {expiresDate}</p>
            )}
          </div>
          {conectado && (
            <button onClick={desconectar} className="text-xs text-red-500 hover:underline">Desconectar</button>
          )}
        </div>
      )}

      {/* Formulário de autenticação */}
      {!conectado && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <p className="text-sm font-semibold text-foreground">Passo 1 — Autorizar no Bling</p>

          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-800 space-y-1">
                <p className="font-semibold">⚙️ Antes de continuar — Configure no Bling:</p>
                <p>No painel do desenvolvedor Bling, adicione esta URL exata como <strong>redirect_uri</strong>:</p>
                <div className="flex items-center gap-2 mt-1">
                  <code className="bg-yellow-100 px-2 py-1 rounded text-xs flex-1 break-all">{window.location.origin + '/BlingCallback'}</code>
                  <button onClick={() => { navigator.clipboard.writeText(window.location.origin + '/BlingCallback'); }} className="p-1.5 border border-yellow-300 rounded hover:bg-yellow-100" title="Copiar"><Copy size={12} /></button>
                </div>
              </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">URL de Autorização</label>
            <div className="flex gap-2">
              <input readOnly value={authUrl} className="flex-1 border border-border rounded-lg px-3 py-2 text-xs bg-muted text-muted-foreground" />
              <button onClick={copiar} className="p-2 border border-border rounded-lg hover:bg-muted transition-colors" title="Copiar">
                <Copy size={14} />
              </button>
              <button onClick={() => authUrl && window.open(authUrl, '_blank')} disabled={!authUrl} className="p-2 border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-40" title="Abrir">
                <ExternalLink size={14} />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Clique em Abrir, autorize o app no Bling — você será redirecionado automaticamente.</p>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Passo 2 — Cole o código retornado</label>
            <input
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="Cole o código aqui..."
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background"
            />
          </div>

          <button
            onClick={autenticar}
            disabled={processando}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50">
            {processando ? <><Loader2 size={14} className="animate-spin" /> Autenticando...</> : 'Conectar Bling'}
          </button>
        </div>
      )}

      {/* Mensagem */}
      {msg && (
        <div className={`flex items-center gap-2 text-sm rounded-xl px-4 py-2.5 border ${msg.tipo === 'ok' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {msg.tipo === 'ok' ? <CheckCircle size={14} /> : <XCircle size={14} />}
          {msg.texto}
        </div>
      )}

      {/* Ações quando conectado */}
      {conectado && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">Sincronização Manual</p>
          <SincronizarManual />
        </div>
      )}
    </div>
  );
}

function SincronizarManual() {
  const [params, setParams] = useState({ dataInicio: '', dataFim: '', pagina: 1 });
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);

  const sincronizar = async () => {
    setLoading(true);
    setResultado(null);
    const res = await base44.functions.invoke('blingSincronizar', params);
    setLoading(false);
    setResultado(res.data);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Data Início</label>
          <input type="date" value={params.dataInicio} onChange={e => setParams(p => ({ ...p, dataInicio: e.target.value }))}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Data Fim</label>
          <input type="date" value={params.dataFim} onChange={e => setParams(p => ({ ...p, dataFim: e.target.value }))}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" />
        </div>
      </div>
      <button onClick={sincronizar} disabled={loading}
        className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50">
        <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        {loading ? 'Sincronizando...' : 'Sincronizar Pedidos'}
      </button>
      {resultado && (
        <div className="bg-muted/40 rounded-lg p-3 text-sm space-y-1">
          <p>✅ Importados: <strong>{resultado.importados}</strong></p>
          <p>🔁 Duplicados: <strong>{resultado.duplicados}</strong></p>
          <p>📦 Total Bling: <strong>{resultado.total_bling}</strong></p>
          {resultado.erros?.length > 0 && <p className="text-red-500">⚠️ Erros: {resultado.erros.length}</p>}
        </div>
      )}
    </div>
  );
}