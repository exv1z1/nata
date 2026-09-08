const tabLogin = document.getElementById('tabLogin');
const tabReg = document.getElementById('tabReg');
const loginForm = document.getElementById('loginForm');
const regForm = document.getElementById('regForm');
const msg = document.getElementById('authMsg');

tabLogin.addEventListener('click', () => {
  tabLogin.classList.add('tab--active');
  tabReg.classList.remove('tab--active');
  loginForm.classList.remove('hidden');
  regForm.classList.add('hidden');
});

tabReg.addEventListener('click', () => {
  tabReg.classList.add('tab--active');
  tabLogin.classList.remove('tab--active');
  regForm.classList.remove('hidden');
  loginForm.classList.add('hidden');
});

async function post(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));
  return data;
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  msg.textContent = '';
  try {
    await post('/api/auth/login', {
      login: document.getElementById('loginLogin').value.trim(),
      password: document.getElementById('loginPass').value,
    });
    location.href = 'index.html';
  } catch (err) {
    msg.textContent = err.message;
    msg.className = 'error';
  }
});

regForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  msg.textContent = '';
  try {
    await post('/api/auth/register', {
      nick: document.getElementById('regNick').value.trim(),
      login: document.getElementById('regLogin').value.trim(),
      password: document.getElementById('regPass').value,
      invite: document.getElementById('regInvite').value.trim(),
    });
    location.href = 'index.html';
  } catch (err) {
    msg.textContent = err.message;
    msg.className = 'error';
  }
});
