import App from './app';
import './styles/styles.css';



const app = new App({
  navigationDrawer: document.querySelector('#navigation-drawer'),
  drawerButton: document.querySelector('#drawer-button'),
  content: document.querySelector('#main-content'),
});

window.addEventListener('hashchange', () => {
  app.renderPage();
});

window.addEventListener('load', () => {
  app.renderPage();
});


// Pendaftaran Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./service-worker.js')
      .then(() => console.log('✅ Service Worker terdaftar'))
      .catch((err) => console.log('❌ Service Worker gagal:', err));
  });
}
