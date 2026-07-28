import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const CONFIG_KEY = 'dupla_checagem';
const EMAIL_GESTOR = 'moises.choas@gmail.com';

async function hashPin(pin) {
  const data = new TextEncoder().encode('dupla_checagem_salt::' + pin);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { acao, pin, roles, user_ids } = await req.json();

    const rows = await base44.asServiceRole.entities.AppConfig.filter({ chave: CONFIG_KEY });
    const registro = rows[0] || null;
    const valor = registro?.valor || {};
    const podeGerir = user.email === EMAIL_GESTOR;

    if (acao === 'status') {
      const configurada = !!valor.pin_hash;
      const requerida = configurada && user.email !== EMAIL_GESTOR && (
        (valor.roles || []).includes(user.role) || (valor.user_ids || []).includes(user.id)
      );
      return Response.json({
        configurada,
        requerida,
        podeGerir,
        roles: podeGerir ? (valor.roles || []) : undefined,
        user_ids: podeGerir ? (valor.user_ids || []) : undefined,
      });
    }

    if (acao === 'usuarios') {
      if (!podeGerir) return Response.json({ error: 'Não autorizado' }, { status: 403 });
      const lista = await base44.asServiceRole.entities.User.list();
      return Response.json({
        usuarios: lista.map(u => ({ id: u.id, full_name: u.full_name, email: u.email, role: u.role })),
      });
    }

    if (acao === 'verificar') {
      if (!valor.pin_hash) return Response.json({ ok: true });
      const ok = (await hashPin(String(pin || ''))) === valor.pin_hash;
      return Response.json({ ok });
    }

    if (acao === 'configurar') {
      if (!podeGerir) {
        return Response.json({ error: 'Apenas o gestor autorizado pode configurar a dupla checagem.' }, { status: 403 });
      }
      const novoValor = { ...valor };
      if (pin !== undefined && pin !== null && String(pin).length > 0) {
        if (String(pin).length < 4) {
          return Response.json({ error: 'A senha deve ter pelo menos 4 caracteres.' }, { status: 400 });
        }
        novoValor.pin_hash = await hashPin(String(pin));
      }
      if (Array.isArray(roles)) {
        novoValor.roles = roles.filter(r => r !== 'admin');
      }
      if (Array.isArray(user_ids)) {
        novoValor.user_ids = user_ids;
      }
      if (!novoValor.pin_hash) {
        return Response.json({ error: 'Defina uma senha antes de ativar a dupla checagem.' }, { status: 400 });
      }
      if (registro) {
        await base44.asServiceRole.entities.AppConfig.update(registro.id, { valor: novoValor });
      } else {
        await base44.asServiceRole.entities.AppConfig.create({ chave: CONFIG_KEY, valor: novoValor });
      }
      return Response.json({ ok: true, roles: novoValor.roles || [], user_ids: novoValor.user_ids || [] });
    }

    if (acao === 'desativar') {
      if (!podeGerir) {
        return Response.json({ error: 'Apenas o gestor autorizado pode desativar a dupla checagem.' }, { status: 403 });
      }
      if (registro) {
        await base44.asServiceRole.entities.AppConfig.update(registro.id, { valor: {} });
      }
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}