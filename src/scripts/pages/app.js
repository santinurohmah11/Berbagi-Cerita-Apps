import routes from '../routes/routes';
import { getActiveRoute } from '../routes/url-parser';

let isRendering = false;

class App {
  #content = null;
  #drawerButton = null;
  #navigationDrawer = null;

  constructor({ navigationDrawer, drawerButton, content }) {
    this.#content = content;
    this.#drawerButton = drawerButton;
    this.#navigationDrawer = navigationDrawer;
    this._setupDrawer();
  }

  _setupDrawer() {
    if (!this.#drawerButton || !this.#navigationDrawer) return;

    this.#drawerButton.addEventListener('click', (e) => {
      e.stopPropagation();
      this.#navigationDrawer.classList.toggle('open');
    });

    document.body.addEventListener('click', (event) => {
      if (
        this.#navigationDrawer &&
        !this.#navigationDrawer.contains(event.target) &&
        !this.#drawerButton.contains(event.target)
      ) {
        this.#navigationDrawer.classList.remove('open');
      }
    });

    this.#navigationDrawer.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        this.#navigationDrawer.classList.remove('open');
      });
    });
  }

  async renderPage() {
    if (isRendering) return;
    isRendering = true;

    try {
      const url = getActiveRoute();
      const page = routes[url] || routes['/'];

      this.#content.classList.remove('fade-in');
      this.#content.classList.add('fade-out');

      setTimeout(async () => {
        const renderedHTML = await page.render();
        this.#content.innerHTML = renderedHTML;
        await page.afterRender();

        this._refreshMapIfAny();

        this.#content.classList.remove('fade-out');
        this.#content.classList.add('fade-in');

        isRendering = false;
      }, 150);
    } catch (err) {
      console.error(err);
      isRendering = false;
    }
  }

  _refreshMapIfAny() {
    const mapEl = document.getElementById('map');
    if (mapEl) {
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 400);
    }
  }
}

export default App;
