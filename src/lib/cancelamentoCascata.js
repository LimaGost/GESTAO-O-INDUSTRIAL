import { base44 } from '@/api/base44Client';
import { registrarLog } from '@/lib/audit';

/**
 * Cancela um pedido e TODOS os cards vinculados no sistema:
 * Ordens de Produção, Separações e Expedição — restaurando o estoque reservado.
 * Retorna um resumo do que foi cancelado.
 */
export async function cancelarPedidoEmCascata(pedido) {
  const id = pedido.id;
  const numero = pedido.numero || id;

  const [todasOPs, todasExps, todasSeps] = await Promise.all([
    base44.entities.OrdemProducao.list(),
    base44.entities.Expedicao.list(),
    base44.entities.Separacao.list().catch(() => []),
  ]);

  const opsVinculadas = todasOPs.filter(o => o.pedido_id === id && !['finalizado', 'cancelado'].includes(o.status));
  const expVinculada = todasExps.find(e => e.pedido_id === id);
  const sepsVinculadas = todasSeps.filter(s => s.pedido_id === id);

  // 1. Cancela o pedido
  await base44.entities.Pedido.update(id, { status: 'cancelado' });

  // 2. Cancela as OPs vinculadas
  await Promise.all(opsVinculadas.map(op =>
    base44.entities.OrdemProducao.update(op.id, { status: 'cancelado' })
  ));

  // 3. Remove as separações vinculadas (industria)
  await Promise.all(sepsVinculadas.map(s => base44.entities.Separacao.delete(s.id).catch(() => {})));

  // 4. Remove a expedição vinculada (se ainda não entregue)
  if (expVinculada && expVinculada.status !== 'entregue') {
    await base44.entities.Expedicao.delete(expVinculada.id).catch(() => {});
  }

  // 5. Restaura o estoque reservado no momento do pedido
  if (pedido.itens?.length > 0) {
    const todosItensOPs = opsVinculadas.flatMap(op => op.itens || []);
    const produtosAtuais = await base44.entities.Produto.list();
    for (const item of pedido.itens) {
      if (!item.produto_id) continue;
      const qtdNasOPs = todosItensOPs
        .filter(oi => oi.produto_id === item.produto_id)
        .reduce((s, oi) => s + (oi.quantidade || 0), 0);
      const qtdRestaurar = Math.max(0, (item.quantidade || 0) - qtdNasOPs);
      if (qtdRestaurar <= 0) continue;
      const produtoAtual = produtosAtuais.find(p => p.id === item.produto_id);
      if (!produtoAtual) continue;
      await base44.entities.Produto.update(item.produto_id, { estoque_atual: (produtoAtual.estoque_atual || 0) + qtdRestaurar });
      await registrarLog('Produto', item.produto_id, 'DEVOLUCAO_ESTOQUE', `Devolução de ${qtdRestaurar} un para pedido cancelado ${numero}`);
    }
  }

  await registrarLog('Pedido', id, 'CANCELAMENTO',
    `Pedido ${numero} cancelado em cascata. ${opsVinculadas.length} OP(s), ${sepsVinculadas.length} separação(ões)${expVinculada ? ' e expedição' : ''} cancelada(s).`
  );

  return { ops: opsVinculadas.length, separacoes: sepsVinculadas.length, expedicao: !!expVinculada };
}