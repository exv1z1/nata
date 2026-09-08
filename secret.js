const secForm = document.getElementById('secForm');
const secInput = document.getElementById('secQuery');
const secOut = document.getElementById('secResults');
const moreBtn = document.getElementById('secMore');

let curTags = '';
let curPage = 0;
let loading = false;

function secEsc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function isVideo(url) {
  return /\.(mp4|webm|mov)(\?|$)/i.test(url);
}

function card(p) {
  const src = p.preview || p.file;
  const media = isVideo(p.file)
    ? '<video class="meme__media" src="' + secEsc(p.file) + '" preload="metadata" muted loop playsinline onmouseover="this.play()" onmouseout="this.pause()"></video>'
    : '<img class="meme__media" src="' + secEsc(src) + '" alt="" loading="lazy" />';
  return '<a class="meme" href="' + secEsc(p.file) + '" target="_blank" rel="noopener">' +
    media +
    (p.tags ? '<div class="meme__tags">' + secEsc(String(p.tags).slice(0, 120)) + '</div>' : '') +
    '</a>';
}

async function load(append) {
  if (loading) return;
  loading = true;
  moreBtn.disabled = true;
  if (!append) secOut.innerHTML = '<p class="muted">Загрузка…</p>';
  try {
    const res = await fetch('/api/memes?tags=' + encodeURIComponent(curTags) + '&page=' + curPage);
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      throw new Error('API не отвечает (проверь что api/memes.js задеплоен на Vercel)');
    }
    if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));
    if (!data.posts.length && !append) {
      secOut.innerHTML = '<p class="muted">Ничего не найдено.</p>';
      moreBtn.classList.add('hidden');
      return;
    }
    if (!append) secOut.innerHTML = '<div class="memes" id="memesGrid"></div>';
    const grid = document.getElementById('memesGrid');
    if (!grid) return;
    grid.insertAdjacentHTML('beforeend', data.posts.map(card).join(''));
    moreBtn.classList.toggle('hidden', !data.posts.length);
  } catch (err) {
    if (!append) secOut.innerHTML = '<p class="error">Ошибка: ' + secEsc(err.message) + '</p>';
  }
  loading = false;
  moreBtn.disabled = false;
}

secForm.addEventListener('submit', (e) => {
  e.preventDefault();
  curTags = secInput.value.trim();
  curPage = 0;
  load(false);
});

moreBtn.addEventListener('click', () => {
  curPage += 1;
  load(true);
});

load(false);
