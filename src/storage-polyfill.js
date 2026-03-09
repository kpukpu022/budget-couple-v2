// Supabase real-time storage — sync entre les deux téléphones
const SUPABASE_URL = "https://tfrezncozblmfctwgayo.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmcmV6bmNvemJsbWZjdHdnYXlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMDUxNzcsImV4cCI6MjA4ODU4MTE3N30.VOCinZ5T4sR1eCdWpwa3S5AzZ-SfQY-l_TgegmyYxLY";

const H = {
  "Content-Type": "application/json",
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`,
};

window.storage = {
  async get(key) {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/kv_store?id=eq.${encodeURIComponent(key)}&select=id,value`,
        { headers: H }
      );
      const data = await res.json();
      if (!data.length) throw new Error("not found");
      return { key, value: data[0].value };
    } catch {
      // fallback localStorage
      const val = localStorage.getItem("b_" + key);
      if (!val) throw new Error("not found");
      return { key, value: val };
    }
  },

  async set(key, value) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/kv_store`, {
        method: "POST",
        headers: { ...H, "Prefer": "resolution=merge-duplicates" },
        body: JSON.stringify({ id: key, value: String(value) }),
      });
    } catch {}
    // always also save locally as backup
    localStorage.setItem("b_" + key, value);
    return { key, value };
  },

  async delete(key) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/kv_store?id=eq.${encodeURIComponent(key)}`, {
        method: "DELETE", headers: H
      });
    } catch {}
    localStorage.removeItem("b_" + key);
    return { key, deleted: true };
  },

  async list(prefix) {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/kv_store?id=like.${encodeURIComponent((prefix||"")+"%")}&select=id`,
        { headers: H }
      );
      const data = await res.json();
      return { keys: data.map(r => r.id) };
    } catch {
      return { keys: [] };
    }
  }
};
