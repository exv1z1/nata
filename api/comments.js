// GET /api/comments?postId= — список
// POST /api/comments {postId, text} — только залогиненные
import { sql, json, readJson, getUser } from './_db.js';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const pid = Number(req.query.postId);
      if (!pid) return json(res, 400, { error: 'Нужен postId' });
      const { rows } = await sql`
        SELECT c.id, c.text, c.created_at, u.nick AS author_nick, u.login AS author_login
        FROM comments c JOIN users u ON u.id = c.author_id
        WHERE c.post_id = ${pid}
        ORDER BY c.id`;
      return json(res, 200, { comments: rows });
    }
    if (req.method === 'POST') {
      const me = await getUser(req);
      if (!me) return json(res, 401, { error: 'Войди в аккаунт' });
      const { postId, text } = await readJson(req);
      const pid = Number(postId);
      const t = String(text || '').trim().slice(0, 500);
      if (!pid || !t) return json(res, 400, { error: 'Пустой комментарий' });
      const { rows } = await sql`
        INSERT INTO comments (post_id, author_id, text)
        VALUES (${pid}, ${me.id}, ${t})
        RETURNING id, created_at`;
      return json(res, 200, {
        comment: { id: rows[0].id, text: t, created_at: rows[0].created_at, author_nick: me.nick },
      });
    }
    return json(res, 405, { error: 'Метод не поддерживается' });
  } catch (e) {
    return json(res, 500, { error: String((e && e.message) || e) });
  }
}
