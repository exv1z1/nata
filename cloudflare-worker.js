// Cloudflare Worker — прокси для счётчика подписчиков.
// Токен НЕ лежит в коде: он хранится в секрете воркера (Settings → Variables → Secrets → TOKEN).
// Деплой: workers.dev → Create Worker → вставить этот код → Deploy → Add secret TOKEN → Deploy заново.

const TG_CHAT_ID = '-1002679769175'; // канал

export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
    };
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors });
    }
    try {
      const tg = await fetch(
        `https://api.telegram.org/bot${env.TOKEN}/getChatMembersCount?chat_id=${TG_CHAT_ID}`
      );
      const data = await tg.json();
      if (!data.ok) throw new Error('tg error');
      return Response.json({ count: data.result }, { headers: cors });
    } catch (e) {
      return Response.json({ error: 'fail' }, { status: 500, headers: cors });
    }
  },
};
