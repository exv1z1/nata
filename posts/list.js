// GET /api/posts/list?board=pozor|shitpost
import { sql, json, getUser } from '../_db.js';

export default async function handler(req, res) {
  try {
    const board = String(req.query.board || '');
    if (board !== 'pozor' && board !== 'shitpost') {
      return json(res, 400, { error: 'Некорректный раздел' });
    }
    const me = await getUser(req);
    const { rows } = await sql`
      SELECT p.id, p.board, p.text, p.media_url, p.media_type, p.created_at,
             u.nick AS author_nick,
             (SELECT COUNT(*)::int FROM comments c WHERE c.post_id = p.id) AS comments_count
      FROM posts p JOIN users u ON u.id = p.author_id
      WHERE p.board = ${board}
      ORDER BY p.id DESC
      LIMIT 50`;
    const ids = rows.map((p) => p.id);
    let counts = {};
    let mine = {};
    if (ids.length) {
      const r = await sql`
        SELECT post_id, emoji, COUNT(*)::int AS n
        FROM reactions WHERE post_id = ANY(${ids})
        GROUP BY post_id, emoji`;
      for (const x of r.rows) {
        counts[x.post_id] = counts[x.post_id] || {};
        counts[x.post_id][x.emoji] = x.n;
      }
      if (me) {
        const m = await sql`
          SELECT post_id, emoji FROM reactions
          WHERE post_id = ANY(${ids}) AND user_id = ${me.id}`;
        for (const x of m.rows) {
          mine[x.post_id] = mine[x.post_id] || [];
          mine[x.post_id].push(x.emoji);
        }
      }
    }
    return json(res, 200, {
      posts: rows.map((p) => ({
        ...p,
        reactions: counts[p.id] || {},
        myReactions: mine[p.id] || [],
      })),
      me,
    });
  } catch (e) {
    return json(res, 500, { error: String((e && e.message) || e) });
  }
}
