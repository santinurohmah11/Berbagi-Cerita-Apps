const API_BASE_URL = 'https://story-api.dicoding.dev/v1';

export default class LoginPage {
  async render() {
    return `
      <section class="login container" aria-labelledby="login-title">
        <h2 id="login-title">Masuk Akun</h2>
        <form id="loginForm" class="form">
          <label for="email">Email</label>
          <input type="email" id="email" name="email" required aria-required="true" placeholder="Masukkan email" />

          <label for="password">Password</label>
          <input type="password" id="password" name="password" required aria-required="true" placeholder="Masukkan password" />

          <button type="submit" class="btn">Masuk</button>
        </form>

        <p>Belum punya akun? <a href="#/register">Daftar di sini</a></p>
        <p id="loginMessage" role="alert" style="color:red;"></p>
      </section>
    `;
  }

  async afterRender() {
    const form = document.querySelector('#loginForm');
    const messageEl = document.querySelector('#loginMessage');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      messageEl.textContent = 'Memproses...';

      const email = form.email.value.trim();
      const password = form.password.value.trim();

      try {
        const res = await fetch(`${API_BASE_URL}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || 'Login gagal');
        }

        // Simpan token ke localStorage
        localStorage.setItem('token', data.loginResult.token);
        localStorage.setItem('name', data.loginResult.name);

        // dispatch event supaya nav dan UI update
        window.dispatchEvent(new CustomEvent('auth:changed', { detail: { loggedIn: true } }));

        messageEl.style.color = 'green';
        messageEl.textContent = 'Login berhasil!';

        // Arahkan ke halaman utama
        setTimeout(() => {
          window.location.hash = '#/';
        }, 600);
      } catch (err) {
        messageEl.style.color = 'red';
        messageEl.textContent = err.message;
      }
    });
  }
}
