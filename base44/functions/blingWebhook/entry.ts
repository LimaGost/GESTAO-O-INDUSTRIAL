import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Webhook do Bling v3 — recebe notificações em tempo real de pedidos de venda
// Estrutura do payload: { eventId, date, version, event, companyId, data }
// Validação: header X-Bling-Signature-256 com HMAC-SHA256 do body + BLING_CLIENT_SECRET

async function validarAssinatura(bodyText, signature) {
  const secret = Deno.env.get('BLING_CLIENT_SECRET');
  if (!secret) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const hashBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(bodyText));
  const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  const esperado = `sha256=${hashHex}`;

  return signature === esperado;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const bodyText = await req.text();
    const signature = req.headers.get('X-Bling-Signature-256') || '';

    // Valida assinatura (loga mas não bloqueia em ambiente de teste se não houver secret)
    const assinaturaValida = await validarAssinatura(bodyText, signature);
    if (!assinaturaValida && signature) {
      console.warn('[blingWebhook] Assinatura inválida:', signature);
      return Response.json({ error: 'Assinatura inválida' }, { status: 401 });
    }

    const body = JSON.parse(bodyText);
    console.log('[blingWebhook] Evento recebido:', body.event, '| EventId:', body.eventId);

    // Só processa criação de pedidos de venda
    if (body.event !== 'order.created') {
      return Response.json({ ok: true, msg: `Evento "${body.event}" ignorado` });
    }

    const dadosPedido = body.data;
    if (!dadosPedido?.id) {
      return Response.json({ ok: false, error: 'Payload sem ID do pedido' }, { status: 400 });
    }

    // Verifica duplicata pelo número do pedido
    const numeroPedido = String(dadosPedido.numero || dadosPedido.id);
    const existentes = await base44.asServiceRole.entities.Pedido.filter({ numero: numeroPedido });
    if (existentes.length > 0) {
      console.log('[blingWebhook] Pedido já importado:', numeroPedido);
      return Response.json({ ok: true, msg: 'Duplicado', duplicado: true });
    }

    // Busca detalhes completos do pedido via API Bling (o webhook envia payload resumido)
    let pedidoBling = dadosPedido;

    // Obtém token diretamente do BlingConfig (sem invocar outra função)
    let accessToken = null;
    const configs = await base44.asServiceRole.entities.BlingConfig.list();
    const blingConfig = configs[0];
    if (blingConfig) {
      if (blingConfig.access_token && blingConfig.expires_at && Date.now() < blingConfig.expires_at - 300000) {
        accessToken = blingConfig.access_token;
      } else if (blingConfig.refresh_token) {
        const clientId = Deno.env.get('BLING_CLIENT_ID');
        const clientSecret = Deno.env.get('BLING_CLIENT_SECRET');
        const tokenRes = await fetch('https://www.bling.com.br/Api/v3/oauth/token', {
          method: 'POST',
          headers: { 'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: blingConfig.refresh_token }),
        });
        if (tokenRes.ok) {
          const tokenData = await tokenRes.json();
          accessToken = tokenData.access_token;
          await base44.asServiceRole.entities.BlingConfig.update(blingConfig.id, {
            access_token: accessToken,
            refresh_token: tokenData.refresh_token || blingConfig.refresh_token,
            expires_at: Date.now() + (tokenData.expires_in || 21600) * 1000,
            conectado: true,
          });
        }
      }
    }

    // Busca detalhes completos via API Bling
    if (accessToken) {
      const res = await fetch(`https://www.bling.com.br/Api/v3/pedidos/vendas/${dadosPedido.id}`, {
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' },
      });
      if (res.ok) {
        const json = await res.json();
        pedidoBling = json.data || pedidoBling;
        console.log('[blingWebhook] Detalhes completos obtidos para pedido:', numeroPedido);
      } else {
        console.warn('[blingWebhook] Falha ao buscar detalhes, usando payload do webhook');
      }
    }

    // Monta itens
    const itensBrutos = pedidoBling.itens || pedidoBling.items || [];
    const itens = itensBrutos.map(item => ({
      produto_id: String(item.produto?.id || item.codigo || ''),
      produto_nome: item.produto?.nome || item.descricao || item.nome || 'Produto',
      quantidade: Number(item.quantidade) || 1,
      preco_unitario: Number(item.valor || item.preco || 0),
      total: Number(item.quantidade || 1) * Number(item.valor || item.preco || 0),
    }));

    const agoraBrasil = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const valorTotal = Number(pedidoBling.totalProdutos || pedidoBling.total || dadosPedido.total || 0);
    const clienteNome = pedidoBling.contato?.nome || dadosPedido.contato?.nome || 'Cliente Bling';
    const dataPedido = (pedidoBling.data || dadosPedido.data || agoraBrasil.toISOString().split('T')[0]).split('T')[0];
    const observacoes = pedidoBling.observacoes || '';

    const novoPedido = await base44.asServiceRole.entities.Pedido.create({
      numero: numeroPedido,
      cliente_nome: clienteNome,
      origem: 'bling',
      status: 'rascunho',
      data_pedido: dataPedido,
      itens,
      valor_total: valorTotal,
      observacoes: observacoes ? `[Bling] ${observacoes}` : '[Importado do Bling]',
    });

    console.log('[blingWebhook] ✅ Pedido criado:', novoPedido.id, numeroPedido, '-', clienteNome);
    return Response.json({ ok: true, pedido_id: novoPedido.id, numero: numeroPedido });

  } catch (error) {
    console.error('[blingWebhook] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});