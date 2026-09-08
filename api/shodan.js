// Vercel Serverless Function: GET /api/shodan?q=port:22 -> { total, matches }
// Ключ хранится в Vercel: Project → Settings → Environment Variables → SHODAN_KEY.
// В коде и в репозитории ключа НЕТ.

const cache = new Map();
const CACHE_MS = 60 * 1000;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const q = (req.query.q || '').toString().trim().slice(0, 200);
  if (!q) return res.status(400).json({ error: 'empty query' });

  const now = Date.now();
  const hit = cache.get(q);
  if (hit && now - hit.time < CACHE_MS) {
    return res.status(200).json({ ...hit.data, cached: true });
  }

  try {
    const r = await fetch(
      `https://api.shodan.io/shodan/host/search?key=${process.env.SHODAN_KEY}&query=${encodeURIComponent(q)}`
    );
    const d = await r.json();
    if (d.error) throw new Error(d.error);

    const out = {
      total: d.total || 0,
      matches: (d.matches || []).slice(0, 20).map((m) => ({
        ip: m.ip_str || '',
        hostnames: m.hostnames || [],
        org: m.org || '',
        country: m.country_name || '',
        city: m.city || '',
        ports: m.ports || [],
        services: (m.data || []).slice(0, 6).map((s) => ({
          port: s.port,
          product: s.product || s.module || s.transport || '',
        })),
      })),
    };

    cache.set(q, { time: now, data: out });
    return res.status(200).json(out);
  } catch (e) {
    return res.status(500).json({ error: String((e && e.message) || e) });
  }
}
