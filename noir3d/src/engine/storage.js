export class Storage {
  constructor(prefix) {
    this.prefix = prefix;
  }

  _k(key) {
    return `${this.prefix}:${key}`;
  }

  getJson(key, fallback = null) {
    try {
      const raw = localStorage.getItem(this._k(key));
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  setJson(key, value) {
    try {
      localStorage.setItem(this._k(key), JSON.stringify(value));
    } catch {
      // ignore quota / private mode
    }
  }

  remove(key) {
    try {
      localStorage.removeItem(this._k(key));
    } catch {
      // ignore
    }
  }
}

