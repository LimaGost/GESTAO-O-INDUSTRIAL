import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SMCLICK_API_KEY  = Deno.env.get('SMCLICK_API_KEY');
const SMCLICK_INSTANCE = Deno.env.get('SMCLICK_INSTANCE_ID');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { telefone, mensagem } = await req.json();
    if (!telefone || !mensagem) return Response.json({ error: 'telefone e mensagem são obrigatórios' }, { status: 400 });

    const telefoneFormatado = String(telefone).replace(/\D/g, '');

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

    const data = await res.json();

    if (!res.ok) {
      return Response.json({ erro: data?.message || 'Erro ao enviar mensagem', detalhes: data }, { status: res.status });
    }

    return Response.json({ ok: true, data });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});