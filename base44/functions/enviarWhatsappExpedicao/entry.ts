import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SMCLICK_API_KEY  = Deno.env.get('SMCLICK_API_KEY');
const SMCLICK_INSTANCE = Deno.env.get('SMCLICK_INSTANCE_ID');

const STATUS_LABEL = {
  nf_emitida: 'NF Emitida 📄',
  enviada:    'Em Trânsito 🚚',
  entregue:   'Entregue ✅',
};

const DEFAULT_MSG_INTERNO = `🚚 *Atualização de Expedição*\n\nNF: *{nf}*\nCliente: {cliente}\nPedido: #{pedido}\nStatus: *{etapa}*`;
const DEFAULT_MSG_CLIENTE = `Olá, {cliente}! Atualização sobre seu pedido #{pedido}.\n\nStatus: *{etapa}*\n\nObrigado pela preferência! 🙏`;

function renderMensagem(template, vars) {
  return template
    .replace(/{nf}/g, vars.nf || '')
    .replace(/{cliente}/g, vars.cliente || '')
    .replace(/{pedido}/g, vars.pedido || '')
    .replace(/{etapa}/g, vars.etapa || '');
}

// Normaliza para o formato da SMClick: 55 + DDD + 9 + número.
// Aceita tanto "61 9 9999-9999" (sem 55) quanto "55 61 9 9999-9999".
function normalizarTelefone(telefone) {
  let d = String(telefone || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.length === 13 && d.startsWith('55')) return d;
  if (d.length === 11 || d.length === 10) return '55' + d;
  return d;
}

async function enviarMensagem(telefone, mensagem) {
  const telefoneFormatado = normalizarTelefone(telefone);
  const res = await fetch('https://api.smclick.com.br/instances/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-KEY': SMCLICK_API_KEY },
    body: JSON.stringify({
      instance: SMCLICK_INSTANCE,
      type: 'text',
      no_ticket: true,
      content: {
        telephone: telefoneFormatado,
        message: mensagem,
      },
    }),
  });
  return res.ok;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const {
      expedicao,
      novoStatus,
      clienteTelefone,
      numeros_internos = [],
      msg_interno,
      msg_cliente,
    } = await req.json();

    const etapaLabel = STATUS_LABEL[novoStatus] || novoStatus;
    const vars = {
      nf: expedicao.numero_nf || '',
      cliente: expedicao.cliente_nome || '',
      pedido: expedicao.pedido_numero || '',
      etapa: etapaLabel,
    };

    const resultados = [];

    // Mensagem para números internos ativos
    const msgInterna = renderMensagem(msg_interno || DEFAULT_MSG_INTERNO, vars);
    for (const n of numeros_internos) {
      if (!n.ativo || !n.telefone) continue;
      const ok = await enviarMensagem(n.telefone, msgInterna);
      resultados.push({ destino: 'interno', nome: n.nome, ok });
    }

    // Mensagem para o cliente
    if (clienteTelefone) {
      const msgCliente = renderMensagem(msg_cliente || DEFAULT_MSG_CLIENTE, vars);
      const ok = await enviarMensagem(clienteTelefone, msgCliente);
      resultados.push({ destino: 'cliente', ok });
    }

    return Response.json({ ok: true, resultados });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});