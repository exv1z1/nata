const params = new URLSearchParams(location.search);
const BOARD = params.get('board') === 'shitpost' ? 'shitpost' : 'pozor';
const EMOJIS = ['❤️', '🔥', '😂', '👍', '💩'];

const boardTitle = document.getElementById('boardTitle');
const boardUser = document.getElementById('boardUser');
const postForm = document.getElementById('postForm');
const postText = document.getElementById('postText');
const postFile = document.getElementById('postFile');
const postBtn = document.getElementById('postBtn');
const postsEl = document.getElementById('posts');
const menuAuth = document.getElementById('menuAuth');

boardTitle.textContent = BOARD === 'pozor' ? 'ДОСКА ПОЗОРА' : 'SHITPOST';
document.getElementById(BOARD === 'pozor' ? 'menuPozor' : 'menuShit').classList.add('menu__item--active');

let ME = null;

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function dateStr(iso) {
  try {
    return new Date(iso).toLocaleString('ru-RU');
  } catch {
    return '';
  }
}

async function load() {
  const res = await fetch('/api/posts/list?board=' + BOARD);
  const data = await res.json();
  if (!res.ok) {
    postsEl.innerHTML = '<p class="error">' + esc(data.error || 'Ошибка') + '</p>';
    return;
  }
  ME = data.me;
  if (ME) {
    boardUser.textContent = 'Ты: ' + ME.nick + (ME.role === 'admin' ? ' (админ)' : '');
    menuAuth.querySelector('.menu__label').textContent = ME.nick;
    menuAuth.href = 'admin.html';
    if (ME.role === 'admin') postForm.classList.remove('hidden');
  } else {
    boardUser.innerHTML = 'Чтобы ставить реакции и комментировать — <a href="auth.html">войди</a>.';
  }
  render(data.posts);
}

function render(posts) {
  if (!posts.length) {
    postsEl.innerHTML = '<p class="muted">Пока пусто.</p>';
    return;
  }
  postsEl.innerHTML = posts.map((p) => {
    let media = '';
    if (p.media_url && p.media_type === 'video') {
      media = '<video class="post__media" src="' + esc(p.media_url) + '" controls preload="metadata"></video>';
    } else if (p.media_url) {
      media = '<img class="post__media" src="' + esc(p.media_url) + '" alt="" loading="lazy" />';
    }
    const reacts = EMOJIS.map((e) => {
      const n = (p.reactions && p.reactions[e]) || 0;
      const on = p.myReactions && p.myReactions.includes(e) ? ' react--on' : '';
      return '<button class="react' + on + '" data-id="' + p.id + '" data-e="' + e + '">' +
        e + ' <span>' + n + '</span></button>';
    }).join('');
    return '<article class="post" data-id="' + p.id + '">' +
      '<div class="post__head"><b>' + esc(p.author_nick) + '</b><span>' + esc(dateStr(p.created_at)) + '</span></div>' +
      (p.text ? '<p class="post__text">' + esc(p.text) + '</p>' : '') +
      media +
      '<div class="reacts">' + reacts + '</div>' +
      '<button class="comments-toggle" data-id="' + p.id + '">Комменты (' + p.comments_count + ')</button>' +
      '<div class="comments hidden" id="c-' + p.id + '"></div>' +
      (ME ? '<form class="cform hidden" data-id="' + p.id + '">' +
        '<input class="field" maxlength="500" placeholder="Комментарий…" />' +
        '<button class="btn btn--small" type="submit">ОК</button></form>' : '') +
      '</article>';
  }).join('');
}

postForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  postBtn.disabled = true;
  postBtn.textContent = 'Загрузка…';
  try {
    const fd = new FormData();
    fd.append('board', BOARD);
    fd.append('text', postText.value);
    if (postFile.files[0]) fd.append('file', postFile.files[0]);
    const res = await fetch('/api/posts/create', { method: 'POST', body: fd });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));
    postText.value = '';
    postFile.value = '';
    await load();
  } catch (err) {
    alert(err.message);
  }
  postBtn.disabled = false;
  postBtn.textContent = 'Опубликовать';
});

postsEl.addEventListener('click', async (e) => {
  const rb = e.target.closest('.react');
  if (rb) {
    if (!ME) {
      location.href = 'auth.html';
      return;
    }
    const res = await fetch('/api/posts/react', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId: Number(rb.dataset.id), emoji: rb.dataset.e }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error || 'Ошибка');
      return;
    }
    const card = rb.closest('.post');
    card.querySelectorAll('.react').forEach((b) => {
      const n = (data.counts && data.counts[b.dataset.e]) || 0;
      b.querySelector('span').textContent = n;
    });
    rb.classList.toggle('react--on');
    return;
  }

  const t = e.target.closest('.comments-toggle');
  if (t) {
    const id = Number(t.dataset.id);
    const box = document.getElementById('c-' + id);
    const form = postsEl.querySelector('.cform[data-id="' + id + '"]');
    box.classList.toggle('hidden');
    if (form) form.classList.toggle('hidden');
    if (!box.classList.contains('hidden') && !box.dataset.loaded) {
      const res = await fetch('/api/comments?postId=' + id);
      const data = await res.json();
      box.dataset.loaded = '1';
      box.innerHTML = (data.comments || []).map((c) =>
        '<div class="comment"><b>' + esc(c.author_nick) + '</b> ' + esc(c.text) +
        '<span>' + esc(dateStr(c.created_at)) + '</span></div>'
      ).join('') || '<p class="muted">Комментов нет.</p>';
    }
  }
});

postsEl.addEventListener('submit', async (e) => {
  const f = e.target.closest('.cform');
  if (!f) return;
  e.preventDefault();
  const input = f.querySelector('input');
  const text = input.value.trim();
  if (!text) return;
  const id = Number(f.dataset.id);
  const res = await fetch('/api/comments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ postId: id, text }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    alert(data.error || 'Ошибка');
    return;
  }
  input.value = '';
  const box = document.getElementById('c-' + id);
  box.dataset.loaded = '';
  box.classList.remove('hidden');
  const btn = postsEl.querySelector('.comments-toggle[data-id="' + id + '"]');
  if (btn) btn.textContent = 'Комменты (' + (Number(btn.textContent.replace(/\D/g, '')) + 1) + ')';
  const r2 = await fetch('/api/comments?postId=' + id);
  const d2 = await r2.json();
  box.dataset.loaded = '1';
  box.innerHTML = (d2.comments || []).map((c) =>
    '<div class="comment"><b>' + esc(c.author_nick) + '</b> ' + esc(c.text) +
    '<span>' + esc(dateStr(c.created_at)) + '</span></div>'
  ).join('');
});

load();
