const cache = {};

export async function cachedFetch(key, fetcher, ttl = 60000) {
  const now = Date.now();
  if (cache[key] && now - cache[key].ts < ttl) {
    return cache[key].data;
  }
  const data = await fetcher();
  cache[key] = { data, ts: now };
  return data;
}

export function cacheInvalidate(key) {
  delete cache[key];
}