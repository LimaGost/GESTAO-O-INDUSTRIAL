import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { conversa_id, conteudo } = await req.json().catch(() => ({}));
    if (!conversa_id || !conteudo?.trim()) {
      return Response.json({ error: 'Conversa e conteúdo são obrigatórios' }, { status: 400 });
    }

    // Valida que o usuário é participante da conversa
    const conversas = await base44.asServiceRole.entities.Conversa.filter({ id: conversa_id });
    if (conversas.length === 0) return Response.json({ error: 'Conversa não encontrada' }, { status: 404 });

    const conversa = conversas[0];
    if (!conversa.participantes?.includes(user.id)) {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Cria a mensagem via service role (para evitar problema de RLS na criação)
    const mensagem = await base44.asServiceRole.entities.Mensagem.create({
      conversa_id,
      remetente_id: user.id,
      remetente_nome: user.full_name || user.email,
      conteudo: conteudo.trim(),
      lida: false,
    });

    // Atualiza preview da conversa
    await base44.asServiceRole.entities.Conversa.update(conversa_id, {
      ultima_mensagem: conteudo.trim().slice(0, 100),
      data_ultima_mensagem: new Date().toISOString(),
    });

    return Response.json({ ok: true, mensagem });
  } catch (error) {
    console.error('[chatEnviarMensagem] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});