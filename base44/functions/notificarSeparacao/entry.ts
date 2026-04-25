import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { event, data } = payload;

    // Só processa se o status da OP for 'em_separacao'
    if (data?.status !== 'em_separacao') {
      return Response.json({ ok: true, skipped: true });
    }

    const opNumero = data.numero || data.id;
    const produtoNome = data.produto_nome || 'produto';
    const quantidade = data.itens?.length > 0
      ? data.itens.reduce((s, i) => s + (i.quantidade || 0), 0)
      : (data.quantidade || 0);

    const pedidoInfo = data.pedido_numero ? ` · Pedido #${data.pedido_numero}` : '';

    await base44.asServiceRole.entities.Notificacao.create({
      titulo: `📦 OP ${opNumero} pronta para separação!`,
      descricao: `${produtoNome} — ${quantidade} un${pedidoInfo}. Prepare a expedição.`,
      tipo: 'producao',
      lida: false,
      link: '/Expedicao',
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});