// Общий хелпер: БД, сессии (подписанные куки), пароли (scrypt), JSON.
import { sql } from '@vercel/postgres';
import crypto from 'node:crypto';
import { promisify } from 'node:util';

export { sql };

const scrypt = promisify(crypto.scrypt);
const SESSION_DAYS = 30;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error('Нет SESSION_SECRET в Environment Variables');
  return s;
}

export function json(res, code, obj) {
  res.status(code).setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(obj));
}

export function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => {
      raw += c;
      if (raw.length > 1e6) reject(new Error('Слишком большой запрос'));
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error('Некорректный JSON'));
      }
    });
    req.on('error', reject);
  });
}

export function parseCookies(req) {
  const out = {};
  const h = req.headers.cookie || '';
  for (const part of h.split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export function signSession(login) {
  const exp = Date.now() + SESSION_DAYS * 24 * 3600 * 1000;
  const sig = crypto.createHmac('sha256', secret()).update(`${login}.${exp}`).digest('hex');
  return `${login}.${exp}.${sig}`;
}

export function setSession(res, login) {
  const v = signSession(login);
  res.setHeader(
    'Set-Cookie',
    `sess=${encodeURIComponent(v)}; HttpOnly; Path=/; Max-Age=${SESSION_DAYS * 86400}; SameSite=Lax; Secure`
  );
}

export function clearSession(res) {
  res.setHeader('Set-Cookie', 'sess=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax; Secure');
}

// Возвращает {id, login, nick, role} или null
export async function getUser(req) {
  try {
    const sess = parseCookies(req).sess;
    if (!sess) return null;
    const [login, exp, sig] = sess.split('.');
    if (!login || !exp || !sig) return null;
    if (Number(exp) < Date.now()) return null;
    const want = crypto.createHmac('sha256', secret()).update(`${login}.${exp}`).digest('hex');
    const a = Buffer.from(sig);
    const b = Buffer.from(want);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const { rows } = await sql`SELECT id, login, nick, role FROM users WHERE login = ${login}`;
    return rows[0] || null;
  } catch {
    return null;
  }
}

export function isOwner(user) {
  return !!user && !!process.env.OWNER_LOGIN && user.login === process.env.OWNER_LOGIN;
}

export function isAdmin(user) {
  return !!user && (user.role === 'admin' || isOwner(user));
}

export async function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  const h = await scrypt(pw, salt, 64);
  return { hash: h.toString('hex'), salt };
}

export async function verifyPassword(pw, hash, salt) {
  const h = await scrypt(pw, salt, 64);
  const a = Buffer.from(h.toString('hex'));
  const b = Buffer.from(hash);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export const LOGIN_RE = /^[a-zA-Z0-9_]{3,20}$/;

export function inviteCode() {
  return 'NATO-' + crypto.randomBytes(6).toString('hex').toUpperCase();
}
