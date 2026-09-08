// POST /api/auth/register {nick, login, password, invite}
import { sql, json, readJson, setSession, hashPassword, LOGIN_RE } from '../_db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Только POST' });
  try {
    const { nick, login, password, invite } = await readJson(req);

    const n = String(nick || '').trim();
    const l = String(login || '').trim();
    const p = String(password || '');
    const code = String(invite || '').trim().toUpperCase();

    if (n.length < 2 || n.length > 24) return json(res, 400, { error: 'Ник: 2–24 символа' });
    if (!LOGIN_RE.test(l)) return json(res, 400, { error: 'Логин: 3–20 символов (латиница, цифры, _)' });
    if (p.length < 8 || p.length > 72) return json(res, 400, { error: 'Пароль: минимум 8 символов' });
    if (!code) return json(res, 400, { error: 'Нужен инвайт-код' });

    const busy = await sql`SELECT id FROM users WHERE login = ${l}`;
    if (busy.rows.length) return json(res, 400, { error: 'Логин занят' });

    // Бутстрап: самому первому пользователю инвайт не нужен
    const cnt = await sql`SELECT COUNT(*)::int AS n FROM users`;
    let usedInvite = null;
    if (cnt.rows[0].n > 0) {
      const inv = await sql`SELECT code, used_by FROM invites WHERE code = ${code}`;
      if (!inv.rows.length) return json(res, 400, { error: 'Такого инвайта нет' });
      if (inv.rows[0].used_by) return json(res, 400, { error: 'Инвайт уже использован' });
      usedInvite = code;
    }

    const { hash, salt } = await hashPassword(p);
    // Первый пользователь и логин владельца — админы
    const role =
      cnt.rows[0].n === 0 || (process.env.OWNER_LOGIN && l === process.env.OWNER_LOGIN)
        ? 'admin'
        : 'user';
    const u = await sql`
      INSERT INTO users (login, nick, pass_hash, salt, role)
      VALUES (${l}, ${n}, ${hash}, ${salt}, ${role})
      RETURNING id, login, nick, role`;
    if (usedInvite) {
      await sql`UPDATE invites SET used_by = ${u.rows[0].id} WHERE code = ${usedInvite}`;
    }

    setSession(res, l);
    return json(res, 200, { user: u.rows[0] });
  } catch (e) {
    return json(res, 500, { error: String((e && e.message) || e) });
  }
}
