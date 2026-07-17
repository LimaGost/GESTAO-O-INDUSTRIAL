import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token, nome_recebedor, cpf_recebedor, observacoes_cliente, foto_url, assinatura_url } = await req.json();

    if (!token) return Response.json({ error: 'Token inválido.' }, { status: 400 });
    if (!nome_recebedor || !String(nome_recebedor).trim()) {
      return Response.json({ error: 'Informe o nome do recebedor.' }, { status: 400 });
    }

    // O token é a credencial de acesso — busca a expedição correspondente
    const exps = await base44.asServiceRole.entities.Expedicao.filter({ token_confirmacao: token });
    if (!exps || exps.length === 0) {
      return Response.json({ error: 'Expedição não encontrada.' }, { status: 404 });
    }
    const exp = exps[0];
    if (exp.confirmado_pelo_cliente) {
      return Response.json({ success: true, already_confirmed: true });
    }

    await base44.asServiceRole.entities.Expedicao.update(exp.id, {
      confirmado_pelo_cliente: true,
      data_confirmacao_cliente: new Date().toISOString(),
      nome_recebedor: String(nome_recebedor).trim(),
      ...(cpf_recebedor ? { cpf_recebedor } : {}),
      ...(observacoes_cliente ? { observacoes_cliente } : {}),
      ...(assinatura_url ? { assinatura_url } : {}),
      ...(foto_url ? { foto_recebedor_url: foto_url } : {}),
      status: 'entregue',
      data_entrega: new Date().toISOString(),
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});