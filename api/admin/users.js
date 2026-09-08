// GET /api/admin/users — список (админы)
// PATCH /api/admin/users {login, role} — смена роли (только владелец)
import { sql, json, readJson, getUser, isAdmin, isOwner } from '../_db.js';

export default async function handler(req, res) {
  try {
    const me = await getUser(req);
    if (!me) return json(res, 401, { error: 'Войди в аккаунт' });
    if (!isAdmin(me)) return json(res, 403, { error: 'Только для админов' });

    if (req.method === 'GET') {
      const { rows } = await sql`
        SELECT login, nick, role, created_at FROM users ORDER BY id LIMIT 200`;
      return json(res, 200, { users: rows, owner: isOwner(me) });
    }

    if (req.method === 'PATCH') {
      if (!isOwner(me)) return json(res, 403, { error: 'Роли меняет только владелец' });
      const { login, role } = await readJson(req);
      const l = String(login || '').trim();
      if ((role !== 'admin' && role !== 'user') || !l) {
        return json(res, 400, { error: 'Некорректные данные' });
      }
      if (l === me.login) return json(res, 400, { error: 'Свою роль менять нельзя' });
      await sql`UPDATE users SET role = ${role} WHERE login = ${l}`;
      return json(res, 200, { ok: true });
    }

    return json(res, 405, { error: 'Метод не поддерживается' });
  } catch (e) {
    return json(res, 500, { error: String((e && e.message) || e) });
  }
}
