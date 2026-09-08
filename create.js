// POST /api/posts/create (multipart: text + file?) — только админы
import Busboy from 'busboy';
import crypto from 'node:crypto';
import { put } from '@vercel/blob';
import { sql, json, getUser, isAdmin } from '../_db.js';

const MAX_FILE = 25 * 1024 * 1024;
const OK_MIME = /^(image|video)\//;

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const bb = Busboy({ headers: req.headers, limits: { fileSize: MAX_FILE, files: 1 } });
    const fields = {};
    let file = null;
    const chunks = [];
    let tooBig = false;
    bb.on('file', (_name, stream, info) => {
      const { filename, mimeType } = info;
      file = { filename: String(filename || 'file'), mimeType: String(mimeType || '') };
      stream.on('data', (d) => chunks.push(d));
      stream.on('limit', () => {
        tooBig = true;
        stream.resume();
      });
      stream.on('end', () => {
        if (file) file.buffer = Buffer.concat(chunks);
      });
    });
    bb.on('field', (n, v) => {
      fields[n] = v;
    });
    bb.on('error', reject);
    bb.on('finish', () => {
      if (tooBig) reject(new Error('Файл слишком большой (макс 25 МБ)'));
      else resolve({ fields, file });
    });
    req.pipe(bb);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Только POST' });
  try {
    const me = await getUser(req);
    if (!me) return json(res, 401, { error: 'Войди в аккаунт' });
    if (!isAdmin(me)) return json(res, 403, { error: 'Посты могут делать только админы' });

    const { fields, file } = await parseMultipart(req);
    const board = String(fields.board || '');
    const text = String(fields.text || '').slice(0, 1000).trim();
    if (board !== 'pozor' && board !== 'shitpost') {
      return json(res, 400, { error: 'Некорректный раздел' });
    }

    let mediaUrl = null;
    let mediaType = null;
    if (file && file.buffer && file.buffer.length) {
      if (!OK_MIME.test(file.mimeType)) {
        return json(res, 400, { error: 'Только фото и видео' });
      }
      const safe = file.filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 60) || 'file';
      const key = `${board}/${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${safe}`;
      const blobToken = process.env.BLOB_READ_WRITE_TOKEN || process.env.blob_READ_WRITE_TOKEN;
      const blob = await put(key, file.buffer, {
        access: 'public',
        contentType: file.mimeType,
        ...(blobToken ? { token: blobToken } : {}),
      });
      mediaUrl = blob.url;
      mediaType = file.mimeType.startsWith('video') ? 'video' : 'image';
    }

    if (!text && !mediaUrl) return json(res, 400, { error: 'Пустой пост' });

    const { rows } = await sql`
      INSERT INTO posts (board, author_id, text, media_url, media_type)
      VALUES (${board}, ${me.id}, ${text}, ${mediaUrl}, ${mediaType})
      RETURNING id`;
    return json(res, 200, { id: rows[0].id });
  } catch (e) {
    return json(res, 500, { error: String((e && e.message) || e) });
  }
}
