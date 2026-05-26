import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Busca todas as conversas onde o usuário é participante
    const todasConversas = await base44.entities.Conversa.list('-data_ultima_mensagem');
    const conversasDoUsuario = todasConversas.filter(c => 
      c.participantes?.includes(user.id)
    );

    return Response.json({ conversas: conversasDoUsuario });
  } catch (error) {
    console.error('[chatListarConversas] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});