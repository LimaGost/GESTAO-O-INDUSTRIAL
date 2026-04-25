import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SMCLICK_API_KEY = Deno.env.get('SMCLICK_API_KEY');
const NUMERO_INTERNO = Deno.env.get('SMCLICK_NUMERO_INTERNO');

async function enviarAlertaSMClick(numero, mensagem) {
  if (!numero || !SMCLICK_API_KEY) return { ok: false, erro: 'Config incompleta' };
  
  try {
    const response = await fetch('https://api.smclick.com.br/external/send-messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: SMCLICK_API_KEY,
        phone: numero,
        message: mensagem,
      }),
    });
    const data = await response.json();
    return { ok: response.ok, data };
  } catch (error) {
    return { ok: false, erro: error.message };
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data } = body;

    // Valida que é uma atualização de estoque
    if (event.type !== 'update' || !data) return Response.json({ ok: true });

    const produto = data;
    const estoque_atual = produto.estoque_atual || 0;
    const estoque_minimo = produto.estoque_minimo || 0;

    // Verifica se atingiu o limite crítico (estoque <= mínimo)
    if (estoque_atual <= estoque_minimo && estoque_minimo > 0) {
      const mensagem = `⚠️ *ALERTA DE ESTOQUE BAIXO*\n\n📦 Produto: ${produto.nome}\n📊 Estoque: ${estoque_atual} un\n📈 Mínimo: ${estoque_minimo} un\n\nCódigo: ${produto.codigo || '—'}\n\n⏰ ${new Date().toLocaleString('pt-BR')}`;

      // Envia para o número interno (admin)
      if (NUMERO_INTERNO) {
        await enviarAlertaSMClick(NUMERO_INTERNO, mensagem);
      }

      // Registra log de auditoria
      await base44.asServiceRole.entities.LogAuditoria.create({
        entidade: 'Produto',
        entidade_id: produto.id,
        acao: 'ESTOQUE_CRITICO',
        descricao: `Estoque baixo: ${estoque_atual}/${estoque_minimo} un`,
        usuario: 'sistema',
      });
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error('Erro:', error);
    return Response.json({ ok: false, erro: error.message }, { status: 500 });
  }
});