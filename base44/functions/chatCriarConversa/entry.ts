import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { titulo, participantes } = await req.json().catch(() => ({}));

    if (!titulo || !participantes || participantes.length === 0) {
      return Response.json({ error: 'Título e participantes são obrigatórios' }, { status: 400 });
    }

    // Adiciona o criador como participante se não estiver na lista
    const participantesComCriador = participantes.includes(user.id) 
      ? participantes 
      : [...participantes, user.id];

    const conversa = await base44.entities.Conversa.create({
      titulo,
      participantes: participantesComCriador,
      criado_por_id: user.id,
      criado_por_nome: user.full_name,
      ultima_mensagem: 'Conversa criada',
      data_ultima_mensagem: new Date().toISOString(),
    });

    return Response.json({ ok: true, conversa });
  } catch (error) {
    console.error('[chatCriarConversa] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});