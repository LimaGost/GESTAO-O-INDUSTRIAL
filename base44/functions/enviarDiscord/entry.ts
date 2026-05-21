import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const TIPO_COLORS = {
  suporte:    0xED4245, // vermelho
  melhoria:   0x5865F2, // roxo
  bug:        0xFEE75C, // amarelo
  elogio:     0x57F287, // verde
  outro:      0x95A5A6, // cinza
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

    const webhookUrl = Deno.env.get('DISCORD_WEBHOOK_URL');
    if (!webhookUrl) return Response.json({ error: 'Webhook não configurado' }, { status: 500 });

    const emoji = TIPO_EMOJIS[tipo] || '📌';
    const color = TIPO_COLORS[tipo] || 0x95A5A6;
    const prioridadeLabel = prioridade === 'alta' ? '🔴 Alta' : prioridade === 'media' ? '🟡 Média' : '🟢 Baixa';
    const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    const payload = {
      embeds: [{
        title: `${emoji} ${titulo}`,
        description: descricao,
        color,
        fields: [
          { name: '👤 Usuário', value: user.full_name || user.email, inline: true },
          { name: '📧 Email', value: user.email, inline: true },
          { name: '🏷️ Tipo', value: tipo.charAt(0).toUpperCase() + tipo.slice(1), inline: true },
          { name: '⚡ Prioridade', value: prioridadeLabel, inline: true },
          { name: '🕐 Data/Hora', value: agora, inline: true },
        ],
        footer: { text: 'Raio do Sol — Sistema de Gestão Industrial' },
        timestamp: new Date().toISOString(),
      }]
    };

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      return Response.json({ error: `Discord error: ${text}` }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});