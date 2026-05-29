import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { ticket_id } = await req.json();
    if (!ticket_id) return Response.json({ error: 'ticket_id é obrigatório' }, { status: 400 });

    const botToken = Deno.env.get('DISCORD_BOT_TOKEN');
    const canceladoPor = user.full_name || user.email || 'Admin';
    const agora = new Date().toISOString();

    const tickets = await base44.asServiceRole.entities.TicketSuporte.list();
    const ticket = tickets.find(t => t.id === ticket_id);
    if (!ticket) return Response.json({ error: 'Ticket não encontrado' }, { status: 404 });

    const historicoAtual = ticket.historico_respostas || [];
    const novaEntrada = {
      mensagem: `Ticket cancelado por ${canceladoPor}`,
      respondido_por: canceladoPor,
      data: agora,
      origem: 'sistema',
    };

    await base44.asServiceRole.entities.TicketSuporte.update(ticket_id, {
      status: 'cancelado',
      historico_respostas: [...historicoAtual, novaEntrada],
    });

    // Notifica o usuário
    if (ticket.created_by_id) {
      await base44.asServiceRole.entities.Notificacao.create({
        titulo: `Seu ticket foi cancelado: ${ticket.titulo}`,
        descricao: `Cancelado por ${canceladoPor}`,
        tipo: 'suporte',
        lida: false,
        link: '/Suporte',
        usuario_id: ticket.created_by_id,
      });
    }

    // Posta no Discord
    if (botToken && ticket.discord_thread_id) {
      await fetch(`https://discord.com/api/v10/channels/${ticket.discord_thread_id}/messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bot ${botToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `❌ **Ticket cancelado por ${canceladoPor}**\n\nEste ticket foi encerrado sem resolução.`,
        }),
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});