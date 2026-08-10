import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const CONFIG_KEY = 'pin_gerente_producao_hash';

async function hashPin(pin) {
  const data = new TextEncoder().encode(pin);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { maquina_id, ordem_ids, pin } = await req.json();

    if (!maquina_id || !Array.isArray(ordem_ids) || ordem_ids.length === 0) {
      return Response.json({ error: 'maquina_id e ordem_ids são obrigatórios.' }, { status: 400 });
    }

    const configRows = await base44.asServiceRole.entities.AppConfig.filter({ chave: CONFIG_KEY });
    const configRegistro = configRows[0];
    if (!configRegistro?.valor?.hash) {
      return Response.json({ error: 'PIN do gerente de produção não configurado.' }, { status: 500 });
    }

    const pinDigitadoHash = await hashPin(String(pin || ''));
    if (pinDigitadoHash !== configRegistro.valor.hash) {
      return Response.json({ error: 'PIN incorreto.' }, { status: 403 });
    }

    // Aplica a nova posição na fila conforme a ordem enviada
    const atualizacoes = ordem_ids.map((opId, index) =>
      base44.asServiceRole.entities.OrdemProducao.update(opId, { posicao_fila: index })
    );
    await Promise.all(atualizacoes);

    await base44.asServiceRole.entities.LogAuditoria.create({
      entidade: 'OrdemProducao',
      entidade_id: maquina_id,
      acao: 'reordenacao_fila',
      descricao: `Fila da máquina ${maquina_id} reordenada. Nova ordem: ${ordem_ids.join(', ')}.`,
      usuario: user.email,
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
