// GET /api/admin/invites — список (админы)
// POST /api/admin/invites {count} — создать N кодов (админы)
import { sql, json, readJson, getUser, isAdmin, inviteCode } from '../_db.js';

export default async function handler(req, res) {
  try {
    const me = await getUser(req);
    if (!me) return json(res, 401, { error: 'Войди в аккаунт' });
    if (!isAdmin(me)) return json(res, 403, { error: 'Только для админов' });

    if (req.method === 'GET') {
      const { rows } = await sql`
        SELECT i.code, i.created_at,
               c.nick AS created_by_nick,
               u.nick AS used_by_nick
        FROM invites i
        LEFT JOIN users c ON c.id = i.created_by
        LEFT JOIN users u ON u.id = i.used_by
        ORDER BY i.created_at DESC
        LIMIT 100`;
      return json(res, 200, { invites: rows });
    }

    if (req.method === 'POST') {
      const { count } = await readJson(req);
      const n = Math.min(Math.max(Number(count) || 1, 1), 20);
      const codes = [];
      for (let k = 0; k < n; k++) {
        const code = inviteCode();
        await sql`INSERT INTO invites (code, created_by) VALUES (${code}, ${me.id})`;
        codes.push(code);
      }
      return json(res, 200, { codes });
    }

    if (req.method === 'DELETE') {
      const { code } = await readJson(req);
      const c = String(code || '').trim().toUpperCase();
      if (!c) return json(res, 400, { error: 'Нет кода' });
      await sql`DELETE FROM invites WHERE code = ${c} AND used_by IS NULL`;
      return json(res, 200, { ok: true });
    }

    return json(res, 405, { error: 'Метод не поддерживается' });
  } catch (e) {
    return json(res, 500, { error: String((e && e.message) || e) });
  }
}
