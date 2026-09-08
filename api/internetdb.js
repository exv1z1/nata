// Vercel Serverless Function: GET /api/internetdb?ip=1.1.1.1
// Проверка IP через InternetDB — бесплатно, БЕЗ ключа и кредитов.

const cache = new Map();
const CACHE_MS = 5 * 60 * 1000;
const IP_RE = /^(?:\d{1,3}\.){3}\d{1,3}$|^[0-9a-fA-F:]{2,60}$/;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const ip = (req.query.ip || '').toString().trim().slice(0, 60);
  if (!IP_RE.test(ip)) {
    return res.status(400).json({ error: 'Некорректный IP. Пример: 1.1.1.1' });
  }

  const now = Date.now();
  const hit = cache.get(ip);
  if (hit && now - hit.time < CACHE_MS) {
    return res.status(200).json({ ...hit.data, cached: true });
  }

  try {
    const r = await fetch(`https://internetdb.shodan.io/${encodeURIComponent(ip)}`);
    if (r.status === 404) {
      return res.status(404).json({ error: 'Ничего не известно об этом IP' });
    }
    if (!r.ok) throw new Error('InternetDB HTTP ' + r.status);
    const d = await r.json();
    const out = {
      ip: d.ip || ip,
      ports: d.ports || [],
      hostnames: d.hostnames || [],
      cpes: d.cpes || [],
      vulns: d.vulns || [],
      tags: d.tags || [],
    };
    cache.set(ip, { time: now, data: out });
    return res.status(200).json(out);
  } catch (e) {
    return res.status(500).json({ error: String((e && e.message) || e) });
  }
}
