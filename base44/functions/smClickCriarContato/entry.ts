import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const apiKey = Deno.env.get('SMCLICK_API_KEY');
    const { name, telephone, tags } = await req.json();

    if (!name || !name.trim()) return Response.json({ error: 'Nome obrigatório e não pode estar vazio' }, { status: 400 });
    if (!telephone || !telephone.trim()) return Response.json({ error: 'Telefone obrigatório e não pode estar vazio' }, { status: 400 });
    
    // Valida se telefone tem apenas números
    const telSoNumeros = telephone.replace(/\D/g, '');
    if (telSoNumeros.length < 10) return Response.json({ error: 'Telefone deve ter pelo menos 10 dígitos' }, { status: 400 });

    const body = { name, telephone };
    if (tags && tags.length > 0) body.tags = tags;

    const res = await fetch('https://api.smclick.com.br/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    // Trata duplicata gracefully
    if (!res.ok) {
      const msg = data?.message || data?.error || '';
      if (msg.includes('duplicate') || msg.includes('já existe')) {
        return Response.json({
          ok: false,
          erro: 'Contato já existe',
          detalhes: 'Este número de telefone já está cadastrado no sistema.',
          status: 'duplicado'
        }, { status: 409 });
      }
      return Response.json({ error: data?.message || 'Erro ao criar contato', detalhes: data }, { status: res.status });
    }

    return Response.json({ ok: true, contato: data.object || data });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});