import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const INSTANCE_ID = Deno.env.get('SMCLICK_INSTANCE_ID');
const API_KEY = Deno.env.get('SMCLICK_API_KEY');

const STATUS_LABEL = {
  nf_emitida: '📄 NF Emitida',
  enviada:    '🚚 Em Trânsito',
  entregue:   '✅ Entregue',
};

function buildMsg(template, expedicao, statusLabel) {
  return template
    .replace(/{nf}/g, expedicao.numero_nf || '')
    .replace(/{cliente}/g, expedicao.cliente_nome || '')
    .replace(/{pedido}/g, expedicao.pedido_numero || '')
    .replace(/{etapa}/g, statusLabel);
}

async function enviarSMS(telefone, mensagem) {
  const tel = String(telefone).replace(/\D/g, '');
  const url = `https://smclick.com.br/api/v1/send-text?instanceid=${INSTANCE_ID}&apikey=${API_KEY}&phone=${tel}&message=${encodeURIComponent(mensagem)}`;
  const res = await fetch(url);
  return res.ok;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { expedicao, novoStatus, clienteTelefone, numeros_internos, msg_interno, msg_cliente } = await req.json();

    const statusLabel = STATUS_LABEL[novoStatus] || novoStatus;
    const resultados = [];

    // Enviar para números internos ativos
    for (const n of (numeros_internos || [])) {
      if (!n.ativo || !n.telefone) continue;
      const msg = buildMsg(msg_interno || '🚚 Expedição {nf} — {cliente} — {etapa}', expedicao, statusLabel);
      const ok = await enviarSMS(n.telefone, msg);
      resultados.push({ destino: 'interno', nome: n.nome, ok });
    }

    // Enviar para cliente (se fornecido)
    if (clienteTelefone) {
      const msg = buildMsg(msg_cliente || 'Olá {cliente}! Seu pedido #{pedido} está com status: {etapa}', expedicao, statusLabel);
      const ok = await enviarSMS(clienteTelefone, msg);
      resultados.push({ destino: 'cliente', ok });
    }

    return Response.json({ ok: true, resultados });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});