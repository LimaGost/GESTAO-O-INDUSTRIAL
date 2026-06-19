/**
 * Utilitário centralizado para persistência de configurações no banco de dados.
 * Usa base44.entities (cliente do usuário autenticado) — funciona no browser.
 */
import { base44 } from '@/api/base44Client';

// Cache em memória para evitar múltiplos fetches na mesma sessão
const _cache = {};

/**
 * Carrega uma configuração do banco pelo chave.
 */
export async function loadConfig(chave, defaultValue = null, forceRefresh = false) {
  if (!forceRefresh && _cache[chave] !== undefined) return _cache[chave];
  try {
    const results = await base44.entities.AppConfig.filter({ chave });
    if (results && results.length > 0) {
      _cache[chave] = results[0].valor;
      return results[0].valor;
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
  _cache[chave] = valor;
  try {
    const results = await base44.entities.AppConfig.filter({ chave });
    if (results && results.length > 0) {
      await base44.entities.AppConfig.update(results[0].id, { valor });
    } else {
      await base44.entities.AppConfig.create({ chave, valor });
    }
  } catch (e) {
    console.error(`[appConfig] Erro ao salvar "${chave}":`, e.message);
    throw e;
  }
}

/**
 * Invalida o cache em memória para uma chave específica.
 */
export function invalidateConfig(chave) {
  delete _cache[chave];
}

/**
 * Invalida todo o cache.
 */
export function invalidateAllConfigs() {
  Object.keys(_cache).forEach(k => delete _cache[k]);
}