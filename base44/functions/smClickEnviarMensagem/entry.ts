import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { chatId, mensagem } = await req.json();
    if (!chatId || !mensagem) return Response.json({ error: 'chatId e mensagem são obrigatórios' }, { status: 400 });

    const apiKey = Deno.env.get('SMCLICK_API_KEY');

    const res = await fetch(`https://api.smclick.com.br/attendances/chats/${chatId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({ message: mensagem }),
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