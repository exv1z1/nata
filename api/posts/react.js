// POST /api/posts/react {postId, emoji} — toggle, только залогиненные
import { sql, json, readJson, getUser } from '../_db.js';

const ALLOWED = ['❤️', '🔥', '😂', '👍', '💩'];

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Только POST' });
  try {
    const me = await getUser(req);
    if (!me) return json(res, 401, { error: 'Войди в аккаунт' });
    const { postId, emoji } = await readJson(req);
    const pid = Number(postId);
    const em = String(emoji || '');
    if (!pid || !ALLOWED.includes(em)) return json(res, 400, { error: 'Некорректная реакция' });

    const has = await sql`
      SELECT 1 FROM reactions WHERE post_id = ${pid} AND user_id = ${me.id} AND emoji = ${em}`;
    if (has.rows.length) {
      await sql`DELETE FROM reactions WHERE post_id = ${pid} AND user_id = ${me.id} AND emoji = ${em}`;
    } else {
      await sql`INSERT INTO reactions (post_id, user_id, emoji) VALUES (${pid}, ${me.id}, ${em})`;
    }
    const c = await sql`
      SELECT emoji, COUNT(*)::int AS n FROM reactions WHERE post_id = ${pid} GROUP BY emoji`;
    const counts = {};
    for (const x of c.rows) counts[x.emoji] = x.n;
    return json(res, 200, { counts });
  } catch (e) {
    return json(res, 500, { error: String((e && e.message) || e) });
  }
}
