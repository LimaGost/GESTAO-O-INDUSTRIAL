import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const todos = await base44.asServiceRole.entities.User.list();
    const outros = todos
      .filter(u => u.id !== user.id)
      .map(u => ({ id: u.id, full_name: u.full_name, email: u.email, role: u.role, ultima_atividade: u.ultima_atividade || null }));

    return Response.json({ usuarios: outros });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});