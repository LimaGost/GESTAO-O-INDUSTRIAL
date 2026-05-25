import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function BlingCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');

    if (error || !code) {
      setStatus('error');
      setMsg(error || 'Código não encontrado na URL.');
      return;
    }

    const redirectUri = window.location.origin + '/BlingCallback';

    base44.functions.invoke('blingExchangeCode', { code, redirectUri })
      .then(res => {
        if (res.data?.ok) {
          setStatus('success');
          setMsg('Bling conectado com sucesso!');
          setTimeout(() => navigate('/Configuracoes'), 2500);
        } else {
          setStatus('error');
          setMsg(res.data?.error || 'Erro ao autenticar com o Bling.');
        }
      })
      .catch(err => {
        setStatus('error');
        setMsg(err.message || 'Erro inesperado.');
      });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="bg-card border border-border rounded-2xl shadow-sm p-8 max-w-sm w-full text-center space-y-4">
        {status === 'loading' && (
          <>
            <Loader2 size={40} className="animate-spin text-primary mx-auto" />
            <p className="font-semibold text-foreground">Autenticando com o Bling...</p>
            <p className="text-sm text-muted-foreground">Aguarde, estamos trocando o código pelo token.</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle size={40} className="text-green-500 mx-auto" />
            <p className="font-semibold text-green-700">Bling Conectado! 🎉</p>
            <p className="text-sm text-muted-foreground">Redirecionando para as configurações...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle size={40} className="text-red-500 mx-auto" />
            <p className="font-semibold text-red-700">Erro na autenticação</p>
            <p className="text-sm text-muted-foreground">{msg}</p>
            <button
              onClick={() => navigate('/Configuracoes')}
              className="mt-2 text-sm text-primary underline"
            >
              Voltar para Configurações
            </button>
          </>
        )}
      </div>
    </div>
  );
}