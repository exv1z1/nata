// Vercel Serverless Function: GET /api/subs -> { count: 507 }
// Токен хранится в Vercel: Project → Settings → Environment Variables → TELEGRAM_TOKEN.
// В коде и в репозитории токена НЕТ.

const CHAT_ID = '-1002828764783';

// Небольшой кэш, чтобы не дёргать Telegram при каждой загрузке
let cache = { count: 0, time: 0 };
const CACHE_MS = 60 * 1000;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    if (Date.now() - cache.time < CACHE_MS && cache.count > 0) {
      return res.status(200).json({ count: cache.count, cached: true });
    }

    const r = await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/getChatMembersCount?chat_id=${CHAT_ID}`
    );
    const d = await r.json();
    if (!d.ok) throw new Error(d.description || 'tg error');

    cache = { count: d.result, time: Date.now() };
    return res.status(200).json({ count: d.result });
  } catch (e) {
    if (cache.count > 0) {
      return res.status(200).json({ count: cache.count, cached: true });
    }
    return res.status(500).json({ error: 'fail' });
  }
}
