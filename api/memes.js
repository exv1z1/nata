// Галерея мемов (механика как Rule34: сетка, теги, страницы).
// НАСТРОЙКА (2 места):
//   1. BASE — базовый URL API (поменяй на свой).
//   2. Ключ и user_id лежат в Vercel env: SHELLBACK_KEY и SHELLBACK_UID (в код НЕ пиши).

const BASE = 'https://rule34.xxx/api'; // <-- ВПИШИ СВОЙ URL

const cache = new Map();
const CACHE_MS = 60 * 1000;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const tags = (req.query.tags || '').toString().slice(0, 200);
  const page = Math.max(0, Number(req.query.page) || 0);

  const cacheKey = tags + '|' + page;
  const now = Date.now();
  const hit = cache.get(cacheKey);
  if (hit && now - hit.time < CACHE_MS) {
    return res.status(200).json({ ...hit.data, cached: true });
  }

  try {
    const key = process.env.SHELLBACK_KEY;
    const uid = process.env.SHELLBACK_UID;
    if (!key || !uid) throw new Error('Нет SHELLBACK_KEY / SHELLBACK_UID в Environment Variables');

    // Формат запроса — поправь параметры под свой API при необходимости
    const url = `${BASE}/posts?api_key=${encodeURIComponent(key)}&user_id=${encodeURIComponent(uid)}` +
      `&tags=${encodeURIComponent(tags)}&page=${page}&limit=20`;

    const r = await fetch(url);
    if (r.status === 429) throw new Error('Лимит запросов, попробуй позже');
    if (r.status === 401 || r.status === 403) throw new Error('Неверный ключ');
    if (!r.ok) throw new Error('Upstream HTTP ' + r.status);

    const d = await r.json();

    // Разбираем ответ: поддерживаем несколько форм (посты массивом или в поле)
    const raw = d.posts || d.post || d.results || d.items || (Array.isArray(d) ? d : []);
    const posts = (Array.isArray(raw) ? raw : []).slice(0, 20).map((p) => ({
      file: p.file_url || p.file || p.url || p.image || '',
      preview: p.preview_url || p.preview || p.sample_url || p.sample || '',
      tags: p.tags || p.tag_string || '',
      id: p.id ?? '',
    })).filter((p) => p.file);

    const out = { posts, page };
    cache.set(cacheKey, { time: now, data: out });
    return res.status(200).json(out);
  } catch (e) {
    return res.status(500).json({ error: String((e && e.message) || e) });
  }
}
