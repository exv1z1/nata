const usForm = document.getElementById('usForm');
const usInput = document.getElementById('usQuery');
const usOut = document.getElementById('usResults');

function usEscape(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

usForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const q = usInput.value.trim();
  if (!q) return;
  usOut.innerHTML = '<p class="muted">Ищем…</p>';
  try {
    const res = await fetch('/api/urlscan?q=' + encodeURIComponent(q));
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      throw new Error('API не отвечает (Vercel не задеплоил /api/urlscan — проверь деплой)');
    }
    if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));
    usRender(q, data);
  } catch (err) {
    usOut.innerHTML = '<p class="error">Ошибка: ' + usEscape(err.message) + '</p>';
  }
});

function usRender(q, data) {
  if (!data.results || data.results.length === 0) {
    usOut.innerHTML = '<p class="muted">Ничего не найдено по запросу «' + usEscape(q) + '».</p>';
    return;
  }
  let html = '<p class="muted">Всего: ' + Number(data.total).toLocaleString('ru-RU') +
    ' · показано ' + data.results.length + '</p><div class="cards">';
  for (const r of data.results) {
    html += '<div class="card">';
    if (r.id) {
      html += '<div class="card__ip"><a href="https://urlscan.io/result/' + usEscape(r.id) +
        '/" target="_blank" rel="noopener">Скан ↗</a></div>';
    }
    if (r.url) html += '<div class="card__hosts">' + usEscape(r.url) + '</div>';
    const meta = [r.domain, r.ip, r.country].filter(Boolean).join(' · ');
    if (meta) html += '<div class="card__meta">' + usEscape(meta) + '</div>';
    if (r.server) html += '<div class="card__services"><div>Сервер: ' + usEscape(r.server) + '</div></div>';
    if (r.time) html += '<div class="card__hosts">' + usEscape(String(r.time).slice(0, 10)) + '</div>';
    html += '</div>';
  }
  html += '</div>';
  usOut.innerHTML = html;
}
