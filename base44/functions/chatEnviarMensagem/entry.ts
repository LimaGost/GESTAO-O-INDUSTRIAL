import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversa_id, conteudo } = await req.json().catch(() => ({}));

    if (!conversa_id || !conteudo?.trim()) {
      return Response.json({ error: 'Conversa e conteúdo são obrigatórios' }, { status: 400 });
    }

    // Cria a mensagem
    const mensagem = await base44.entities.Mensagem.create({
      conversa_id,
      remetente_id: user.id,
      remetente_nome: user.full_name,
      conteudo: conteudo.trim(),
    });

    // Atualiza a conversa com a última mensagem
    const conversas = await base44.entities.Conversa.filter({ id: conversa_id });
    if (conversas.length > 0) {
      await base44.entities.Conversa.update(conversa_id, {
        ultima_mensagem: conteudo.trim(),
        data_ultima_mensagem: new Date().toISOString(),
      });
    }

    return Response.json({ ok: true, mensagem });
  } catch (error) {
    console.error('[chatEnviarMensagem] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});