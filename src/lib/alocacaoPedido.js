/**
 * Alocação inteligente de estoque para pedidos.
 *
 * - Estoque total  → reserva e envia direto ao Kanban de Separação.
 * - Estoque parcial → reserva o disponível (Separação em "Aguardando Produção")
 *                     e cria OP para o restante. Ao concluir a produção,
 *                     as quantidades são mescladas e a Separação liberada.
 */
import { base44 } from '@/api/base44Client';
import { gerarNumero } from './numeracao';
import { registrarLog } from './audit';

/**
 * Processa a alocação de um pedido já criado: reserva estoque,
 * cria a Separação e a OP (se necessário) e atualiza o status do pedido.
 * Retorna { status, precisaProducao, separacao, ordem }.
 */
export async function alocarPedido({ pedido, itens, produtos, origem = 'pedido' }) {
  const numero = pedido.numero;
  const itensParaReserva = [];
  const itensSemEstoque = [];

  for (const item of itens) {
    if (!item.produto_id || (item.quantidade || 0) <= 0) continue;
    const p = produtos.find(pr => pr.id === item.produto_id);
    if (!p) continue;
    // White Label / Sem Rótulo: não temos esses itens no estoque da indústria —
    // vão integralmente para produção, sem reserva de estoque.
    if (pedido.white_label || pedido.sem_rotulo || item.sem_rotulo) {
      itensSemEstoque.push({ ...item, produto: p, quantidadeFalta: item.quantidade });
      continue;
    }
    const disponivel = p.estoque_atual || 0;
    const qtdReservar = Math.min(disponivel, item.quantidade);
    const qtdFalta = item.quantidade - qtdReservar;
    if (qtdReservar > 0) itensParaReserva.push({ ...item, produto: p, qtdReservar });
    if (qtdFalta > 0) itensSemEstoque.push({ ...item, produto: p, quantidadeFalta: qtdFalta });
  }

  const precisaProducao = itensSemEstoque.length > 0;
  const status = precisaProducao ? 'aguardando_estoque' : 'separacao';
  const qtdReservadaTotal = itensParaReserva.reduce((s, i) => s + i.qtdReservar, 0);
  const qtdPendenteTotal = itensSemEstoque.reduce((s, i) => s + i.quantidadeFalta, 0);
  const qtdPedidoTotal = itens.reduce((s, i) => s + (i.quantidade || 0), 0);

  // 1. Reserva (baixa) o estoque disponível imediatamente
  for (const item of itensParaReserva) {
    await base44.entities.Produto.update(item.produto_id, {
      estoque_atual: (item.produto.estoque_atual || 0) - item.qtdReservar,
    });
    await registrarLog('Produto', item.produto_id, 'RESERVA_ESTOQUE',
      `Reserva de ${item.qtdReservar} un para pedido ${numero}`);
  }

  // 2. Cria a Separação automaticamente (com o que está reservado)
  let separacao = null;
  const semRotuloPedido = !!(pedido.sem_rotulo || itens.some(i => i.sem_rotulo));
  const itensSep = itensParaReserva.map(i => ({
    produto_id: i.produto_id,
    produto_nome: i.produto_nome,
    quantidade: i.qtdReservar,
    sem_rotulo: !!(pedido.sem_rotulo || i.sem_rotulo),
  }));
  if (itensSep.length > 0) {
    separacao = await base44.entities.Separacao.create({
      numero: gerarNumero('SEP'),
      origem: 'pedido',
      pedido_id: pedido.id,
      pedido_numero: numero,
      pedido_criado_por_id: pedido.created_by_id || null,
      cliente_id: pedido.cliente_id || null,
      cliente_nome: pedido.cliente_nome,
      white_label: pedido.white_label || false,
      white_label_marca: pedido.white_label_marca || null,
      sem_rotulo: semRotuloPedido,
      itens: itensSep,
      quantidade_itens: itensSep.length,
      quantidade_total: qtdReservadaTotal,
      quantidade_pendente_producao: precisaProducao ? qtdPendenteTotal : 0,
      estoque_ja_reservado: true,
      destino_tipo: pedido.destino_tipo || null,
      destino_transportadora: pedido.destino_transportadora || null,
      destino_unidade: pedido.destino_unidade || null,
      destino_endereco: pedido.destino_endereco || null,
      data_prevista: pedido.data_entrega_prevista || null,
      prioridade: 'normal',
      status: precisaProducao ? 'aguardando_producao' : 'aguardando_separacao',
    });
    await registrarLog('Separacao', separacao.id, 'CRIACAO_AUTOMATICA',
      precisaProducao
        ? `Separação ${separacao.numero} criada com ${qtdReservadaTotal} un reservadas — aguardando produção de ${qtdPendenteTotal} un (pedido ${numero})`
        : `Separação ${separacao.numero} criada — estoque total disponível para o pedido ${numero}`);
  }

  // 3. Cria a OP para a quantidade pendente
  let ordem = null;
  if (precisaProducao) {
    const itensParaProducao = itensSemEstoque.map(i => ({
      produto_id: i.produto_id,
      produto_nome: i.produto_nome,
      quantidade: i.quantidadeFalta,
      disponivel: false,
      sem_rotulo: !!(pedido.sem_rotulo || i.sem_rotulo),
    }));
    ordem = await base44.entities.OrdemProducao.create({
      numero: gerarNumero('OP'),
      produto_nome: `${pedido.cliente_nome} • ${numero}`,
      quantidade: qtdPendenteTotal,
      itens: itensParaProducao,
      status: 'a_produzir',
      pedido_id: pedido.id,
      pedido_numero: numero,
      pedido_criado_por_id: pedido.created_by_id || null,
      cliente_nome: pedido.cliente_nome || null,
      sem_rotulo: semRotuloPedido,
      origem,
      observacoes: pedido.observacoes || '',
      quantidade_pedido_total: qtdPedidoTotal,
      quantidade_reservada_estoque: qtdReservadaTotal,
      separacao_id: separacao?.id || null,
    });
    await registrarLog('OrdemProducao', ordem.id, 'CRIACAO_AUTOMATICA',
      `OP para pedido ${numero} — ${itensSemEstoque.length} item(ns) p/ produção (${qtdReservadaTotal} un já reservadas em estoque)`);
  }

  // 4. Atualiza o pedido
  await base44.entities.Pedido.update(pedido.id, {
    status,
    ordens_producao_ids: ordem ? [ordem.id] : [],
  });

  return { status, precisaProducao, separacao, ordem };
}

