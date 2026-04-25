import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const apiKey = Deno.env.get('SMCLICK_API_KEY');
    const { status = 'waiting' } = await req.json();

    const res = await fetch(`https://api.smclick.com.br/attendances/chats?status=${status}`, {
      headers: { 'x-api-key': apiKey },
    });

    const data = await res.json();
    if (!res.ok) return Response.json({ error: data?.message || 'Erro ao listar chats' }, { status: res.status });

    const chats = (data.results || []).map(chat => ({
      id: chat.id,
      contact: {
        name: chat.contact?.name || 'Contato',
        telephone: chat.contact?.telephone,
      },
      last_message: chat.last_message?.body || '',
      unread_count: chat.unread_count || 0,
      is_group: chat.is_group || false,
      updated_date: chat.updated_at || new Date().toISOString(),
      status: chat.status,
    }));

    return Response.json({ chats });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});