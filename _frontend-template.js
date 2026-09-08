// ШАБЛОН фронта под свой API. Подключи скриптом и поправь 3 места.
// Пример HTML:
//   <form id="myForm" class="search">
//     <input id="myQuery" class="search__input" placeholder="Запрос…" />
//     <button class="search__btn" type="submit">Найти</button>
//   </form>
//   <div id="myResults" class="results"></div>

// 1. URL своей функции:
const MY_API = '/api/mysite';

const myForm = document.getElementById('myForm');
const myInput = document.getElementById('myQuery');
const myOut = document.getElementById('myResults');

function myEsc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// 2. Как превратить 1 элемент ответа в карточку (поля — под свой API):
function myCard(item) {
  const title = item.title || item.name || item.url || '—';
  const sub = item.description || item.text || '';
  return '<div class="card"><div class="card__ip">' + myEsc(title) + '</div>' +
    (sub ? '<div class="card__meta">' + myEsc(sub) + '</div>' : '') + '</div>';
}

myForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const q = myInput.value.trim();
  if (!q) return;
  myOut.innerHTML = '<p class="muted">Загрузка…</p>';
  try {
    // 3. Какие параметры уходят (q= — поправь под свой API):
    const res = await fetch(MY_API + '?q=' + encodeURIComponent(q));
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      throw new Error('API не отвечает (проверь что функция задеплоена на Vercel)');
    }
    if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));
    const items = data.items || [];
    if (!items.length) {
      myOut.innerHTML = '<p class="muted">Ничего не найдено.</p>';
      return;
    }
    myOut.innerHTML = '<div class="cards">' + items.map(myCard).join('') + '</div>';
  } catch (err) {
    myOut.innerHTML = '<p class="error">Ошибка: ' + myEsc(err.message) + '</p>';
  }
});
