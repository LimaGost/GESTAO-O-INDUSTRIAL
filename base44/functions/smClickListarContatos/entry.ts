import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const apiKey = Deno.env.get('SMCLICK_API_KEY');
    const { busca, page } = await req.json();

    let url = `https://api.smclick.com.br/contacts?simple=true&page=${page || 1}`;
    if (busca) url += `&name=${encodeURIComponent(busca)}`;

    const res = await fetch(url, { headers: { 'x-api-key': apiKey } });
    const data = await res.json();

    if (!res.ok) return Response.json({ error: data?.message || 'Erro ao listar contatos' }, { status: res.status });

    return Response.json({
      contatos: data.results || [],
      total: data.count || 0,
      proximo: data.next,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});