import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Sincroniza pedidos do Bling manualmente
// Payload: { pagina: 1, limite: 50, dataInicio: "2024-01-01", dataFim: "2024-12-31" }

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { pagina = 1, limite = 50, dataInicio, dataFim } = await req.json().catch(() => ({}));

    // Obtém token OAuth2 válido diretamente (sem depender de outro function invoke)
    const configs = await base44.asServiceRole.entities.BlingConfig.list();
    const config = configs[0];
    if (!config || !config.refresh_token) {
      return Response.json({ error: 'Bling não autorizado. Faça a autenticação OAuth2 nas Configurações.' }, { status: 401 });
    }

    let accessToken = config.access_token;

    // Renova se expirado (com margem de 5 min)
    if (!accessToken || !config.expires_at || Date.now() >= config.expires_at - 300000) {
      const clientId = Deno.env.get('BLING_CLIENT_ID');
      const clientSecret = Deno.env.get('BLING_CLIENT_SECRET');
      const credentials = btoa(`${clientId}:${clientSecret}`);

      const tokenRes = await fetch('https://www.bling.com.br/Api/v3/oauth/token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: config.refresh_token }),
      });

      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || !tokenData.access_token) {
        console.error('[blingSincronizar] Falha ao renovar token:', JSON.stringify(tokenData));
        return Response.json({ error: 'Falha ao renovar token Bling. Reconecte nas Configurações.' }, { status: 401 });
      }

      accessToken = tokenData.access_token;
      const expiresAt = Date.now() + (tokenData.expires_in || 21600) * 1000;
      await base44.asServiceRole.entities.BlingConfig.update(config.id, {
        access_token: accessToken,
        refresh_token: tokenData.refresh_token || config.refresh_token,
        expires_at: expiresAt,
        conectado: true,
      });
    }

    // Monta query params (Bling v3 usa YYYY-MM-DD)
    const params = new URLSearchParams({
      pagina: String(pagina),
      limite: String(Math.min(limite, 100)),
    });
    if (dataInicio) params.set('dataInicio', dataInicio);
    if (dataFim) params.set('dataFim', dataFim);

    // Busca pedidos no Bling v3
    const res = await fetch(`https://www.bling.com.br/Api/v3/pedidos/vendas?${params}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error('[blingSincronizar] Erro Bling API:', res.status, txt);
      return Response.json({ error: `Erro na API do Bling: ${res.status}`, detalhe: txt }, { status: 500 });
    }

    const json = await res.json();
    const pedidosBling = json.data || [];

    let importados = 0;
    let duplicados = 0;
    const erros = [];

    for (const pedidoBling of pedidosBling) {
      try {
        const numero = String(pedidoBling.numero || pedidoBling.id || '');

        // Verifica duplicata
        const existentes = await base44.asServiceRole.entities.Pedido.filter({ numero });
        if (existentes.length > 0) { duplicados++; continue; }

        // Busca detalhes completos
        let detalhes = pedidoBling;
        if (pedidoBling.id) {
          const detRes = await fetch(`https://www.bling.com.br/Api/v3/pedidos/vendas/${pedidoBling.id}`, {
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' },
          });
          if (detRes.ok) {
            const detJson = await detRes.json();
            detalhes = detJson.data || pedidoBling;
          }
        }

        const itensBrutos = detalhes.itens || detalhes.items || [];
        const itens = itensBrutos.map(item => ({
          produto_id: String(item.produto?.id || item.codigo || ''),
          produto_nome: item.produto?.nome || item.descricao || item.nome || 'Produto',
          quantidade: Number(item.quantidade) || 1,
          preco_unitario: Number(item.valor || item.preco || 0),
          total: Number(item.quantidade || 1) * Number(item.valor || item.preco || 0),
        }));

        const valorTotal = Number(detalhes.totalProdutos || detalhes.total || 0);
        const clienteNome = detalhes.contato?.nome || detalhes.cliente?.nome || 'Cliente Bling';
        const dataPedido = (detalhes.data || new Date().toISOString().split('T')[0]).split('T')[0];
        const observacoes = detalhes.observacoes || '';

        await base44.asServiceRole.entities.Pedido.create({
          numero,
          cliente_nome: clienteNome,
          status: 'rascunho',
          data_pedido: dataPedido,
          itens,
          valor_total: valorTotal,
          observacoes: observacoes ? `[Bling] ${observacoes}` : '[Importado do Bling]',
        });

        importados++;
      } catch (e) {
        erros.push({ numero: pedidoBling.numero, erro: e.message });
      }
    }

    return Response.json({
      ok: true,
      total_bling: pedidosBling.length,
      importados,
      duplicados,
      erros,
    });

  } catch (error) {
    console.error('[blingSincronizar] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});