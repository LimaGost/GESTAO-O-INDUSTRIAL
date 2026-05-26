import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversa_id } = await req.json().catch(() => ({}));

    if (!conversa_id) {
      return Response.json({ error: 'Conversa ID obrigatório' }, { status: 400 });
    }

    const mensagens = await base44.entities.Mensagem.filter({ conversa_id }, 'created_date');

    return Response.json({ mensagens });
  } catch (error) {
    console.error('[chatListarMensagens] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});