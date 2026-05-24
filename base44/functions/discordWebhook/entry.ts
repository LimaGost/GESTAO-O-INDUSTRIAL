import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { verify } from 'npm:discord-verify/node';

Deno.serve(async (req) => {
  const botToken = Deno.env.get('DISCORD_BOT_TOKEN');
  const publicKey = Deno.env.get('DISCORD_PUBLIC_KEY');

  const body = await req.text();

  // Verificação de assinatura do Discord (obrigatória)
  if (publicKey) {
    const signature = req.headers.get('x-signature-ed25519');
    const timestamp = req.headers.get('x-signature-timestamp');
    if (!signature || !timestamp) {
      return new Response('Unauthorized', { status: 401 });
    }
    const isValid = await verify(body, signature, timestamp, publicKey, crypto.subtle);
    if (!isValid) return new Response('Unauthorized', { status: 401 });
  }

  const interaction = JSON.parse(body);

  // Discord ACK de verificação
  if (interaction.type === 1) {
    return Response.json({ type: 1 });
  }

  // Evento de mensagem nova em thread (tipo MESSAGE_CREATE via bot gateway não é possível aqui)
  // Tratamos slash commands do tipo /responder
  if (interaction.type === 2) {
    const commandName = interaction.data?.name;

    if (commandName === 'responder') {
      const options = interaction.data?.options || [];
      const ticketId = options.find(o => o.name === 'ticket_id')?.value;
      const mensagem = options.find(o => o.name === 'mensagem')?.value;
      const respondidoPor = interaction.member?.user?.username || interaction.user?.username || 'Equipe';

      if (!ticketId || !mensagem) {
        return Response.json({ type: 4, data: { content: '❌ Informe o ticket_id e a mensagem.', flags: 64 } });
      }

      try {
        const base44 = createClientFromRequest(req);
        await base44.asServiceRole.entities.TicketSuporte.update(ticketId, {
          resposta: mensagem,
          respondido_por: respondidoPor,
          data_resposta: new Date().toISOString(),
          status: 'respondido',
        });

        // Notifica na thread do Discord se disponível
        if (botToken) {
          const tickets = await base44.asServiceRole.entities.TicketSuporte.list();
          const ticket = tickets.find(t => t.id === ticketId);
          if (ticket?.discord_thread_id) {
            await fetch(`https://discord.com/api/v10/channels/${ticket.discord_thread_id}/messages`, {
              method: 'POST',
              headers: { 'Authorization': `Bot ${botToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                content: `✅ **Resposta enviada ao usuário por ${respondidoPor}:**\n\n${mensagem}`,
              }),
            });
          }
        }

        return Response.json({
          type: 4,
          data: { content: `✅ Ticket \`${ticketId}\` respondido com sucesso! O usuário verá a resposta no sistema.`, flags: 64 },
        });
      } catch (err) {
        return Response.json({ type: 4, data: { content: `❌ Erro: ${err.message}`, flags: 64 } });
      }
    }
  }

  return Response.json({ type: 1 });
});