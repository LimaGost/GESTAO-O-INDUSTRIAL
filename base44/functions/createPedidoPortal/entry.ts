import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { cliente_nome, cliente_id, itens, observacoes, destino_tipo, destino_unidade, destino_transportadora, destino_endereco, data_entrega_prevista } = body;

    if (!cliente_nome || !itens || itens.length === 0) {
      return Response.json({ error: 'cliente_nome e itens são obrigatórios' }, { status: 400 });
    }

    // Calcular valor total
    const valor_total = itens.reduce((sum, item) => {
      return sum + ((item.preco_unitario || 0) * (item.quantidade || 1));
    }, 0);

    // Gerar número do pedido
    const timestamp = Date.now().toString().slice(-6);
    const numero = `PRT-${timestamp}`;

    const pedido = await base44.asServiceRole.entities.Pedido.create({
      numero,
      cliente_id: cliente_id || '',
      cliente_nome,
      status: 'rascunho',
      origem: 'portal',
      data_pedido: new Date().toISOString().split('T')[0],
      data_entrega_prevista: data_entrega_prevista || null,
      itens,
      valor_total,
      observacoes: observacoes || '',
      destino_tipo: destino_tipo || 'retirada_fabrica',
      destino_unidade: destino_unidade || '',
      destino_transportadora: destino_transportadora || '',
      destino_endereco: destino_endereco || '',
    });

    return Response.json({ sucesso: true, pedido });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});