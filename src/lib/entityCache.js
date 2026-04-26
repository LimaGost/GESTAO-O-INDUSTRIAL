/**
 * entityCache — cache em memória com:
 * - TTL configurável por chave
 * - Deduplicação de requests em voo (request coalescing)
 *   → se duas chamadas simultâneas pedem a mesma chave, só UMA requisição vai ao servidor
 * - Invalidação explícita
 * - Atualização otimista (set sem fetch)
 */

const cache = {};       // { key: { data, ts } }
const inFlight = {};    // { key: Promise }

export async function cachedFetch(key, fetcher, ttl = 60_000) {
  const now = Date.now();

  // Cache hit
  if (cache[key] && now - cache[key].ts < ttl) {
    return cache[key].data;
  }

  // Request já em voo para esta chave — aguarda o mesmo Promise
  if (inFlight[key]) {
    return inFlight[key];
  }

  // Dispara o fetch e registra como em voo
  inFlight[key] = fetcher().then(data => {
    cache[key] = { data, ts: Date.now() };
    delete inFlight[key];
    return data;
  }).catch(err => {
    delete inFlight[key];
    throw err;
  });

  return inFlight[key];
}

/** Invalida o cache de uma chave (força re-fetch na próxima chamada) */
export function cacheInvalidate(key) {
  delete cache[key];
}

/** Invalida múltiplas chaves de uma vez */
export function cacheInvalidateMany(keys) {
  keys.forEach(k => delete cache[k]);
}

/** Atualiza o cache diretamente (atualização otimista sem fetch) */
export function cacheSet(key, data) {
  cache[key] = { data, ts: Date.now() };
}

/** Retorna dados do cache sem fazer fetch (undefined se não tiver) */
export function cacheGet(key) {
  return cache[key]?.data;
}