import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SMCLICK_API_KEY  = Deno.env.get('SMCLICK_API_KEY');
const SMCLICK_INSTANCE = Deno.env.get('SMCLICK_INSTANCE_ID');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { telefone, mensagem } = await req.json();
    if (!telefone || !mensagem) {
      return Response.json({ error: 'Telefone e mensagem são obrigatórios' }, { status: 400 });
    }

    // Normaliza: adiciona 55 automaticamente se vier sem código de país
    const telefoneFormatado = (() => {
      let d = String(telefone).replace(/\D/g, '');
      if (!d) return '';
      if (d.length === 13 && d.startsWith('55')) return d;
      if (d.length === 11 || d.length === 10) return '55' + d;
      return d;
    })();
    const res = await fetch('https://api.smclick.com.br/instances/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-KEY': SMCLICK_API_KEY },
      body: JSON.stringify({
        instance: SMCLICK_INSTANCE,
        type: 'text',
        no_ticket: true,
        content: {
          telephone: telefoneFormatado,
          message: mensagem,
        },
      }),
    });

    const body = await res.text();
    console.log(`[TESTE WA] SMClick [${res.status}]:`, body);

    if (!res.ok) {
      return Response.json({ ok: false, error: `SMClick retornou ${res.status}: ${body}` }, { status: 500 });
    }

    return Response.json({ ok: true, resultados: [{ destino: 'teste', ok: true }] });
  } catch (error) {
    console.error('[enviarWhatsappTeste]', error.message);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});