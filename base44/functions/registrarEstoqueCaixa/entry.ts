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

    const { modelo_caixa_id, quantidade, pin } = await req.json();

    if (!modelo_caixa_id) {
      return Response.json({ error: 'modelo_caixa_id é obrigatório.' }, { status: 400 });
    }
    if (typeof quantidade !== 'number' || quantidade < 0) {
      return Response.json({ error: 'Quantidade inválida.' }, { status: 400 });
    }

    // Sem janela de horário — pode ser registrado a qualquer momento.
    const configRows = await base44.asServiceRole.entities.AppConfig.filter({ chave: CONFIG_KEY });
    const configRegistro = configRows[0];
    if (!configRegistro?.valor?.hash) {
      return Response.json({ error: 'PIN do gerente de produção não configurado.' }, { status: 500 });
    }

    const pinDigitadoHash = await hashPin(String(pin || ''));
    if (pinDigitadoHash !== configRegistro.valor.hash) {
      return Response.json({ error: 'PIN incorreto.' }, { status: 403 });
    }

    const modelo = await base44.asServiceRole.entities.ModeloCaixa.get(modelo_caixa_id);
    if (!modelo) {
      return Response.json({ error: 'Modelo de caixa não encontrado.' }, { status: 404 });
    }

    const agoraISO = new Date().toISOString();
    await base44.asServiceRole.entities.ModeloCaixa.update(modelo_caixa_id, {
      estoque_atual: quantidade,
      estoque_ultima_contagem: quantidade,
      estoque_ultima_contagem_em: agoraISO,
    });

    await base44.asServiceRole.entities.LogAuditoria.create({
      entidade: 'ModeloCaixa',
      entidade_id: modelo_caixa_id,
      acao: 'contagem_estoque_caixa',
      descricao: `Estoque de "${modelo.nome}" registrado: ${quantidade} caixas (por gerente de produção via PIN).`,
      usuario: user.email,
    });

    return Response.json({ ok: true, estoque_atual: quantidade });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
