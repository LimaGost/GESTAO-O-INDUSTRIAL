import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SMCLICK_API_KEY   = Deno.env.get('SMCLICK_API_KEY');
const SMCLICK_INSTANCE  = Deno.env.get('SMCLICK_INSTANCE_ID');

const ETAPA_LABELS = {
  em_producao:  'Em Produção 🏭',
  produzido:    'Produzido ✅',
  em_embalagem: 'Em Embalagem 📦',
  finalizado:   'Finalizado 🎉',
};

const DEFAULT_MSG_INTERNO = `📋 *Atualização de Produção*\n\nOP: *{op}*\nProduto: {produto}\nEtapa: *{etapa}*\nCliente: {cliente}\nQuantidade: {qtd}`;
const DEFAULT_MSG_CLIENTE = `Olá! Seu pedido está sendo processado.\n\nProduto: *{produto}*\nStatus atual: *{etapa}*\n\nObrigado pela preferência! 🙏`;

function renderMensagem(template, vars) {
  return template
    .replace(/{op}/g, vars.op || '')
    .replace(/{produto}/g, vars.produto || '')
    .replace(/{etapa}/g, vars.etapa || '')
    .replace(/{cliente}/g, vars.cliente || '')
    .replace(/{qtd}/g, vars.qtd || '');
}

// Normaliza para o formato da SMClick: 55 + DDD + 9 + número.
// Aceita tanto "61 9 9999-9999" (sem 55) quanto "55 61 9 9999-9999".
function normalizarTelefone(telefone) {
  let d = String(telefone || '').replace(/\D/g, '');
  if (!d) return '';
  // Já inclui código de país (13 dígitos começando com 55)
  if (d.length === 13 && d.startsWith('55')) return d;
  // Sem código de país: DDD(2) + 9 + 8 = 11, ou DDD(2) + 8 = 10
  if (d.length === 11 || d.length === 10) return '55' + d;
  // Outros tamanhos: devolve como está (já pode estar correto)
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
  const body = await res.text();
  console.log(`SMClick response [${res.status}]:`, body);
  return res.ok;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const {
      ordem,
      novoStatus,
      clienteNome,
      clienteTelefone,
      numeros_internos = [],
      msg_interno,
      msg_cliente,
    } = await req.json();

    const etapaLabel = ETAPA_LABELS[novoStatus] || novoStatus;

    const vars = {
      op: ordem.numero,
      produto: ordem.produto_nome,
      etapa: etapaLabel,
      cliente: clienteNome || '',
      qtd: String(ordem.quantidade || ''),
    };

    const resultados = [];

    // Mensagem para cada número interno ativo
    const template_interno = msg_interno || DEFAULT_MSG_INTERNO;
    const msgInterna = renderMensagem(template_interno, vars);
    for (const n of numeros_internos) {
      if (!n.ativo || !n.telefone) continue;
      const ok = await enviarMensagem(n.telefone, msgInterna);
      resultados.push({ destino: `interno:${n.nome}`, ok });
    }

    // Mensagem para o cliente (se tiver telefone)
    if (clienteTelefone) {
      const template = msg_cliente || DEFAULT_MSG_CLIENTE;
      const msgCliente = renderMensagem(template, vars);
      const ok = await enviarMensagem(clienteTelefone, msgCliente);
      resultados.push({ destino: 'cliente', ok });
    }

    return Response.json({ ok: true, resultados });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});