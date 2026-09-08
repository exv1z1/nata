// ШАБЛОН прокси под любой сторонний API.
// Как использовать:
//   1. Впиши свой URL в UPSTREAM (есть пример ниже).
//   2. Если нужен ключ — положи его в Vercel env как CUSTOM_API_KEY (в коде ключ НЕ пиши).
//   3. Переименуй файл под себя, например api/mysite.js, и обращайся к /api/mysite?a=....

// ============ ВСТАВЬ СВОЁ ТУТ ============
const UPSTREAM = 'https://example.com/api/search'; // <-- URL чужого API
const USE_KEY = false; // <-- true, если нужен ключ
// =========================================

const cache = new Map();
const CACHE_MS = 60 * 1000;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Собираем параметры из запроса фронта: /api/mysite?q=текст&page=1
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(req.query)) {
    if (Array.isArray(v)) v.forEach((x) => params.append(k, String(x).slice(0, 300)));
    else if (v !== undefined) params.append(k, String(v).slice(0, 300));
  }
  if ([...params].length === 0) {
    return res.status(400).json({ error: 'Нет параметров запроса' });
  }

  const cacheKey = params.toString();
  const now = Date.now();
  const hit = cache.get(cacheKey);
  if (hit && now - hit.time < CACHE_MS) {
    return res.status(200).json({ ...hit.data, cached: true });
  }

  try {
    const headers = { Accept: 'application/json' };
    let url = `${UPSTREAM}?${params.toString()}`;

    if (USE_KEY) {
      const key = process.env.CUSTOM_API_KEY; // <-- ключ только из env!
      if (!key) throw new Error('Нет CUSTOM_API_KEY в Environment Variables');
      // Вариант А: ключ в заголовке (поменяй под свой API)
      headers['api-key'] = key;
      // Вариант Б: ключ в URL — раскомментируй нужное, вариант А удали:
      // url += `&key=${encodeURIComponent(key)}`;
    }

    const r = await fetch(url, { headers });
    if (r.status === 429) throw new Error('Лимит запросов, попробуй позже');
    if (r.status === 401 || r.status === 403) throw new Error('Неверный ключ или нет доступа');
    if (!r.ok) throw new Error('Upstream HTTP ' + r.status);

    const data = await r.json();

    // Чистим ответ: оставляем только нужное (поменяй под структуру своего API)
    const out = {
      total: data.total ?? (Array.isArray(data) ? data.length : 0),
      items: Array.isArray(data) ? data : data.results || data.matches || data.items || [],
    };

    cache.set(cacheKey, { time: now, data: out });
    return res.status(200).json(out);
  } catch (e) {
    return res.status(500).json({ error: String((e && e.message) || e) });
  }
}
