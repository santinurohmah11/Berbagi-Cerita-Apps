const API_BASE_URL = 'https://story-api.dicoding.dev/v1';

export default class RegisterPage {
  async render() {
    return `
      <section class="container" aria-labelledby="register-title">
        <h1 id="register-title">Daftar Akun</h1>

        <form id="register-form" class="form">
          <div class="form-row">
            <label for="name">Nama</label>
            <input id="name" name="name" type="text" required />
          </div>

          <div class="form-row">
            <label for="email">Email</label>
            <input id="email" name="email" type="email" required />
          </div>

          <div class="form-row">
            <label for="password">Password</label>
            <input id="password" name="password" type="password" required />
          </div>

          <button type="submit">Daftar</button>
          <p id="register-msg" role="alert"></p>
        </form>
      </section>
    `;
  }

  async afterRender() {
    const form = document.getElementById('register-form');
    const msg = document.getElementById('register-msg');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = document.getElementById('name').value.trim();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value.trim();

      msg.textContent = 'Mendaftarkan akun...';

      try {
        const res = await fetch(`${API_BASE_URL}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password })
        });

        const data = await res.json();

        if (!res.ok) throw new Error(data.message || 'Gagal daftar');

        msg.textContent = 'Akun berhasil dibuat! Silakan login.';
        window.location.hash = '#/login';
      } catch (err) {
        msg.textContent = `Gagal daftar: ${err.message}`;
      }
    });
  }
}
