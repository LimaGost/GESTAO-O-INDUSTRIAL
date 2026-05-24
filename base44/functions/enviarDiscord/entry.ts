import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const TIPO_COLORS = {
  suporte:    0xED4245,
  melhoria:   0x5865F2,
  bug:        0xFEE75C,
  elogio:     0x57F287,
  outro:      0x95A5A6,
};

const TIPO_EMOJIS = {
  suporte:  '🆘',
  melhoria: '💡',
  bug:      '🐛',
  elogio:   '⭐',
  outro:    '📌',
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { tipo, titulo, descricao, prioridade } = await req.json();
    if (!titulo || !descricao || !tipo) {
      return Response.json({ error: 'Campos obrigatórios: tipo, titulo, descricao' }, { status: 400 });
    }

    // Criar ticket no banco
    const ticket = await base44.entities.TicketSuporte.create({
      tipo,
      titulo,
      descricao,
      prioridade: prioridade || 'media',
      status: 'aberto',
      usuario_nome: user.full_name || user.email,
      usuario_email: user.email,
    });

    // Enviar para Discord
    const webhookUrl = Deno.env.get('DISCORD_WEBHOOK_URL');
    if (webhookUrl) {
      const emoji = TIPO_EMOJIS[tipo] || '📌';
      const color = TIPO_COLORS[tipo] || 0x95A5A6;
      const prioridadeLabel = prioridade === 'alta' ? '🔴 Alta' : prioridade === 'media' ? '🟡 Média' : '🟢 Baixa';
      const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

      const payload = {
        embeds: [{
          author: {
            name: `${user.full_name || user.email}  •  ${user.email}`,
            icon_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || user.email)}&background=C9A227&color=fff&size=64`,
          },
          title: `${emoji}  ${titulo}`,
          description: `\`\`\`\n${descricao}\n\`\`\``,
          color,
          fields: [
            { name: '🏷️ Tipo',       value: tipo.charAt(0).toUpperCase() + tipo.slice(1), inline: true },
            { name: '⚡ Prioridade',  value: prioridadeLabel,                               inline: true },
            { name: '🎫 Ticket ID',   value: ticket.id,                                     inline: true },
            { name: '🕐 Data/Hora',   value: agora,                                         inline: false },
          ],
          footer: { text: 'Raio do Sol — Sistema de Gestão Industrial' },
          timestamp: new Date().toISOString(),
        }]
      };

      // Envia via webhook com ?wait=true para obter o ID da mensagem
      const discordRes = await fetch(webhookUrl + '?wait=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (discordRes.ok) {
        const msg = await discordRes.json();
        const updates = { discord_message_id: msg.id };

        // Cria uma thread no canal para facilitar respostas da equipe
        const botToken = Deno.env.get('DISCORD_BOT_TOKEN');
        if (botToken && msg.channel_id) {
          const threadRes = await fetch(`https://discord.com/api/v10/channels/${msg.channel_id}/messages/${msg.id}/threads`, {
            method: 'POST',
            headers: {
              'Authorization': `Bot ${botToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: `Ticket: ${titulo.slice(0, 90)}`,
              auto_archive_duration: 1440,
            }),
          });
          if (threadRes.ok) {
            const thread = await threadRes.json();
            updates.discord_thread_id = thread.id;
            // Envia mensagem de boas-vindas na thread com o ID do ticket
            await fetch(`https://discord.com/api/v10/channels/${thread.id}/messages`, {
              method: 'POST',
              headers: {
                'Authorization': `Bot ${botToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                content: `🎫 **Ticket ID:** \`${ticket.id}\`\n📧 **Usuário:** ${user.email}\n\nResponda nesta thread. A resposta será enviada automaticamente para o usuário no sistema.`,
              }),
            });
          }
        }

        await base44.asServiceRole.entities.TicketSuporte.update(ticket.id, updates);
      }
    }

    return Response.json({ ok: true, ticket_id: ticket.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});