/**
 * Chamada quando a produção de uma OP vinculada a um pedido é concluída.
 * Mescla as quantidades produzidas na Separação que aguardava produção
 * e libera o card ("Pronto para Separação"). Retorna true se mesclou.
 */
export async function concluirProducaoParaSeparacao(ordem) {
  if (!ordem.pedido_id) return false;
  const seps = await base44.entities.Separacao.filter({
    pedido_id: ordem.pedido_id,
    status: 'aguardando_producao',
  }).catch(() => []);
  const sep = ordem.separacao_id
    ? (seps.find(s => s.id === ordem.separacao_id) || seps[0])
    : seps[0];
  if (!sep) return false;

  // Une as quantidades produzidas às já reservadas
  const itensMap = {};
  for (const i of (sep.itens || [])) {
    itensMap[i.produto_id || i.produto_nome] = { ...i };
  }
  const itensOP = (ordem.itens && ordem.itens.length > 0)
    ? ordem.itens
    : (ordem.produto_id ? [{ produto_id: ordem.produto_id, produto_nome: ordem.produto_nome, quantidade: ordem.quantidade }] : []);
  for (const i of itensOP) {
    const k = i.produto_id || i.produto_nome;
    if (itensMap[k]) itensMap[k].quantidade = (itensMap[k].quantidade || 0) + (i.quantidade || 0);
    else itensMap[k] = { produto_id: i.produto_id || null, produto_nome: i.produto_nome, quantidade: i.quantidade || 0 };
  }
  const itens = Object.values(itensMap);

  await base44.entities.Separacao.update(sep.id, {
    itens,
    quantidade_itens: itens.length,
    quantidade_total: itens.reduce((s, i) => s + (i.quantidade || 0), 0),
    quantidade_pendente_producao: 0,
    producao_concluida: true,
    status: 'aguardando_separacao',
  });
  await registrarLog('Separacao', sep.id, 'PRODUCAO_CONCLUIDA',
    `Produção da OP ${ordem.numero} concluída — separação ${sep.numero} completa e pronta para separação`);
  return true;
}