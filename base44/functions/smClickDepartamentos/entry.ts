import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const apiKey = Deno.env.get('SMCLICK_API_KEY');

    const res = await fetch('https://api.smclick.com.br/departments', {
      method: 'GET',
      headers: { 'x-api-key': apiKey, 'Authorization': `Bearer ${apiKey}` },
    });

    const data = await res.json();
    return Response.json({ departamentos: data?.data || data || [] });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});