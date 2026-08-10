import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const PRIORIDADE_TIPO_CLIENTE = { A: 0, B: 1, C: 2 };
const STATUS_ATIVOS_NA_MAQUINA = ['a_produzir', 'em_producao'];

function prioridadeDe(op, clientePorPedido) {
  if (op.sem_rotulo || op._white_label) return -1; // produção obrigatória, sempre entra
  const cliente = clientePorPedido.get(op.pedido_id);
  if (cliente?.tipo_cliente && PRIORIDADE_TIPO_CLIENTE[cliente.tipo_cliente] !== undefined) {
    return PRIORIDADE_TIPO_CLIENTE[cliente.tipo_cliente];
  }
  return 3; // FIFO / sem classificação
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { ordem_producao_id } = await req.json();
    if (!ordem_producao_id) {
      return Response.json({ error: 'ordem_producao_id é obrigatório.' }, { status: 400 });
    }

    const op = await base44.asServiceRole.entities.OrdemProducao.get(ordem_producao_id);
    if (!op) return Response.json({ error: 'Ordem de Produção não encontrada.' }, { status: 404 });

    const produto = op.produto_id ? await base44.asServiceRole.entities.Produto.get(op.produto_id) : null;
    const linhaProducao = produto?.linha_producao;
    if (!linhaProducao) {
      return Response.json({ error: 'Produto sem linha_producao definida — não é possível alocar.' }, { status: 400 });
    }

    // Checagem de insumo: tarugo para linha 7dias
    if (linhaProducao === '7dias') {
      const maquinasTarugo = await base44.asServiceRole.entities.Maquina.filter({ tipo_produto: 'tarugo' });
      const tarugo = maquinasTarugo[0];
      const tarugosPorUnidade = produto?.tarugos_por_unidade || 4;
      const consumoNecessario = (op.quantidade || 0) * tarugosPorUnidade;
      if (!tarugo || (tarugo.estoque_atual || 0) < consumoNecessario) {
        await base44.asServiceRole.entities.OrdemProducao.update(op.id, {
          maquina_id: null,
          etapa_atual: 'producao',
          observacao_desvio_regra: 'Aguardando estoque de tarugo insuficiente para alocação automática.',
        });
        return Response.json({
          ok: true,
          alocado: false,
          motivo: 'estoque_tarugo_insuficiente',
        });
      }
    }

    // Máquinas compatíveis com a linha de produção
    const maquinasCompativeis = await base44.asServiceRole.entities.Maquina.filter({
      tipo_produto: linhaProducao,
      ativo: true,
    });

    if (maquinasCompativeis.length === 0) {
      return Response.json({ error: `Nenhuma máquina ativa para a linha de produção "${linhaProducao}".` }, { status: 404 });
    }

    // OPs atualmente ocupando máquinas dessa linha
    const idsCompativeis = maquinasCompativeis.map((m) => m.id);
    const opsAtivas = await base44.asServiceRole.entities.OrdemProducao.filter({
      maquina_id: { $in: idsCompativeis },
      status: { $in: STATUS_ATIVOS_NA_MAQUINA },
    });

    // Descobre slots livres (considerando lados quando a máquina tem)
    let maquinaEscolhida = null;
    let ladoEscolhido = null;
    for (const maquina of maquinasCompativeis) {
      if (maquina.tem_lados) {
        const ladosOcupados = new Set(
          opsAtivas.filter((o) => o.maquina_id === maquina.id).map((o) => o.lado_maquina)
        );
        if (!ladosOcupados.has('A')) {
          maquinaEscolhida = maquina;
          ladoEscolhido = 'A';
          break;
        }
        if (!ladosOcupados.has('B')) {
          maquinaEscolhida = maquina;
          ladoEscolhido = 'B';
          break;
        }
      } else {
        const ocupada = opsAtivas.some((o) => o.maquina_id === maquina.id);
        if (!ocupada) {
          maquinaEscolhida = maquina;
          break;
        }
      }
    }

    if (maquinaEscolhida) {
      await base44.asServiceRole.entities.OrdemProducao.update(op.id, {
        maquina_id: maquinaEscolhida.id,
        lado_maquina: ladoEscolhido,
        etapa_atual: 'producao',
      });
      await base44.asServiceRole.entities.LogAuditoria.create({
        entidade: 'OrdemProducao',
        entidade_id: op.id,
        acao: 'alocacao_maquina',
        descricao: `OP alocada na máquina ${maquinaEscolhida.nome}${ladoEscolhido ? ' lado ' + ladoEscolhido : ''}.`,
        usuario: user.email,
      });
      return Response.json({ ok: true, alocado: true, maquina_id: maquinaEscolhida.id, lado_maquina: ladoEscolhido });
    }

    // Nenhuma máquina livre: entra em fila, posição calculada por prioridade
    const pedidoIds = [...new Set([op.pedido_id].filter(Boolean))];
    const pedidos = pedidoIds.length
      ? await base44.asServiceRole.entities.Pedido.filter({ id: { $in: pedidoIds } })
      : [];
    const clientesIds = [...new Set(pedidos.map((p) => p.cliente_id).filter(Boolean))];
    const clientes = clientesIds.length
      ? await base44.asServiceRole.entities.Cliente.filter({ id: { $in: clientesIds } })
      : [];
    const clientePorPedido = new Map(
      pedidos.map((p) => [p.id, clientes.find((c) => c.id === p.cliente_id) || null])
    );

    const filaAtual = await base44.asServiceRole.entities.OrdemProducao.filter({
      maquina_id: null,
      etapa_atual: 'producao',
    });

    const prioridadeOp = prioridadeDe(op, clientePorPedido);
    // Posição = quantas OPs na fila têm prioridade igual ou maior (número menor = mais prioritário)
    const posicao = filaAtual.filter((o) => prioridadeDe(o, clientePorPedido) <= prioridadeOp).length;

    await base44.asServiceRole.entities.OrdemProducao.update(op.id, {
      maquina_id: null,
      etapa_atual: 'producao',
      posicao_fila: posicao,
    });

    return Response.json({ ok: true, alocado: false, motivo: 'sem_maquina_livre', posicao_fila: posicao });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
