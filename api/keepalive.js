// api/keepalive.js
// Vercel Serverless Function appelée 1×/jour par Vercel Cron (voir vercel.json).
// Fait une lecture triviale sur Supabase pour réinitialiser le compteur d'inactivité
// (7 jours) du free tier et empêcher la mise en pause du projet.
// Utilise la clé anon (publique, déjà présente côté client) — aucun secret ici.

const SUPABASE_URL = "https://tfrezncozblmfctwgayo.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmcmV6bmNvemJsbWZjdHdnYXlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMDUxNzcsImV4cCI6MjA4ODU4MTE3N30.VOCinZ5T4sR1eCdWpwa3S5AzZ-SfQY-l_TgegmyYxLY";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/kv_store?select=id&limit=1`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
    if (!r.ok) throw new Error(`Supabase responded ${r.status}`);
    return res.status(200).json({ ok: true, pingedAt: new Date().toISOString() });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
}
