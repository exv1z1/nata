// GET /api/auth/me -> { user } или { user: null }
import { json, getUser } from '../_db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Только GET' });
  const u = await getUser(req);
  return json(res, 200, { user: u });
}
