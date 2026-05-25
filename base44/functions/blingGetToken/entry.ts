import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Função utilitária: retorna um access_token válido, renovando automaticamente se necessário
// Pode ser chamada internamente via base44.functions.invoke('blingGetToken', {})

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const configs = await base44.asServiceRole.entities.BlingConfig.list();
    const config = configs[0];

    if (!config || !config.refresh_token) {
      return Response.json({ error: 'Bling não autorizado. Faça a autenticação OAuth2 primeiro.' }, { status: 401 });
    }

    // Se o token ainda é válido (com margem de 5 min), retorna direto
    if (config.access_token && config.expires_at && Date.now() < config.expires_at - 300000) {
      return Response.json({ access_token: config.access_token });
    }

    // Renova o token via refresh_token
    const clientId = Deno.env.get('BLING_CLIENT_ID');
    const clientSecret = Deno.env.get('BLING_CLIENT_SECRET');
    const credentials = btoa(`${clientId}:${clientSecret}`);

    const tokenRes = await fetch('https://www.bling.com.br/OAuth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: config.refresh_token,
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('[blingGetToken] Falha ao renovar token:', JSON.stringify(tokenData));
      return Response.json({ error: 'Falha ao renovar token Bling', detalhe: tokenData }, { status: 401 });
    }

    const expiresAt = Date.now() + (tokenData.expires_in || 21600) * 1000;

    await base44.asServiceRole.entities.BlingConfig.update(config.id, {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || config.refresh_token,
      expires_at: expiresAt,
      conectado: true,
    });

    console.log('[blingGetToken] Token renovado com sucesso');
    return Response.json({ access_token: tokenData.access_token });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});