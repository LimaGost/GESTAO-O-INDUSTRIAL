import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { protocol } = await req.json();
    if (!protocol) return Response.json({ error: 'protocol é obrigatório' }, { status: 400 });
    
    const protocolInt = parseInt(protocol, 10);
    if (isNaN(protocolInt)) return Response.json({ error: 'protocol deve ser um número' }, { status: 400 });

    const apiKey = Deno.env.get('SMCLICK_API_KEY');

    const res = await fetch(`https://api.smclick.com.br/attendances/chats/message?protocol=${protocolInt}`, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      return Response.json({ erro: data?.message || 'Erro ao buscar mensagens', detalhes: data }, { status: res.status });
    }

    // Tenta extrair o array de mensagens de várias possíveis estruturas
    let raw = [];
    if (Array.isArray(data)) {
      raw = data;
    } else if (data?.data && Array.isArray(data.data)) {
      raw = data.data;
    } else if (data?.messages && Array.isArray(data.messages)) {
      raw = data.messages;
    } else if (data?.results && Array.isArray(data.results)) {
      raw = data.results;
    }

    const mensagens = raw.map(m => ({
      id: m.id || m._id || Math.random(),
      texto: m.message || m.body || m.content || m.text || '',
      de: m.fromMe ? 'sistema' : 'cliente',
      fromMe: m.fromMe,
      created_date: m.createdAt || m.created_at || m.timestamp || new Date().toISOString(),
    }));

    return Response.json({ mensagens });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});