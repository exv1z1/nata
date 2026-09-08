// POST /api/auth/logout
import { json, clearSession } from '../_db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Только POST' });
  clearSession(res);
  return json(res, 200, { ok: true });
}
