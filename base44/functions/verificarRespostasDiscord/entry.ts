import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const botToken = Deno.env.get('DISCORD_BOT_TOKEN');

    if (!botToken) {
      return Response.json({ error: 'DISCORD_BOT_TOKEN não configurado' }, { status: 500 });
    }

    // Busca todos os tickets com thread Discord que não estão fechados
    const tickets = await base44.asServiceRole.entities.TicketSuporte.list();
    const ticketsPendentes = tickets.filter(t =>
      t.status !== 'fechado' && t.discord_thread_id
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

        // Filtra mensagens humanas que ainda não estão no histórico
        const historicoMensagens = new Set(
          (ticket.historico_respostas || []).map(h => h.mensagem?.trim())
        );
        if (ticket.resposta) historicoMensagens.add(ticket.resposta.trim());

        // Verifica se alguma mensagem do Discord OU do histórico já existente contém o comando de fechar
        const mensagemFechamento = mensagens.find(m =>
          !m.author?.bot && m.content?.toLowerCase().includes('ticket fechado')
        );

        const fechamentoNoHistorico = !mensagemFechamento && (ticket.historico_respostas || []).find(h =>
          h.mensagem?.toLowerCase().includes('ticket fechado') && h.origem === 'discord'
        );

        if (mensagemFechamento || fechamentoNoHistorico) {
          const quemFechou = mensagemFechamento
            ? (mensagemFechamento.author?.username || 'Equipe')
            : (fechamentoNoHistorico.respondido_por || 'Equipe');
          const fechadoPor = quemFechou;
          const historicoAtual = ticket.historico_respostas || [];
          const jaTemEntradaFechamento = historicoAtual.some(h => h.mensagem === 'Ticket fechado via Discord');
          const agora = new Date().toISOString();
          const novoHistorico = jaTemEntradaFechamento
            ? historicoAtual
            : [...historicoAtual, { mensagem: 'Ticket fechado via Discord', respondido_por: fechadoPor, data: agora, origem: 'discord' }];

          await base44.asServiceRole.entities.TicketSuporte.update(ticket.id, {
            status: 'fechado',
            historico_respostas: novoHistorico,
          });
          // Notifica o usuário
          if (ticket.created_by_id) {
            await base44.asServiceRole.entities.Notificacao.create({
              titulo: `Seu ticket foi fechado: ${ticket.titulo}`,
              descricao: `Encerrado por ${fechadoPor} via Discord`,
              tipo: 'suporte',
              lida: false,
              link: '/Suporte',
              usuario_id: ticket.created_by_id,
            });
          }
          // Confirma no Discord (apenas se ainda não foi confirmado)
          if (!jaTemEntradaFechamento) {
            await fetch(`https://discord.com/api/v10/channels/${ticket.discord_thread_id}/messages`, {
              method: 'POST',
              headers: { 'Authorization': `Bot ${botToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ content: `✅ **Ticket fechado com sucesso por ${fechadoPor}. Esta thread foi encerrada.**` }),
            });
          }
          atualizados++;
          continue;
        }

        const respostasHumanas = mensagens.filter(m => {
          if (m.author?.bot) return false;
          if (!m.content?.trim()) return false;
          // Ignora se já está registrada no histórico ou como resposta principal
          if (historicoMensagens.has(m.content.trim())) return false;
          return true;
        });

        if (respostasHumanas.length === 0) continue;

        // Pega a mais recente resposta humana
        const ultimaResposta = respostasHumanas.sort(
          (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
        )[0];

        const respondidoPor = ultimaResposta.author?.username || 'Equipe';
        const mensagemResposta = ultimaResposta.content;

        if (!mensagemResposta?.trim()) continue;

        // Acumula no histórico sem sobrescrever a resposta anterior
        const historicoAtual = ticket.historico_respostas || [];
        const novaEntrada = {
          mensagem: mensagemResposta,
          respondido_por: respondidoPor,
          data: new Date(ultimaResposta.timestamp).toISOString(),
          origem: 'discord',
        };

        const atualizacao = {
          historico_respostas: [...historicoAtual, novaEntrada],
          status: 'respondido',
        };

        // Só preenche resposta/respondido_por se ainda não houver
        if (!ticket.resposta) {
          atualizacao.resposta = mensagemResposta;
          atualizacao.respondido_por = respondidoPor;
          atualizacao.data_resposta = new Date(ultimaResposta.timestamp).toISOString();
        }

        await base44.asServiceRole.entities.TicketSuporte.update(ticket.id, atualizacao);

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