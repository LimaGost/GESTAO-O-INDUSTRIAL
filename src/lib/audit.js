import { base44 } from '@/api/base44Client';

export async function registrarLog(entidade, entidadeId, acao, descricao, usuario = 'sistema') {
  try {
    await base44.entities.LogAuditoria.create({
      entidade,
      entidade_id: entidadeId,
      acao,
      descricao,
      usuario,
    });
  } catch {
    // ignora erros de log silenciosamente
  }
}