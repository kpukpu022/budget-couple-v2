// Polyfill window.storage pour fonctionner hors Claude
// Utilise localStorage comme fallback

if (!window.storage) {
  const PREFIX = "budget_shared_";
  window.storage = {
    async get(key) {
      try {
        const val = localStorage.getItem(PREFIX + key);
        if (val === null) throw new Error("not found");
        return { key, value: val };
      } catch {
        throw new Error("not found");
      }
    },
    async set(key, value) {
      localStorage.setItem(PREFIX + key, value);
      return { key, value };
    },
    async delete(key) {
      localStorage.removeItem(PREFIX + key);
      return { key, deleted: true };
    },
    async list(prefix) {
      const keys = Object.keys(localStorage)
        .filter(k => k.startsWith(PREFIX + (prefix || "")))
        .map(k => k.slice(PREFIX.length));
      return { keys };
    }
  };
}
