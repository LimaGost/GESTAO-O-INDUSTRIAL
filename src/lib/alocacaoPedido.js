/**
 * Fluxo de alocação de estoque — confirmação manual pelo estoquista.
 *
 * Diferente da versão anterior (que comparava a quantidade do pedido com
 * Produto.estoque_atual automaticamente), agora o sistema NÃO confia no
 * número de estoque sozinho: todo pedido nasce como UMA Separação com todos
 * os itens pendentes de confirmação (estoque_confirmado: false), direto na
 * coluna "Aguardando Separação". O estoquista confere fisicamente item a
 * item (checklist no card) e confirma o que realmente tem — o que não for
 * confirmado vira uma Ordem de Produção + uma Separação-irmã ("produção"),
 * reaproveitando o mesmo modelo de irmãs já usado quando a produção termina
 * depois da separação.
 */
import { base44 } from '@/api/base44Client';
import { gerarNumero } from './numeracao';
import { registrarLog } from './audit';

/**
 * Cria a Separação de um pedido, com todos os itens pendentes de
 * confirmação de estoque. Não mexe em estoque nem cria OP ainda.
 */
export async function criarSeparacaoParaConfirmacao({ pedido, itens }) {
  const numero = pedido.numero;
  const itensValidos = itens.filter(i => i.produto_id && (i.quantidade || 0) > 0);
  const qtdTotal = itensValidos.reduce((s, i) => s + (i.quantidade || 0), 0);
  const semRotuloPedido = !!(pedido.sem_rotulo || itens.some(i => i.sem_rotulo));

  const separacao = await base44.entities.Separacao.create({
    numero: gerarNumero('SEP'),
    origem: 'pedido',
    tipo_separacao: 'unica',
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
    itens: itensValidos.map(i => ({
      produto_id: i.produto_id,
      produto_nome: i.produto_nome,
      quantidade: i.quantidade,
      sem_rotulo: !!(pedido.sem_rotulo || i.sem_rotulo),
    })),
    quantidade_itens: itensValidos.length,
    quantidade_total: qtdTotal,
    estoque_confirmado: false,
    estoque_ja_reservado: false,
    status: 'aguardando_separacao',
  });

  await registrarLog('Separacao', separacao.id, 'CRIACAO_AUTOMATICA',
    `Separação ${separacao.numero} criada para o pedido ${numero} — aguardando o estoquista confirmar o que tem em estoque`);

  await base44.entities.Pedido.update(pedido.id, {
    status: 'separacao',
    ordens_producao_ids: [],
  });

  return { separacao };
}

/**
 * Chamada quando o estoquista termina o checklist de um card em
 * "Aguardando Separação". `produtoIdsConfirmados` é a lista de produto_id
 * que ele marcou como "tenho em estoque". O resto vira produção.
 */
