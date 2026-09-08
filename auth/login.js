// POST /api/auth/login {login, password}
import { sql, json, readJson, setSession, verifyPassword } from '../_db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Только POST' });
  try {
    const { login, password } = await readJson(req);
    const l = String(login || '').trim();
    const p = String(password || '');
    const { rows } = await sql`SELECT * FROM users WHERE login = ${l}`;
    if (!rows.length) return json(res, 401, { error: 'Неверный логин или пароль' });
    const ok = await verifyPassword(p, rows[0].pass_hash, rows[0].salt);
    if (!ok) return json(res, 401, { error: 'Неверный логин или пароль' });
    setSession(res, rows[0].login);
    return json(res, 200, {
      user: { id: rows[0].id, login: rows[0].login, nick: rows[0].nick, role: rows[0].role },
    });
  } catch (e) {
    return json(res, 500, { error: String((e && e.message) || e) });
  }
}
