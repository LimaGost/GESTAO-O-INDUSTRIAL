import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const botToken = Deno.env.get('DISCORD_BOT_TOKEN');

    if (!botToken) {
      return Response.json({ error: 'DISCORD_BOT_TOKEN não configurado' }, { status: 500 });
    }

    // Busca tickets abertos ou em atendimento que têm thread no Discord
    const tickets = await base44.asServiceRole.entities.TicketSuporte.list();
    const ticketsPendentes = tickets.filter(t =>
      ['aberto', 'em_atendimento'].includes(t.status) && t.discord_thread_id
    );

    if (ticketsPendentes.length === 0) {
      return Response.json({ message: 'Nenhum ticket pendente com thread Discord', processados: 0 });
    }

    let atualizados = 0;

    for (const ticket of ticketsPendentes) {
      try {
        // Busca mensagens da thread no Discord
        const res = await fetch(
          `https://discord.com/api/v10/channels/${ticket.discord_thread_id}/messages?limit=20`,
          { headers: { 'Authorization': `Bot ${botToken}` } }
        );

        if (!res.ok) continue;

        const mensagens = await res.json();

        // Filtra mensagens que não são do bot (bot messages têm author.bot = true)
        // e que são mais recentes que a última resposta (ou criação do ticket)
        const dataReferencia = ticket.data_resposta
          ? new Date(ticket.data_resposta)
          : new Date(ticket.created_date || 0);

        const respostasHumanas = mensagens.filter(m => {
          if (m.author?.bot) return false; // Ignora mensagens de bots
          const dataMensagem = new Date(m.timestamp);
          return dataMensagem > dataReferencia;
        });

        if (respostasHumanas.length === 0) continue;

        // Pega a mais recente resposta humana
        const ultimaResposta = respostasHumanas.sort(
          (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
        )[0];

        const respondidoPor = ultimaResposta.author?.username || 'Equipe';
        const mensagemResposta = ultimaResposta.content;

        if (!mensagemResposta?.trim()) continue;

        // Atualiza o ticket no sistema
        await base44.asServiceRole.entities.TicketSuporte.update(ticket.id, {
          resposta: mensagemResposta,
          respondido_por: respondidoPor,
          data_resposta: new Date(ultimaResposta.timestamp).toISOString(),
          status: 'respondido',
        });

        // Confirma na thread que a resposta foi enviada ao usuário
        await fetch(
          `https://discord.com/api/v10/channels/${ticket.discord_thread_id}/messages`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bot ${botToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              content: `✅ **Resposta enviada ao usuário no sistema por ${respondidoPor}**`,
            }),
          }
        );

        atualizados++;
      } catch (err) {
        console.error(`Erro ao processar ticket ${ticket.id}:`, err.message);
      }
    }

    return Response.json({
      message: `Verificação concluída. ${atualizados} ticket(s) atualizado(s).`,
      processados: ticketsPendentes.length,
      atualizados,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});