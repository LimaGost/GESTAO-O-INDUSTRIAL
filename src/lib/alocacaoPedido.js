/**
 * Alocação inteligente de estoque para pedidos.
 *
 * - Estoque total  → reserva e envia direto ao Kanban de Separação (uma única Separação).
 * - Estoque parcial → nascem DUAS Separações-irmãs vinculadas entre si:
 *     - "Expressa": o que já está em estoque, corre livre desde já.
 *     - "Produção": o que falta, fica bloqueada em "Aguardando Produção" até a OP terminar.
 *   As duas seguem seus próprios caminhos até a coluna "Separado", onde se reencontram
 *   e se fundem automaticamente num card só (ver avancoSeparacao.js).
 */
import { base44 } from '@/api/base44Client';
import { gerarNumero } from './numeracao';
import { registrarLog } from './audit';

/**
 * Processa a alocação de um pedido já criado: reserva estoque,
 * cria a(s) Separação(ões) e a OP (se necessário) e atualiza o status do pedido.
 * Retorna { status, precisaProducao, separacao, separacaoProducao, ordem }.
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
  const temReserva = itensParaReserva.length > 0;
  const status = precisaProducao ? 'aguardando_estoque' : 'separacao';
  const qtdReservadaTotal = itensParaReserva.reduce((s, i) => s + i.qtdReservar, 0);
  const qtdPendenteTotal = itensSemEstoque.reduce((s, i) => s + i.quantidadeFalta, 0);
  const qtdPedidoTotal = itens.reduce((s, i) => s + (i.quantidade || 0), 0);
  const semRotuloPedido = !!(pedido.sem_rotulo || itens.some(i => i.sem_rotulo));

  // 1. Reserva (baixa) o estoque disponível imediatamente
  for (const item of itensParaReserva) {
    await base44.entities.Produto.update(item.produto_id, {
      estoque_atual: (item.produto.estoque_atual || 0) - item.qtdReservar,
    });
    await registrarLog('Produto', item.produto_id, 'RESERVA_ESTOQUE',
      `Reserva de ${item.qtdReservar} un para pedido ${numero}`);
  }

  const baseSeparacao = {
    origem: 'pedido',
    pedido_id: pedido.id,
    pedido_numero: numero,
    pedido_criado_por_id: pedido.created_by_id || null,
    cliente_id: pedido.cliente_id || null,
    cliente_nome: pedido.cliente_nome,
    white_label: pedido.white_label || false,
    white_label_marca: pedido.white_label_marca || null,
    sem_rotulo: semRotuloPedido,
    destino_tipo: pedido.destino_tipo || null,
    destino_transportadora: pedido.destino_transportadora || null,
    destino_unidade: pedido.destino_unidade || null,
    destino_endereco: pedido.destino_endereco || null,
    data_prevista: pedido.data_entrega_prevista || null,
    prioridade: 'normal',
  };

  // 2. Separação "Expressa" — o que já está em estoque
  let separacao = null;
  if (temReserva) {
    const itensSep = itensParaReserva.map(i => ({
      produto_id: i.produto_id,
      produto_nome: i.produto_nome,
      quantidade: i.qtdReservar,
      sem_rotulo: !!(pedido.sem_rotulo || i.sem_rotulo),
    }));
    separacao = await base44.entities.Separacao.create({
      ...baseSeparacao,
      numero: gerarNumero('SEP'),
      tipo_separacao: precisaProducao ? 'expressa' : 'unica',
      itens: itensSep,
      quantidade_itens: itensSep.length,
      quantidade_total: qtdReservadaTotal,
      quantidade_pendente_producao: 0,
      estoque_ja_reservado: true,
      status: 'aguardando_separacao',
    });
    await registrarLog('Separacao', separacao.id, 'CRIACAO_AUTOMATICA',
      precisaProducao
        ? `Separação ${separacao.numero} (expressa) criada com ${qtdReservadaTotal} un já em estoque — pedido ${numero} (parte pendente em Separação de Produção à parte)`
        : `Separação ${separacao.numero} criada — estoque total disponível para o pedido ${numero}`);
  }

  // 3. Cria a OP para a quantidade pendente + Separação "Produção" (irmã, bloqueada)
  let ordem = null;
  let separacaoProducao = null;
  if (precisaProducao) {
    const itensParaProducao = itensSemEstoque.map(i => ({
      produto_id: i.produto_id,
      produto_nome: i.produto_nome,
      quantidade: i.quantidadeFalta,
      disponivel: false,
      sem_rotulo: !!(pedido.sem_rotulo || i.sem_rotulo),
    }));

    separacaoProducao = await base44.entities.Separacao.create({
      ...baseSeparacao,
      numero: gerarNumero('SEP'),
      tipo_separacao: 'producao',
      itens: [],
      quantidade_itens: itensSemEstoque.length,
      quantidade_total: 0,
      quantidade_pendente_producao: qtdPendenteTotal,
      estoque_ja_reservado: false,
      status: 'aguardando_producao',
      separacao_irma_id: separacao?.id || null,
    });

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
      separacao_id: separacaoProducao.id,
    });
    await registrarLog('OrdemProducao', ordem.id, 'CRIACAO_AUTOMATICA',
      `OP para pedido ${numero} — ${itensSemEstoque.length} item(ns) p/ produção (${qtdReservadaTotal} un já reservadas em Separação expressa à parte)`);

    // Vínculo de volta: a Separação de Produção sabe qual OP a está produzindo
    await base44.entities.Separacao.update(separacaoProducao.id, {
      ordem_producao_id: ordem.id,
      ordem_producao_numero: ordem.numero,
    });
    await registrarLog('Separacao', separacaoProducao.id, 'CRIACAO_AUTOMATICA',
      `Separação ${separacaoProducao.numero} (produção) criada — aguardando OP ${ordem.numero} concluir ${qtdPendenteTotal} un (pedido ${numero})`);

    // Se existe irmã expressa, vincula ela de volta também
    if (separacao) {
      await base44.entities.Separacao.update(separacao.id, {
        separacao_irma_id: separacaoProducao.id,
      });
    }
  }

  // 4. Atualiza o pedido
  await base44.entities.Pedido.update(pedido.id, {
    status,
    ordens_producao_ids: ordem ? [ordem.id] : [],
  });

  return { status, precisaProducao, separacao, separacaoProducao, ordem };
}

/**
 * Chamada quando a produção de uma OP vinculada a um pedido é concluída.
 * Preenche a Separação de Produção (irmã) com os itens produzidos e a libera
 * para seguir seu próprio caminho ("Aguardando Separação"). Não mescla com a
 * irmã expressa aqui — a fusão acontece na coluna "Separado" (ver avancoSeparacao.js).
 * Retorna true se encontrou e liberou a separação.
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

  const itensOP = (ordem.itens && ordem.itens.length > 0)
    ? ordem.itens
    : (ordem.produto_id ? [{ produto_id: ordem.produto_id, produto_nome: ordem.produto_nome, quantidade: ordem.quantidade }] : []);
  const itens = itensOP.map(i => ({
    produto_id: i.produto_id || null,
    produto_nome: i.produto_nome,
    quantidade: i.quantidade || 0,
    sem_rotulo: !!i.sem_rotulo,
  }));

  await base44.entities.Separacao.update(sep.id, {
    itens,
    quantidade_itens: itens.length,
    quantidade_total: itens.reduce((s, i) => s + (i.quantidade || 0), 0),
    quantidade_pendente_producao: 0,
    producao_concluida: true,
    status: 'aguardando_separacao',
  });
  await registrarLog('Separacao', sep.id, 'PRODUCAO_CONCLUIDA',
    `Produção da OP ${ordem.numero} concluída — separação ${sep.numero} liberada para seguir seu próprio caminho`);
  return true;
}
