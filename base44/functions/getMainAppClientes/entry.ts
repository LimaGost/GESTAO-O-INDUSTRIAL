import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const clientes = await base44.asServiceRole.entities.Cliente.list();
    const ativos = clientes.filter(c => c.ativo !== false);
    return Response.json({ clientes: ativos });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});