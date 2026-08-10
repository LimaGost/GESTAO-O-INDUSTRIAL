import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const CONFIG_KEY = 'pin_gerente_producao_hash';

async function hashPin(pin) {
  const data = new TextEncoder().encode(pin);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function dentroDaJanelaPermitida() {
  const agora = new Date();
  const partes = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(agora);
  const hora = parseInt(partes.find((p) => p.type === 'hour').value, 10);
  const minuto = parseInt(partes.find((p) => p.type === 'minute').value, 10);
  const minutosDoDia = hora * 60 + minuto;

  // Expediente 08:00-17:00 (Brasília), margem de 30min em cada ponta
  const inicio1 = 7 * 60 + 30; // 07:30
  const fim1 = 8 * 60 + 30; // 08:30
  const inicio2 = 16 * 60 + 30; // 16:30
  const fim2 = 17 * 60 + 30; // 17:30

  return (minutosDoDia >= inicio1 && minutosDoDia <= fim1) || (minutosDoDia >= inicio2 && minutosDoDia <= fim2);
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { quantidade, pin } = await req.json();

    if (typeof quantidade !== 'number' || quantidade < 0) {
      return Response.json({ error: 'Quantidade inválida.' }, { status: 400 });
    }

    if (!dentroDaJanelaPermitida()) {
      return Response.json(
        { error: 'Contagem de estoque de tarugo só é permitida entre 07:30–08:30 ou 16:30–17:30 (horário de Brasília).' },
        { status: 403 }
      );
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

    // Busca a máquina de Tarugo
    const maquinas = await base44.asServiceRole.entities.Maquina.filter({ tipo_produto: 'tarugo' });
    const maquinaTarugo = maquinas[0];
    if (!maquinaTarugo) {
      return Response.json({ error: 'Máquina de Tarugo não encontrada.' }, { status: 404 });
    }

    const agoraISO = new Date().toISOString();
    await base44.asServiceRole.entities.Maquina.update(maquinaTarugo.id, {
      estoque_atual: quantidade,
      estoque_ultima_contagem: quantidade,
      estoque_ultima_contagem_em: agoraISO,
    });

    await base44.asServiceRole.entities.LogAuditoria.create({
      entidade: 'Maquina',
      entidade_id: maquinaTarugo.id,
      acao: 'contagem_estoque_tarugo',
      descricao: `Estoque de tarugo registrado: ${quantidade} unidades (por gerente de produção via PIN).`,
      usuario: user.email,
    });

    return Response.json({ ok: true, estoque_atual: quantidade });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
