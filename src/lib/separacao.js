/**
 * Utilitários para criação de Separações a partir de OPs, Pedidos e Grupos.
 */
import { base44 } from '@/api/base44Client';
import { gerarNumero } from './numeracao';

function calcularTotais(itens) {
  const quantidade_total = itens.reduce((s, i) => s + (i.quantidade || 0), 0);
  return { quantidade_itens: itens.length, quantidade_total };
}

export async function criarSeparacaoFromOP(ordem, statusInicial = 'aguardando_separacao') {
  // A Separação Indústria é só para pedidos de clientes — OPs criadas manualmente
  // no Kanban de Produção (sem pedido_id) não devem gerar card aqui.
  if (!ordem.pedido_id) return null;

  let pedido = null;
  try {
    const peds = await base44.entities.Pedido.filter({ id: ordem.pedido_id });
    pedido = peds[0] || null;
  } catch {}
  const itens = (ordem.itens && ordem.itens.length > 0)
    ? ordem.itens.map(i => ({ produto_id: i.produto_id, produto_nome: i.produto_nome, quantidade: i.quantidade }))
    : (ordem.produto_id ? [{ produto_id: ordem.produto_id, produto_nome: ordem.produto_nome, quantidade: ordem.quantidade }] : []);
  return base44.entities.Separacao.create({
    numero: gerarNumero('SEP'),
    origem: 'ordem_producao',
    pedido_id: ordem.pedido_id || null,
    pedido_numero: ordem.pedido_numero || null,
    ordem_producao_id: ordem.id,
    ordem_producao_numero: ordem.numero,
    cliente_id: pedido?.cliente_id || null,
    cliente_nome: pedido?.cliente_nome || null,
    white_label: pedido?.white_label || false,
    white_label_marca: pedido?.white_label_marca || null,
    itens,
    ...calcularTotais(itens),
    destino_tipo: pedido?.destino_tipo || null,
    destino_transportadora: pedido?.destino_transportadora || null,
    destino_unidade: pedido?.destino_unidade || null,
    destino_endereco: pedido?.destino_endereco || null,
    data_prevista: pedido?.data_entrega_prevista || null,
    prioridade: 'normal',
    status: statusInicial,
  });
}

export async function criarSeparacaoFromPedido(pedido, statusInicial = 'aguardando_separacao') {
  const itens = (pedido.itens || []).map(i => ({
    produto_id: i.produto_id || null,
    produto_nome: i.produto_nome || i.nome || '',
    quantidade: i.quantidade || 0,
  }));
  return base44.entities.Separacao.create({
    numero: gerarNumero('SEP'),
    origem: 'pedido',
    pedido_id: pedido.id,
    pedido_numero: pedido.numero,
    cliente_id: pedido.cliente_id || null,
    cliente_nome: pedido.cliente_nome,
    white_label: pedido.white_label || false,
    white_label_marca: pedido.white_label_marca || null,
    itens,
    ...calcularTotais(itens),
    estoque_ja_reservado: true, // estoque é baixado na criação do pedido
    destino_tipo: pedido.destino_tipo || null,
    destino_transportadora: pedido.destino_transportadora || null,
    destino_unidade: pedido.destino_unidade || null,
    destino_endereco: pedido.destino_endereco || null,
    data_prevista: pedido.data_entrega_prevista || null,
    prioridade: 'normal',
    status: statusInicial,
  });
}

export async function criarSeparacaoFromGrupo(grupo, pedidos, statusInicial = 'aguardando_separacao') {
  const itensConsolidados = {};
  for (const ped of pedidos) {
    for (const item of (ped.itens || [])) {
      const key = item.produto_id || item.produto_nome;
      if (!itensConsolidados[key]) {
        itensConsolidados[key] = { produto_id: item.produto_id || null, produto_nome: item.produto_nome || '', quantidade: 0 };
      }
      itensConsolidados[key].quantidade += item.quantidade || 0;
    }
  }
  const itens = Object.values(itensConsolidados);
  const primeiro = pedidos[0] || {};
  return base44.entities.Separacao.create({
    numero: gerarNumero('SEP'),
    origem: 'grupo',
    grupo_id: grupo.id,
    grupo_cliente_nome: grupo.cliente_nome,
    pedido_id: null,
    pedido_numero: (grupo.pedidos_numeros || []).map(n => `#${n}`).join(' · '),
    cliente_id: grupo.cliente_id || primeiro.cliente_id || null,
    cliente_nome: grupo.cliente_nome,
    white_label: primeiro.white_label || false,
    white_label_marca: primeiro.white_label_marca || null,
    itens,
    ...calcularTotais(itens),
    estoque_ja_reservado: true, // estoque é baixado na criação dos pedidos do grupo
    destino_tipo: primeiro.destino_tipo || null,
    destino_transportadora: primeiro.destino_transportadora || null,
    destino_unidade: primeiro.destino_unidade || null,
    destino_endereco: primeiro.destino_endereco || null,
    data_prevista: primeiro.data_entrega_prevista || null,
    prioridade: 'normal',
    status: statusInicial,
  });
}