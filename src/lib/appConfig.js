/**
 * Utilitário centralizado para persistência de configurações no banco de dados.
 */
import { base44 } from '@/api/base44Client';

const _cache = {};

/**
 * Carrega uma configuração do banco pelo chave.
 */
export async function loadConfig(chave, defaultValue = null, forceRefresh = false) {
  if (!forceRefresh && _cache[chave] !== undefined) return _cache[chave];
  try {
    const all = await base44.entities.AppConfig.list();
    const record = all.find(r => r.chave === chave);
    if (record) {
      _cache[chave] = record.valor;
      return record.valor;
    }
  } catch (e) {
    console.warn(`[appConfig] Erro ao carregar "${chave}":`, e.message);
  }
  _cache[chave] = defaultValue;
  return defaultValue;
}

/**
 * Salva uma configuração no banco. Cria se não existir, atualiza se já existir.
 */
export async function saveConfig(chave, valor) {
  try {
    const all = await base44.entities.AppConfig.list();
    const record = all.find(r => r.chave === chave);
    if (record) {
      await base44.entities.AppConfig.update(record.id, { valor });
    } else {
      await base44.entities.AppConfig.create({ chave, valor });
    }
    // Atualiza o cache apenas após persistir com sucesso
    _cache[chave] = valor;
  } catch (e) {
    console.error(`[appConfig] Erro ao salvar "${chave}":`, e.message);
    delete _cache[chave];
    throw e;
  }
}

export function invalidateConfig(chave) {
  delete _cache[chave];
}

export function invalidateAllConfigs() {
  Object.keys(_cache).forEach(k => delete _cache[k]);
}