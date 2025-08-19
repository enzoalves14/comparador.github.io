document.addEventListener('DOMContentLoaded', () => {
  const $ = (sel, el = document) => el.querySelector(sel);
  const token = localStorage.getItem('token');
  const isGuest = localStorage.getItem('guest') === 'true';

  async function loadProfile() {
    if (!token) return;
    try {
      const res = await fetch('/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return;
      const user = await res.json();
      if ($('#name')) $('#name').value = user.name || '';
      if ($('#email')) $('#email').value = user.email || '';
      if ($('#avatar') && user.avatar) $('#avatar').value = user.avatar;
    } catch (err) {
      // ignore
    }
  }

  const form = $('form');

  if (document.body.classList.contains('page-login')) {
    form?.addEventListener('submit', async e => {
      e.preventDefault();
      const username = $('#user').value.trim();
      const password = $('#pass').value;
      const res = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('token', data.token);
        localStorage.removeItem('guest');
        window.location.href = 'index.html';
      } else {
        alert('Falha no login');
      }
    });

    $('#guest')?.addEventListener('click', () => {
      localStorage.removeItem('token');
      localStorage.setItem('guest', 'true');
      window.location.href = 'index.html';
    });
  }

  if (document.body.classList.contains('page-register')) {
    form?.addEventListener('submit', async e => {
      e.preventDefault();
      const username = $('#user').value.trim();
      const password = $('#pass').value;
      const name = $('#name').value.trim();
      const email = $('#email').value.trim();
      const res = await fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, name, email })
      });
      if (res.ok) {
        window.location.href = 'login.html';
      } else {
        alert('Erro no cadastro');
      }
    });
  }

  if (document.body.classList.contains('page-profile')) {
      if (!token && !isGuest) {
        window.location.href = 'login.html';
        return;
      }
    loadProfile();
    form?.addEventListener('submit', e => {
      e.preventDefault();
      alert('Salvar perfil não implementado');
    });
  }
});
