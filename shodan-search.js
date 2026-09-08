const form = document.getElementById('shodanForm');
const input = document.getElementById('shodanQuery');
const out = document.getElementById('shodanResults');

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const q = input.value.trim();
  if (!q) return;
  out.innerHTML = '<p class="muted">Ищем…</p>';
  try {
    const res = await fetch('/api/shodan?q=' + encodeURIComponent(q));
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error('API не отвечает (Vercel не задеплоил /api/shodan — проверь что файл api/shodan.js в репозитории и деплой прошёл)');
    }
    if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));
    render(q, data);
  } catch (err) {
    out.innerHTML = '<p class="error">Ошибка: ' + escapeHtml(err.message) + '</p>';
  }
});

function render(q, data) {
  if (!data.matches || data.matches.length === 0) {
    out.innerHTML = '<p class="muted">Ничего не найдено по запросу «' + escapeHtml(q) + '».</p>';
    return;
  }
  let html = '<p class="muted">Всего: ' + Number(data.total).toLocaleString('ru-RU') +
    ' · показано ' + data.matches.length + '</p>';
  html += '<div class="cards">';
  for (const m of data.matches) {
    html += '<div class="card">';
    html += '<div class="card__ip">' + escapeHtml(m.ip) + '</div>';
    if (m.hostnames.length) html += '<div class="card__hosts">' + m.hostnames.map(escapeHtml).join(', ') + '</div>';
    const loc = [m.city, m.country].filter(Boolean).join(', ');
    if (m.org || loc) html += '<div class="card__meta">' + escapeHtml([m.org, loc].filter(Boolean).join(' · ')) + '</div>';
    if (m.ports.length) html += '<div class="card__ports">' + m.ports.slice(0, 12).map((p) => '<span>' + escapeHtml(p) + '</span>').join('') + '</div>';
    if (m.services.length) {
      html += '<div class="card__services">' + m.services.map((s) =>
        '<div>' + escapeHtml(s.port) + (s.product ? ' — ' + escapeHtml(s.product) : '') + '</div>'
      ).join('') + '</div>';
    }
    html += '</div>';
  }
  html += '</div>';
  out.innerHTML = html;
}
