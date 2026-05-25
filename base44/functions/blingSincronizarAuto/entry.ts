import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Sincronização automática agendada — sem necessidade de usuário autenticado
// Busca pedidos de hoje no Bling e importa os novos

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Obtém e renova token OAuth2 diretamente (sem depender de outro function invoke)
    const configs = await base44.asServiceRole.entities.BlingConfig.list();
    const config = configs[0];
    if (!config || !config.refresh_token) {
      console.error('[blingSincronizarAuto] Bling não configurado');
      return Response.json({ error: 'Bling não autorizado' }, { status: 401 });
    }

    let accessToken = config.access_token;

    // Renova se expirado (com margem de 5 min)
    if (!accessToken || !config.expires_at || Date.now() >= config.expires_at - 300000) {
      const clientId = Deno.env.get('BLING_CLIENT_ID');
      const clientSecret = Deno.env.get('BLING_CLIENT_SECRET');
      const credentials = btoa(`${clientId}:${clientSecret}`);

      const tokenRes = await fetch('https://www.bling.com.br/Api/v3/oauth/token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: config.refresh_token }),
      });

      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || !tokenData.access_token) {
        console.error('[blingSincronizarAuto] Falha ao renovar token:', JSON.stringify(tokenData));
        return Response.json({ error: 'Falha ao renovar token Bling' }, { status: 401 });
      }

      accessToken = tokenData.access_token;
      const expiresAt = Date.now() + (tokenData.expires_in || 21600) * 1000;
      await base44.asServiceRole.entities.BlingConfig.update(config.id, {
        access_token: accessToken,
        refresh_token: tokenData.refresh_token || config.refresh_token,
        expires_at: expiresAt,
        conectado: true,
      });
      console.log('[blingSincronizarAuto] Token renovado');
    }

    // Obtém timestamp do último sincronismo bem-sucedido
    const ultimaSincs = await base44.asServiceRole.entities.UltimaSincronizacao.filter({ tipo: 'bling_pedidos' });
    let dataInicio = hoje;
    let dataFim = hoje;

    if (ultimaSincs.length > 0) {
      // Se existe último sync, usa como data de início (em UTC-0 para API Bling)
      const ultimoTs = ultimaSincs[0].timestamp;
      const ultimaData = new Date(ultimoTs);
      dataInicio = ultimaData.toISOString().split('T')[0]; // apenas data YYYY-MM-DD
      console.log(`[blingSincronizarAuto] Sincronizando desde ${ultimaData.toISOString()}`);
    } else {
      console.log('[blingSincronizarAuto] Primeira sincronização, puxando apenas de hoje');
    }

    const params = new URLSearchParams({ pagina: '1', limite: '100', dataInicio, dataFim });

    const res = await fetch(`https://www.bling.com.br/Api/v3/pedidos/vendas?${params}`, {
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' },
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error('[blingSincronizarAuto] Erro Bling API:', res.status, txt);
      return Response.json({ error: `Erro na API Bling: ${res.status}` }, { status: 500 });
    }

    const json = await res.json();
    const pedidosBling = json.data || [];
    console.log(`[blingSincronizarAuto] ${pedidosBling.length} pedido(s) encontrado(s) para ${hoje}`);

    // Busca todos os números já importados de uma vez (evita rate limit no loop)
    const pedidosExistentes = await base44.asServiceRole.entities.Pedido.list();
    const numerosExistentes = new Set(pedidosExistentes.map(p => String(p.numero)));
    console.log(`[blingSincronizarAuto] ${numerosExistentes.size} pedidos já cadastrados no sistema`);

    let importados = 0;
    let duplicados = 0;
    const erros = [];

    for (const pedidoBling of pedidosBling) {
      try {
        const numero = String(pedidoBling.numero || pedidoBling.id || '');

        if (numerosExistentes.has(numero)) { duplicados++; continue; }

        let detalhes = pedidoBling;
        if (pedidoBling.id) {
          const detRes = await fetch(`https://www.bling.com.br/Api/v3/pedidos/vendas/${pedidoBling.id}`, {
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' },
          });
          if (detRes.ok) {
            const detJson = await detRes.json();
            detalhes = detJson.data || pedidoBling;
          }
        }

        const itensBrutos = detalhes.itens || detalhes.items || [];
        const itens = itensBrutos.map(item => ({
          produto_id: String(item.produto?.id || item.codigo || ''),
          produto_nome: item.produto?.nome || item.descricao || item.nome || 'Produto',
          quantidade: Number(item.quantidade) || 1,
          preco_unitario: Number(item.valor || item.preco || 0),
          total: Number(item.quantidade || 1) * Number(item.valor || item.preco || 0),
        }));

        const valorTotal = Number(detalhes.totalProdutos || detalhes.total || 0);
        const clienteNome = detalhes.contato?.nome || detalhes.cliente?.nome || 'Cliente Bling';
        const dataPedido = (detalhes.data || hoje).split('T')[0];
        const observacoes = detalhes.observacoes || '';

        await base44.asServiceRole.entities.Pedido.create({
          numero,
          cliente_nome: clienteNome,
          status: 'rascunho',
          data_pedido: dataPedido,
          itens,
          valor_total: valorTotal,
          observacoes: observacoes ? `[Bling] ${observacoes}` : '[Importado do Bling]',
        });

        importados++;
        console.log(`[blingSincronizarAuto] Importado pedido #${numero} - ${clienteNome}`);
      } catch (e) {
        erros.push({ numero: pedidoBling.numero, erro: e.message });
        console.error('[blingSincronizarAuto] Erro no pedido:', pedidoBling.numero, e.message);
      }
    }

    console.log(`[blingSincronizarAuto] Resultado: ${importados} importados, ${duplicados} duplicados`);

    // Atualiza timestamp do último sincronismo bem-sucedido
    const agora = Date.now();
    if (ultimaSincs.length > 0) {
      await base44.asServiceRole.entities.UltimaSincronizacao.update(ultimaSincs[0].id, {
        timestamp: agora,
        data_ultima_sincronizacao: new Date(agora).toISOString(),
      });
    } else {
      await base44.asServiceRole.entities.UltimaSincronizacao.create({
        tipo: 'bling_pedidos',
        timestamp: agora,
        data_ultima_sincronizacao: new Date(agora).toISOString(),
      });
    }
    console.log(`[blingSincronizarAuto] Timestamp atualizado para ${new Date(agora).toISOString()}`);

    return Response.json({ ok: true, data: hoje, total_bling: pedidosBling.length, importados, duplicados, erros });

  } catch (error) {
    console.error('[blingSincronizarAuto] Erro geral:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});