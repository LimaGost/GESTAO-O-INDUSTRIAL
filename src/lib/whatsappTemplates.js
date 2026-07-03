// Biblioteca de templates prontos de WhatsApp por situação
// Variáveis disponíveis:
//   Kanban: {op} {produto} {etapa} {cliente} {qtd}
//   Expedição: {nf} {cliente} {pedido} {etapa}

export const TEMPLATES_KANBAN = {
  produzido: {
    interno: '✅ *OP {op}*\n\nProduto: {produto}\nEtapa: *PRODUZIDO* ✅\nCliente: {cliente}\nQuantidade: {qtd}\n\nA OP foi concluída e está pronta para embalagem.',
    cliente: 'Olá, {cliente}! 👋\n\nSeu pedido está sendo produzido com todo cuidado.\n\nProduto: *{produto}*\nQuantidade: *{qtd}*\nStatus atual: *Produzido* ✅\n\nEm breve avançará para a próxima etapa. Obrigado pela preferência! 🙏',
  },
  em_embalagem: {
    interno: '📦 *OP {op}*\n\nProduto: {produto}\nEtapa: *EM EMBALAGEM* 📦\nCliente: {cliente}\nQuantidade: {qtd}\n\nA OP está sendo embalada.',
    cliente: 'Olá, {cliente}! 👋\n\nBoas notícias! Seu produto *{produto}* já foi fabricado e agora está sendo embalado com todo carinho 📦.\n\nEm breve estará pronto para envio. Obrigado pela preferência! 🙏',
  },
  finalizado: {
    interno: '🎉 *OP {op}*\n\nProduto: {produto}\nEtapa: *FINALIZADA* 🎉\nCliente: {cliente}\nQuantidade: {qtd}\n\nA OP está concluída e pronta para separação/expedição.',
    cliente: 'Olá, {cliente}! 👋\n\nSeu pedido foi finalizado 🎉\n\nProduto: *{produto}*\nQuantidade: *{qtd}*\nStatus: *Pronto para envio* ✅\n\nEm breve sua encomenda sairá para entrega. Obrigado pela preferência! 🙏',
  },
};

export const TEMPLATES_EXPEDICAO = {
  nf_emitida: {
    interno: '📄 *NF Emitida*\n\nNF: *{nf}*\nCliente: {cliente}\nPedido: #{pedido}\nStatus: *NF Emitida* 📄\n\nA nota fiscal foi emitida e aguarda envio.',
    cliente: 'Olá, {cliente}! 👋\n\nSua Nota Fiscal foi emitida 📄\n\nNF: *{nf}*\nPedido: *#{pedido}*\n\nSeu pedido está sendo preparado para envio. Avisaremos quando sair para entrega! 🙏',
  },
  enviada: {
    interno: '🚚 *Em Trânsito*\n\nNF: *{nf}*\nCliente: {cliente}\nPedido: #{pedido}\nStatus: *Saiu para entrega* 🚚\n\nA mercadoria está a caminho do destinatário.',
    cliente: 'Olá, {cliente}! 👋\n\nSeu pedido *#{pedido}* saiu para entrega 🚚\n\nNF: *{nf}*\nStatus: *Em trânsito*\n\nA mercadoria está a caminho! Em breve será entregue. 🙏',
  },
  entregue: {
    interno: '✅ *Entregue*\n\nNF: *{nf}*\nCliente: {cliente}\nPedido: #{pedido}\nStatus: *Entregue* ✅\n\nA mercadoria foi entregue ao destinatário.',
    cliente: 'Olá, {cliente}! 👋\n\nSeu pedido *#{pedido}* foi entregue ✅\n\nNF: *{nf}*\nEsperamos que tudo esteja perfeito!\n\nSe precisar de algo, estamos à disposição. Obrigado pela preferência! 🙏',
  },
};

// Dados de exemplo para preview dos templates
export const EXEMPLO_KANBAN = {
  op: 'OP-0023',
  produto: 'Vela Aromática Lavanda 200ml',
  cliente: 'Maria Silva',
  qtd: '50',
  etapa: 'Produzido ✅',
};

export const EXEMPLO_EXPEDICAO = {
  nf: 'NF-1042',
  cliente: 'Maria Silva',
  pedido: 'PED-0158',
  etapa: 'Em Trânsito 🚚',
};

export function renderMensagemKanban(template, etapa) {
  const etapaLabels = {
    produzido: 'Produzido ✅',
    em_embalagem: 'Em Embalagem 📦',
    finalizado: 'Finalizado 🎉',
  };
  return template
    .replace(/{op}/g, EXEMPLO_KANBAN.op)
    .replace(/{produto}/g, EXEMPLO_KANBAN.produto)
    .replace(/{cliente}/g, EXEMPLO_KANBAN.cliente)
    .replace(/{qtd}/g, EXEMPLO_KANBAN.qtd)
    .replace(/{etapa}/g, etapaLabels[etapa] || etapa);
}

export function renderMensagemExpedicao(template, etapa) {
  const etapaLabels = {
    nf_emitida: 'NF Emitida 📄',
    enviada: 'Em Trânsito 🚚',
    entregue: 'Entregue ✅',
  };
  return template
    .replace(/{nf}/g, EXEMPLO_EXPEDICAO.nf)
    .replace(/{cliente}/g, EXEMPLO_EXPEDICAO.cliente)
    .replace(/{pedido}/g, EXEMPLO_EXPEDICAO.pedido)
    .replace(/{etapa}/g, etapaLabels[etapa] || etapa);
}