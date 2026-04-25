import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const apiKey = Deno.env.get('SMCLICK_API_KEY');
    const { name, telephone, tags } = await req.json();

    if (!name) return Response.json({ error: 'name obrigatório' }, { status: 400 });
    if (!telephone) return Response.json({ error: 'telephone obrigatório' }, { status: 400 });

    const body = { name, telephone };
    if (tags && tags.length > 0) body.tags = tags;

    const res = await fetch('https://api.smclick.com.br/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) return Response.json({ error: data?.message || 'Erro ao criar contato', detalhes: data }, { status: res.status });

    return Response.json({ ok: true, contato: data });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});