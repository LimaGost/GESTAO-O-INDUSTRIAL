import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { conversa_id } = await req.json().catch(() => ({}));
    if (!conversa_id) return Response.json({ error: 'Conversa ID obrigatório' }, { status: 400 });

    // Valida que o usuário é participante da conversa antes de retornar mensagens
    const conversas = await base44.asServiceRole.entities.Conversa.filter({ id: conversa_id });
    if (conversas.length === 0) return Response.json({ error: 'Conversa não encontrada' }, { status: 404 });

    const conversa = conversas[0];
    if (!conversa.participantes?.includes(user.id)) {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const mensagens = await base44.asServiceRole.entities.Mensagem.filter({ conversa_id }, 'created_date');

    return Response.json({ mensagens });
  } catch (error) {
    console.error('[chatListarMensagens] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});