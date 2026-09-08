const form = document.getElementById('dbForm');
const input = document.getElementById('dbQuery');
const out = document.getElementById('dbResults');

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const ip = input.value.trim();
  if (!ip) return;
  out.innerHTML = '<p class="muted">Проверяем…</p>';
  try {
    const res = await fetch('/api/internetdb?ip=' + encodeURIComponent(ip));
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      throw new Error('API не отвечает (Vercel не задеплоил /api/internetdb — проверь что файл api/internetdb.js в репозитории и деплой прошёл)');
    }
    if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));
    render(data);
  } catch (err) {
    out.innerHTML = '<p class="error">Ошибка: ' + escapeHtml(err.message) + '</p>';
  }
});

function render(d) {
  let html = '<div class="cards"><div class="card">';
  html += '<div class="card__ip">' + escapeHtml(d.ip) + '</div>';

  if (d.hostnames.length) {
    html += '<div class="card__hosts">' + d.hostnames.map(escapeHtml).join(', ') + '</div>';
  }
  if (d.tags.length) {
    html += '<div class="card__meta">Теги: ' + d.tags.map(escapeHtml).join(', ') + '</div>';
  }
  if (d.ports.length) {
    html += '<div class="card__ports">' + d.ports.map((p) => '<span>' + escapeHtml(p) + '</span>').join('') + '</div>';
  } else {
    html += '<p class="muted">Открытых портов нет в базе.</p>';
  }
  if (d.cpes.length) {
    html += '<div class="card__services"><b>Софт:</b>' + d.cpes.map((c) => '<div>' + escapeHtml(c) + '</div>').join('') + '</div>';
  }
  if (d.vulns.length) {
    html += '<div class="card__services card__vulns"><b>Уязвимости:</b>' + d.vulns.map((v) => '<div>' + escapeHtml(v) + '</div>').join('') + '</div>';
  }
  html += '</div></div>';
  out.innerHTML = html;
}
