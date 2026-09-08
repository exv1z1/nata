const lxForm = document.getElementById('lxForm');
const lxInput = document.getElementById('lxQuery');
const lxOut = document.getElementById('lxResults');

function lxEscape(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

lxForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const query = lxInput.value.trim();
  if (!query) return;
  lxOut.innerHTML = '<p class="muted">Ищем…</p>';
  try {
    // Чистый IP -> lookup, всё остальное -> текстовый поиск
    const param = /^[0-9a-fA-F:.]{2,60}$/.test(query) && !/[ +\-()]/.test(query) ? 'ip' : 'q';
    const res = await fetch('/api/leakix?' + param + '=' + encodeURIComponent(query));
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      throw new Error('API не отвечает (Vercel не задеплоил /api/leakix — проверь деплой)');
    }
    if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));
    lxRender(query, data);
  } catch (err) {
    lxOut.innerHTML = '<p class="error">Ошибка: ' + lxEscape(err.message) + '</p>';
  }
});

function lxCard(x) {
  let html = '<div class="card"><div class="card__ip">' + lxEscape([x.ip, x.port].filter(Boolean).join(':') || '—') +
    (x.protocol ? ' / ' + lxEscape(x.protocol) : '') + '</div>';
  const meta = [x.host, x.software, x.severity, x.dataset].filter(Boolean).join(' · ');
  if (meta) html += '<div class="card__meta">' + lxEscape(meta) + '</div>';
  return html + '</div>';
}

function lxRender(query, d) {
  if ((!d.services || !d.services.length) && (!d.leaks || !d.leaks.length)) {
    lxOut.innerHTML = '<p class="muted">Ничего не найдено по запросу «' + lxEscape(query) + '».</p>';
    return;
  }
  let html = '<p class="muted">«' + lxEscape(query) + '» · сервисов: ' + d.services.length +
    ' · утечек: ' + d.leaks.length + '</p>';

  if (d.leaks.length) {
    html += '<p class="error">Утечки:</p><div class="cards">';
    for (const l of d.leaks) html += lxCard(l);
    html += '</div>';
  }
  if (d.services.length) {
    html += '<p class="muted">Сервисы:</p><div class="cards">';
    for (const s of d.services) html += lxCard(s);
    html += '</div>';
  }
  lxOut.innerHTML = html;
}
