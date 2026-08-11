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

    const { separacao_id, pin } = await req.json();
    if (!separacao_id) {
      return Response.json({ error: 'separacao_id é obrigatório.' }, { status: 400 });
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

    const sep = await base44.asServiceRole.entities.Separacao.get(separacao_id);
    if (!sep) return Response.json({ error: 'Separação não encontrada.' }, { status: 404 });
    if (sep.status !== 'separado' || !sep.separacao_irma_id) {
      return Response.json({ error: 'Esta separação não está bloqueada aguardando irmã.' }, { status: 400 });
    }

    const agoraISO = new Date().toISOString();

    // Libera esta separação — segue sozinha daqui pra frente
    await base44.asServiceRole.entities.Separacao.update(separacao_id, {
      separacao_irma_id: null,
      liberado_sem_irma: true,
      liberado_sem_irma_por: user.email,
      liberado_sem_irma_em: agoraISO,
    });

    // Quebra o vínculo do lado da irmã também, para que ela não tente se fundir
    // com esta quando (e se) chegar em "Separado" depois — segue independente.
    const irmaId = sep.separacao_irma_id;
    const irma = await base44.asServiceRole.entities.Separacao.get(irmaId).catch(() => null);
    if (irma && irma.separacao_irma_id === separacao_id) {
      await base44.asServiceRole.entities.Separacao.update(irmaId, {
        separacao_irma_id: null,
      });
    }

    await base44.asServiceRole.entities.LogAuditoria.create({
      entidade: 'Separacao',
      entidade_id: separacao_id,
      acao: 'liberado_sem_irma',
      descricao: `Separação ${sep.numero} liberada para seguir sem a irmã ${sep.separacao_irma_numero || irmaId} (via PIN do gerente de produção). Pedido será expedido incompleto.`,
      usuario: user.email,
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