export async function confirmarEstoqueSeparacao(separacao, produtoIdsConfirmados) {
  const confirmadosSet = new Set(produtoIdsConfirmados);
  const itensConfirmados = separacao.itens.filter(i => confirmadosSet.has(i.produto_id));
  const itensNaoConfirmados = separacao.itens.filter(i => !confirmadosSet.has(i.produto_id));

  // Baixa o estoque só do que foi confirmado
  if (itensConfirmados.length > 0) {
    const produtos = await base44.entities.Produto.list();
    await Promise.all(itensConfirmados.map(async (item) => {
      const prod = produtos.find(p => p.id === item.produto_id);
      if (!prod) return;
      await base44.entities.Produto.update(prod.id, {
        estoque_atual: Math.max(0, (prod.estoque_atual || 0) - (item.quantidade || 0)),
      });
      await registrarLog('Produto', prod.id, 'RESERVA_ESTOQUE',
        `Reserva de ${item.quantidade} un confirmada pelo estoquista para o pedido ${separacao.pedido_numero}`);
    }));
  }

  if (itensNaoConfirmados.length === 0) {
    // Tudo confirmado — a própria Separação segue normalmente, sem irmã
    await base44.entities.Separacao.update(separacao.id, {
      estoque_confirmado: true,
      estoque_ja_reservado: true,
    });
    await registrarLog('Separacao', separacao.id, 'ESTOQUE_CONFIRMADO',
      `Estoque confirmado integralmente pelo estoquista — separação ${separacao.numero} segue para separação física`);
    return { precisaProducao: false };
  }

  if (itensConfirmados.length === 0) {
    // Nada em estoque — esta mesma Separação vira a "de produção", sem precisar de irmã
    const ordem = await criarOPParaItens({
      itens: itensNaoConfirmados,
      pedido_id: separacao.pedido_id,
      pedido_numero: separacao.pedido_numero,
      pedido_criado_por_id: separacao.pedido_criado_por_id,
      cliente_nome: separacao.cliente_nome,
      sem_rotulo: separacao.sem_rotulo,
    });
    await base44.entities.Separacao.update(separacao.id, {
      estoque_confirmado: true,
      tipo_separacao: 'producao',
      status: 'aguardando_producao',
      itens: [],
      quantidade_itens: 0,
      quantidade_total: 0,
      quantidade_pendente_producao: itensNaoConfirmados.reduce((s, i) => s + i.quantidade, 0),
      ordem_producao_id: ordem.id,
      ordem_producao_numero: ordem.numero,
    });
    await registrarLog('Separacao', separacao.id, 'ESTOQUE_CONFIRMADO',
      `Nenhum item confirmado em estoque — separação ${separacao.numero} virou produção, aguardando OP ${ordem.numero}`);
    return { precisaProducao: true };
  }

  // Caso parcial: a original fica só com os confirmados (expressa),
  // nasce uma irmã de produção pro resto
  const qtdConfirmada = itensConfirmados.reduce((s, i) => s + i.quantidade, 0);

  const separacaoProducao = await base44.entities.Separacao.create({
    numero: gerarNumero('SEP'),
    origem: 'pedido',
    tipo_separacao: 'producao',
    pedido_id: separacao.pedido_id,
    pedido_numero: separacao.pedido_numero,
    pedido_criado_por_id: separacao.pedido_criado_por_id,
    cliente_id: separacao.cliente_id,
    cliente_nome: separacao.cliente_nome,
    white_label: separacao.white_label,
    white_label_marca: separacao.white_label_marca,
    sem_rotulo: separacao.sem_rotulo,
    destino_tipo: separacao.destino_tipo,
    destino_transportadora: separacao.destino_transportadora,
    destino_unidade: separacao.destino_unidade,
    destino_endereco: separacao.destino_endereco,
    data_prevista: separacao.data_prevista,
    prioridade: separacao.prioridade,
    itens: [],
    quantidade_itens: itensNaoConfirmados.length,
    quantidade_total: 0,
    quantidade_pendente_producao: itensNaoConfirmados.reduce((s, i) => s + i.quantidade, 0),
    estoque_confirmado: true,
    estoque_ja_reservado: false,
    status: 'aguardando_producao',
    separacao_irma_id: separacao.id,
  });

  const ordem = await criarOPParaItens({
    itens: itensNaoConfirmados,
    pedido_id: separacao.pedido_id,
    pedido_numero: separacao.pedido_numero,
    pedido_criado_por_id: separacao.pedido_criado_por_id,
    cliente_nome: separacao.cliente_nome,
    sem_rotulo: separacao.sem_rotulo,
    separacao_id: separacaoProducao.id,
  });

  await base44.entities.Separacao.update(separacaoProducao.id, {
    ordem_producao_id: ordem.id,
    ordem_producao_numero: ordem.numero,
  });

  await base44.entities.Separacao.update(separacao.id, {
    estoque_confirmado: true,
    estoque_ja_reservado: true,
    tipo_separacao: 'expressa',
    itens: itensConfirmados,
    quantidade_itens: itensConfirmados.length,
    quantidade_total: qtdConfirmada,
    separacao_irma_id: separacaoProducao.id,
    separacao_irma_numero: separacaoProducao.numero,
  });
  await base44.entities.Separacao.update(separacaoProducao.id, {
    separacao_irma_numero: separacao.numero,
  });

  await registrarLog('Separacao', separacao.id, 'ESTOQUE_CONFIRMADO',
    `Estoque parcialmente confirmado — ${itensConfirmados.length} item(ns) seguem aqui, ${itensNaoConfirmados.length} foram para a separação-irmã ${separacaoProducao.numero} (produção)`);

  return { precisaProducao: true, separacaoProducao };
}

async function criarOPParaItens({ itens, pedido_id, pedido_numero, pedido_criado_por_id, cliente_nome, sem_rotulo, separacao_id }) {
  const qtd = itens.reduce((s, i) => s + i.quantidade, 0);
  const ordem = await base44.entities.OrdemProducao.create({
    numero: gerarNumero('OP'),
    produto_nome: `${cliente_nome} • ${pedido_numero}`,
    quantidade: qtd,
    itens: itens.map(i => ({ produto_id: i.produto_id, produto_nome: i.produto_nome, quantidade: i.quantidade, disponivel: false, sem_rotulo: !!i.sem_rotulo })),
    status: 'a_produzir',
    pedido_id,
    pedido_numero,
    pedido_criado_por_id,
    cliente_nome,
    sem_rotulo: !!sem_rotulo,
    origem: 'pedido',
    quantidade_pedido_total: qtd,
    quantidade_reservada_estoque: 0,
    separacao_id: separacao_id || null,
  });
  await registrarLog('OrdemProducao', ordem.id, 'CRIACAO_AUTOMATICA',
    `OP criada a partir da confirmação de estoque do pedido ${pedido_numero} — ${itens.length} item(ns) não confirmados`);
  return ordem;
}

/**
 * Chamada quando a produção de uma OP vinculada a um pedido é concluída.
 * Preenche a Separação de Produção (irmã, ou a própria caso não tenha
 * irmã) com os itens produzidos e a libera para seguir seu próprio
 * caminho ("Aguardando Separação").
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
