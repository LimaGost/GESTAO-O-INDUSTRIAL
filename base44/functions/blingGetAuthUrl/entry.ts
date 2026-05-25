import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Retorna a URL de autorização OAuth2 do Bling
// O admin deve acessar essa URL para autorizar o app e colar o `code` de volta

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Apenas administradores podem fazer isso' }, { status: 403 });
    }

    const clientId = Deno.env.get('BLING_CLIENT_ID');
    if (!clientId) return Response.json({ error: 'BLING_CLIENT_ID não configurado' }, { status: 500 });

    const { redirectUri } = await req.json().catch(() => ({}));
    const state = crypto.randomUUID().replace(/-/g, '');

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      state,
    });
    if (redirectUri) params.set('redirect_uri', redirectUri);

    const authUrl = `https://www.bling.com.br/Api/v3/oauth/authorize?${params}`;
    return Response.json({ url: authUrl });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});