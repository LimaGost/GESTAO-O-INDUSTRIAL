import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SMCLICK_API_KEY   = Deno.env.get('SMCLICK_API_KEY');
const SMCLICK_INSTANCE  = Deno.env.get('SMCLICK_INSTANCE_ID');
const NUMERO_INTERNO    = Deno.env.get('SMCLICK_NUMERO_INTERNO');

const ETAPA_LABELS = {
  em_producao:  'Em Produção 🏭',
  produzido:    'Produzido ✅',
  em_embalagem: 'Em Embalagem 📦',
  finalizado:   'Finalizado 🎉',
};

async function enviarMensagem(telefone, mensagem) {
  const telefoneFormatado = String(telefone).replace(/\D/g, '');
  const res = await fetch('https://api.smclick.com.br/instances/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-KEY': SMCLICK_API_KEY },
    body: JSON.stringify({
      instance: SMCLICK_INSTANCE,
      type: 'text',
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

    const { ordem, novoStatus, clienteNome, clienteTelefone } = await req.json();

    const etapaLabel = ETAPA_LABELS[novoStatus];
    if (!etapaLabel) {
      return Response.json({ ok: false, msg: 'Etapa não configurada para notificação' });
    }

    const resultados = [];

    // Mensagem para o número interno (sempre)
    if (NUMERO_INTERNO) {
      const msgInterna = `📋 *Atualização de Produção*\n\nOP: *${ordem.numero}*\nProduto: ${ordem.produto_nome}\nEtapa: *${etapaLabel}*${clienteNome ? `\nCliente: ${clienteNome}` : ''}\nQuantidade: ${ordem.quantidade || ''}`;
      const ok = await enviarMensagem(NUMERO_INTERNO, msgInterna);
      resultados.push({ destino: 'interno', ok });
    }

    // Mensagem para o cliente (se tiver telefone)
    if (clienteTelefone) {
      const msgCliente = `Olá! Seu pedido está sendo processado.\n\nProduto: *${ordem.produto_nome}*\nStatus atual: *${etapaLabel}*\n\nObrigado pela preferência! 🙏`;
      const ok = await enviarMensagem(clienteTelefone, msgCliente);
      resultados.push({ destino: 'cliente', ok });
    }

    return Response.json({ ok: true, resultados });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});