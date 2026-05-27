import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { ticket_id, resposta } = await req.json();
    if (!ticket_id || !resposta?.trim()) {
      return Response.json({ error: 'ticket_id e resposta são obrigatórios' }, { status: 400 });
    }

    const botToken = Deno.env.get('DISCORD_BOT_TOKEN');
    const respondidoPor = user.full_name || user.email || 'Admin';
    const agora = new Date().toISOString();

    // Atualiza o ticket no sistema
    await base44.asServiceRole.entities.TicketSuporte.update(ticket_id, {
      resposta,
      status: 'respondido',
      respondido_por: respondidoPor,
      data_resposta: agora,
    });

    // Envia a resposta na thread do Discord
    if (botToken) {
      const tickets = await base44.asServiceRole.entities.TicketSuporte.list();
      const ticket = tickets.find(t => t.id === ticket_id);
      if (ticket?.discord_thread_id) {
        await fetch(`https://discord.com/api/v10/channels/${ticket.discord_thread_id}/messages`, {
          method: 'POST',
          headers: { 'Authorization': `Bot ${botToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: `✅ **Resposta enviada ao usuário por ${respondidoPor}:**\n\n${resposta}`,
          }),
        });
      }
    }

    return Response.json({ success: true, respondido_por: respondidoPor });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});