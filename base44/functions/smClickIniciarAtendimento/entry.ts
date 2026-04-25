import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Inicia o atendimento (muda status de waiting/screening para active)
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const apiKey = Deno.env.get('SMCLICK_API_KEY');
    const { chatId, attendantId, departmentId } = await req.json();

    if (!chatId) return Response.json({ error: 'chatId obrigatório' }, { status: 400 });
    if (!attendantId) return Response.json({ error: 'attendantId obrigatório' }, { status: 400 });

    const body = { attendant: attendantId };
    if (departmentId) body.department = departmentId;

    const res = await fetch(`https://api.smclick.com.br/attendances/chats/${chatId}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) return Response.json({ error: data?.message || 'Erro ao iniciar atendimento', detalhes: data }, { status: res.status });

    return Response.json({ ok: true, raw: data });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});