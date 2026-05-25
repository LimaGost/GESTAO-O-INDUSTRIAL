import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Troca o `code` OAuth2 por access_token + refresh_token e salva no banco
// Payload: { code: "...", redirectUri: "..." }

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Apenas administradores podem fazer isso' }, { status: 403 });
    }

    const { code, redirectUri } = await req.json();
    if (!code) return Response.json({ error: 'Parâmetro `code` obrigatório' }, { status: 400 });

    const clientId = Deno.env.get('BLING_CLIENT_ID');
    const clientSecret = Deno.env.get('BLING_CLIENT_SECRET');
    const redirect = redirectUri || 'https://app.base44.app/callback';

    const credentials = btoa(`${clientId}:${clientSecret}`);

    const tokenRes = await fetch('https://www.bling.com.br/Api/v3/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirect,
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('[blingExchangeCode] Erro Bling:', JSON.stringify(tokenData));
      const errMsg = tokenData.error?.description || tokenData.error?.message || tokenData.error_description || (typeof tokenData.error === 'string' ? tokenData.error : 'Falha ao obter token');
      return Response.json({ ok: false, error: errMsg, detalhe: tokenData });
    }

    const expiresAt = Date.now() + (tokenData.expires_in || 21600) * 1000;

    // Remove configs antigas e salva nova
    const existentes = await base44.asServiceRole.entities.BlingConfig.list();
    for (const c of existentes) {
      await base44.asServiceRole.entities.BlingConfig.delete(c.id);
    }

    await base44.asServiceRole.entities.BlingConfig.create({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: expiresAt,
      conectado: true,
    });

    console.log('[blingExchangeCode] Tokens salvos com sucesso!');
    return Response.json({ ok: true, expires_in: tokenData.expires_in });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});