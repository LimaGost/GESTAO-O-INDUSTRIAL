import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Webhook do Bling - recebe notificações de novos pedidos
// Configure no Bling: Configurações > API > Webhooks > URL: <URL desta função>
// Evento: pedido.criado (ou pedidoVenda.criado no Bling v3)

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json();
    console.log('[blingWebhook] Payload recebido:', JSON.stringify(body));

    // Bling v3 envia { data: { ... }, event: "pedidoVenda.incluido" }
    const evento = body.event || body.tipo || '';
    const dadosPedido = body.data || body.retorno?.pedidos?.[0]?.pedido || body;

    if (!dadosPedido) {
      return Response.json({ ok: false, error: 'Payload inválido' }, { status: 400 });
    }

    // Busca detalhes completos do pedido via API do Bling se tiver apenas o ID
    let pedidoBling = dadosPedido;
    if (dadosPedido.id && !dadosPedido.itens && !dadosPedido.items) {
      const apiKey = Deno.env.get('BLING_API_KEY');
      const res = await fetch(`https://www.bling.com.br/Api/v3/pedidos/vendas/${dadosPedido.id}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json',
        },
      });
      if (res.ok) {
        const json = await res.json();
        pedidoBling = json.data || pedidoBling;
      }
    }

    // Verifica se pedido já foi importado (evita duplicatas)
    const existentes = await base44.asServiceRole.entities.Pedido.filter({
      numero: String(pedidoBling.numero || pedidoBling.id || ''),
    });
    if (existentes.length > 0) {
      console.log('[blingWebhook] Pedido já importado:', pedidoBling.numero);
      return Response.json({ ok: true, msg: 'Pedido já importado', duplicado: true });
    }

    // Monta itens do pedido
    const itensBrutos = pedidoBling.itens || pedidoBling.items || [];
    const itens = itensBrutos.map(item => ({
      produto_id: String(item.produto?.id || item.codigo || ''),
      produto_nome: item.produto?.nome || item.descricao || item.nome || 'Produto',
      quantidade: Number(item.quantidade) || 1,
      preco_unitario: Number(item.valor || item.preco || 0),
      total: Number(item.quantidade || 1) * Number(item.valor || item.preco || 0),
    }));

    const valorTotal = Number(pedidoBling.totalProdutos || pedidoBling.total || pedidoBling.valor_total || 0);
    const clienteNome = pedidoBling.contato?.nome || pedidoBling.cliente?.nome || pedidoBling.nomeCliente || 'Cliente Bling';
    const numeroPedido = String(pedidoBling.numero || pedidoBling.id || `BLING-${Date.now()}`);
    const dataPedido = (pedidoBling.data || pedidoBling.dataPedido || new Date().toISOString().split('T')[0]).split('T')[0];
    const observacoes = pedidoBling.observacoes || pedidoBling.obs || '';

    // Cria pedido no sistema
    const novoPedido = await base44.asServiceRole.entities.Pedido.create({
      numero: numeroPedido,
      cliente_nome: clienteNome,
      status: 'rascunho',
      data_pedido: dataPedido,
      itens,
      valor_total: valorTotal,
      observacoes: observacoes ? `[Bling] ${observacoes}` : '[Importado do Bling]',
    });

    console.log('[blingWebhook] Pedido criado:', novoPedido.id, numeroPedido);
    return Response.json({ ok: true, pedido_id: novoPedido.id, numero: numeroPedido });

  } catch (error) {
    console.error('[blingWebhook] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});