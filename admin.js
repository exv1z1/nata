const adminMsg = document.getElementById('adminMsg');
const invForm = document.getElementById('invForm');
const invCount = document.getElementById('invCount');
const invNew = document.getElementById('invNew');
const invList = document.getElementById('invList');
const usersList = document.getElementById('usersList');

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

async function init() {
  const me = await fetch('/api/auth/me').then((r) => r.json()).catch(() => ({}));
  if (!me.user || me.user.role !== 'admin') {
    adminMsg.textContent = 'Только для админов. Войди под админ-аккаунтом.';
    adminMsg.className = 'error';
    document.getElementById('invBox').classList.add('hidden');
    document.getElementById('usersBox').classList.add('hidden');
    return;
  }
  adminMsg.textContent = 'Ты: ' + me.user.nick;
  loadInvites();
  loadUsers();
}

async function loadInvites() {
  const res = await fetch('/api/admin/invites');
  const data = await res.json();
  if (!res.ok) {
    invList.innerHTML = '<p class="error">' + esc(data.error || 'Ошибка') + '</p>';
    return;
  }
  invList.innerHTML = (data.invites || []).map((i) => {
    const used = !!i.used_by_nick;
    // Свободные коды в списке замаскированы — полный виден только по клику
    const shown = used ? esc(i.code) : esc(i.code.slice(0, 9) + '••••••');
    return '<div class="card"><div class="card__ip">' + shown + '</div>' +
      '<div class="card__meta">' + (used ? 'использован: ' + esc(i.used_by_nick) : 'свободен') + '</div>' +
      (!used ? '<button class="btn btn--small" data-reveal="' + esc(i.code) + '">Показать</button>' : '') +
      (!used ? '<button class="btn btn--small" data-revoke="' + esc(i.code) + '">Удалить</button>' : '') +
      '</div>';
  }).join('') || '<p class="muted">Инвайтов нет.</p>';
}

invList.addEventListener('click', async (e) => {
  const rv = e.target.closest('[data-reveal]');
  if (rv) {
    const card = rv.closest('.card');
    card.querySelector('.card__ip').textContent = rv.dataset.reveal;
    rv.remove();
    return;
  }
  const del = e.target.closest('[data-revoke]');
  if (del) {
    if (!confirm('Удалить инвайт ' + del.dataset.revoke + '?')) return;
    const res = await fetch('/api/admin/invites', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: del.dataset.revoke }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || 'Ошибка');
      return;
    }
    invNew.innerHTML = '';
    loadInvites();
  }
});

invForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const res = await fetch('/api/admin/invites', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ count: Number(invCount.value) || 5 }),
  });
  const data = await res.json();
  if (!res.ok) {
    alert(data.error || 'Ошибка');
    return;
  }
  invNew.innerHTML = '<p class="muted">Новые коды (раздай их):</p><div class="cards">' +
    data.codes.map((c) => '<div class="card"><div class="card__ip">' + esc(c) + '</div></div>').join('') + '</div>';
  loadInvites();
});

async function loadUsers() {
  const res = await fetch('/api/admin/users');
  const data = await res.json();
  if (!res.ok) {
    usersList.innerHTML = '<p class="error">' + esc(data.error || 'Ошибка') + '</p>';
    return;
  }
  usersList.innerHTML = (data.users || []).map((u) =>
    '<div class="card"><div class="card__ip">' + esc(u.nick) + '</div>' +
    '<div class="card__meta">@' + esc(u.login) + ' · ' + esc(u.role) + '</div>' +
    (data.owner && u.role !== 'admin'
      ? '<button class="btn btn--small" data-make="' + esc(u.login) + '">Сделать админом</button>' : '') +
    (data.owner && u.role === 'admin'
      ? '<button class="btn btn--small" data-demote="' + esc(u.login) + '">Разжаловать</button>' : '') +
    '</div>'
  ).join('');
}

usersList.addEventListener('click', async (e) => {
  const mk = e.target.closest('[data-make]');
  const dm = e.target.closest('[data-demote]');
  const btn = mk || dm;
  if (!btn) return;
  const res = await fetch('/api/admin/users', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      login: mk ? mk.dataset.make : dm.dataset.demote,
      role: mk ? 'admin' : 'user',
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    alert(data.error || 'Ошибка');
    return;
  }
  loadUsers();
});

init();
