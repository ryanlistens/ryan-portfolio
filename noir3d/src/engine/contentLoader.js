function withCacheBust(url) {
  const u = new URL(url, window.location.href);
  u.searchParams.set("_ts", String(Date.now()));
  return u.toString();
}

export class ContentLoader {
  constructor({ baseUrl }) {
    this.baseUrl = baseUrl;
    this._cache = new Map();
  }

  clearCache() {
    this._cache.clear();
  }

  async loadJson(path, { bustCache = false } = {}) {
    const url = new URL(path, this.baseUrl).toString();
    const key = bustCache ? withCacheBust(url) : url;

    if (!bustCache && this._cache.has(key)) return this._cache.get(key);

    const res = await fetch(key, { cache: bustCache ? "no-store" : "default" });
    if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status} ${res.statusText}`);

    const data = await res.json();
    if (!bustCache) this._cache.set(key, data);
    return data;
  }
}

