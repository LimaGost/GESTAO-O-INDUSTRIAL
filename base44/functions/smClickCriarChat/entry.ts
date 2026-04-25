import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { telefone, nomeCliente, department } = await req.json();
    if (!telefone) return Response.json({ error: 'Telefone obrigatório' }, { status: 400 });
    if (!department) return Response.json({ error: 'Departamento obrigatório' }, { status: 400 });

    const instanceId = Deno.env.get('SMCLICK_INSTANCE_ID');
    const apiKey = Deno.env.get('SMCLICK_API_KEY');

    const body = {
      contact: {
        name: nomeCliente || telefone,
        telephone: telefone,
      },
      instance: instanceId,
      department,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    let res;
    try {
      res = await fetch('https://api.smclick.com.br/attendances/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (fetchErr) {
      clearTimeout(timeout);
      if (fetchErr.name === 'AbortError') {
        return Response.json({ error: 'Timeout: a API do SM Click demorou demais para responder. Tente novamente.' }, { status: 504 });
      }
      throw fetchErr;
    }
    clearTimeout(timeout);

    const data = await res.json();

    if (!res.ok) {
      return Response.json({ erro: data?.message || 'Erro ao criar chat', detalhes: data }, { status: res.status });
    }

    const chat_id = data?.object?.id || data?.id || data?.chat_id;

    return Response.json({ chat_id, raw: data });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});