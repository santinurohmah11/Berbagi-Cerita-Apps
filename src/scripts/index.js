import App from './pages/app';
import '../styles/styles.css';
import { getActiveRoute } from './routes/url-parser';

// ==== DOM Ready ====
document.addEventListener('DOMContentLoaded', () => {
  const app = new App({
    navigationDrawer: document.getElementById('navigation-drawer'),
    drawerButton: document.getElementById('drawer-button'),
    content: document.getElementById('main-content'),
  });

  // ==== NAV LOGIN/LOGOUT ====
  function updateNav() {
    const navList = document.querySelector('.nav-list');
    if (!navList) return;

    let loginLi = navList.querySelector('li.login-li');
    if (!loginLi) {
      const existingLogin = navList.querySelector('a[href="#/login"]');
      if (existingLogin) {
        const parent = existingLogin.closest('li');
        if (parent) {
          parent.classList.add('login-li');
          loginLi = parent;
        }
      }
    }

    if (!loginLi) {
      loginLi = document.createElement('li');
      loginLi.classList.add('login-li');
      navList.appendChild(loginLi);
    }

    const token = localStorage.getItem('token');
    if (token) {
      loginLi.innerHTML = `<a href="#/logout" id="logout-link">Logout ${localStorage.getItem('name') ? '(' + localStorage.getItem('name') + ')' : ''}</a>`;
      const logoutLink = document.getElementById('logout-link');
      if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
          e.preventDefault();
          localStorage.removeItem('token');
          localStorage.removeItem('name');
          window.dispatchEvent(new CustomEvent('auth:changed', { detail: { loggedIn: false } }));
          window.location.hash = '#/login';
        });
      }
    } else {
      loginLi.innerHTML = `<a href="#/login">Login</a>`;
    }
  }

  updateNav();
  app.renderPage();

  window.addEventListener('hashchange', async () => {
    const main = document.getElementById('main-content');

    if (document.startViewTransition) {
      // ✅ Terapkan transisi nyata (seperti di modul Dicoding)
      document.startViewTransition(async () => {
        main.classList.add('fade-out');
        await app.renderPage();
        main.classList.remove('fade-out');
        main.classList.add('fade-in');
        setTimeout(() => main.classList.remove('fade-in'), 400);
      });
    } else {
      // fallback animasi biasa kalau browser tidak mendukung
      main.classList.add('fade-out');
      setTimeout(async () => {
        await app.renderPage();
        main.classList.remove('fade-out');
        main.classList.add('fade-in');
        setTimeout(() => main.classList.remove('fade-in'), 400);
      }, 200);
    }
  });



  window.addEventListener('auth:changed', () => updateNav());
  window.addEventListener('story:added', async () => {
    const activeRoute = getActiveRoute();
    if (activeRoute === '/') {
      await app.renderPage();
    }
  });

  const drawerBtn = document.getElementById('drawer-button');
  if (drawerBtn) {
    drawerBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        drawerBtn.click();
      }
    });
  }
});

// ==== PUSH NOTIFICATION & SERVICE WORKER ====
async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  try {
    // 🔧 Fix path untuk GitHub Pages dan localhost
    const basePath = window.location.hostname.includes('github.io')
      ? '/Berbagi-Cerita-Apps'
      : '';

    const registration = await navigator.serviceWorker.register(`${basePath}/service-worker.js`);
    console.log('✅ Service Worker registered:', registration);

    const readyReg = await navigator.serviceWorker.ready;
    console.log('✅ Service Worker ready!');

    // ==== Minta izin notifikasi ====
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('🚫 Izin notifikasi ditolak pengguna.');
      return;
    }

    // ==== Subscribsi ke push ====
    await subscribeUserToPush(readyReg);

    // 🔔 Tes notifikasi lokal
    readyReg.showNotification('Tes Notifikasi!', {
      body: 'Service Worker aktif dan notifikasi siap digunakan 🚀',
      icon: `${basePath}/images/logo.png`,
      badge: `${basePath}/images/favicon.png`,
    });
  } catch (error) {
    console.error('❌ Service Worker registration failed:', error);
  }
}

async function subscribeUserToPush(registration) {
  try {
    const vapidPublicKey = 'BCCs2eonMI-6H2ctvFaWg-UYdDv387Vno_bzUzALpB442r2lCnsHmtrx8biyPi_E-1fSGABK_Qs_GlvPoJJqxbk';
    const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

    // Cek apakah sudah ada subscription
    let subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      console.log('🔔 Already subscribed to push notifications.');
      return;
    }

    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey,
    });

    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('⚠️ User not logged in, skip push subscription.');
      return;
    }

    const subscriptionObject = subscription.toJSON();
    const payload = {
      endpoint: subscriptionObject.endpoint,
      keys: {
        p256dh: subscriptionObject.keys.p256dh,
        auth: subscriptionObject.keys.auth,
      },
    };

    const response = await fetch('https://story-api.dicoding.dev/v1/notifications/subscribe', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error(`Failed to subscribe: ${response.statusText}`);

    console.log('✅ Subscribed to push notifications:', payload);
  } catch (error) {
    console.error('❌ Push subscription failed:', error);
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Jalankan register setelah window load
window.addEventListener('load', async () => {
  setTimeout(registerServiceWorker, 2000);
});
