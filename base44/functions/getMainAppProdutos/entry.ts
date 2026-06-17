import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const produtos = await base44.asServiceRole.entities.Produto.list();
    const ativos = produtos.filter(p => p.ativo !== false);
    return Response.json({ produtos: ativos });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});