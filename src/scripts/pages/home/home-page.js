import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Idb from '../../utils/idb.js';

const API_BASE_URL = 'https://story-api.dicoding.dev/v1';

function createElementFromHTML(htmlString) {
  const div = document.createElement('div');
  div.innerHTML = htmlString.trim();
  return div.firstChild;
}

export default class HomePage {
  constructor() {
    this._stories = [];
    this._markers = [];
    this._map = null;
    this._markerLayer = null;
    this._defaultIcon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
    });
    this._highlightIcon = L.icon({
      iconUrl: 'images/marker-icon-red.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
    });
  }

  async render() {
    return `
      <a class="skip-link" href="#main-content">Skip to content</a>
      <section class="hero container">
        <h1>🌍 Berbagi Cerita</h1>
        <p>Temukan cerita dari pengguna lainnya di peta, atau tambahkan ceritamu sendiri.</p>
        <p><a href="#/add-story" class="btn btn-primary">Tambah Cerita</a></p>
      </section>

      <section class="main container app-grid">
        <aside class="list-panel" id="story-list" tabindex="0">
          <h2>Daftar Cerita</h2>
          <div id="list-items" class="story-list">Memuat...</div>
        </aside>

        <div class="map-panel">
          <div id="map" style="min-height:400px;border-radius:12px;overflow:hidden;"></div>
        </div>
      </section>
    `;
  }

  async afterRender() {
    await this._waitForMapElement();
    this._initMapSafe();
    await this._fetchStories();
    this._renderList();
    this._renderMarkers();
    this._setupInteraction();
    this._setupLocalButtons();

    setTimeout(() => {
      if (this._map) this._map.invalidateSize();
    }, 500);
  }

  async _waitForMapElement() {
    let retries = 0;
    while (!document.getElementById('map') && retries < 10) {
      await new Promise((res) => setTimeout(res, 100));
      retries++;
    }
  }

  _initMapSafe() {
    const mapContainer = L.DomUtil.get('map');
    if (mapContainer && mapContainer._leaflet_id) {
      mapContainer._leaflet_id = null;
    }

    this._map = L.map('map', { zoomControl: true }).setView([-6.9, 107.6], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(this._map);

    this._markerLayer = L.layerGroup().addTo(this._map);
  }

  async _fetchStories() {
    try {
      const token = localStorage.getItem('token');

      if (!token) {
        console.warn('⚠️ Belum login — ambil data dari IndexedDB saja');
        this._stories = await Idb.getAllStories();
        return;
      }

      const response = await fetch(`${API_BASE_URL}/stories`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Gagal ambil dari API');

      const data = await response.json();
      this._stories = data.listStory || [];

      for (const story of this._stories) {
        await Idb.saveStory(story);
      }

      console.log('✅ Cerita dari API disimpan ke IndexedDB');
    } catch (err) {
      console.warn('⚠️ Tidak bisa ambil dari API, pakai IndexedDB');
      this._stories = await Idb.getAllStories();
    }
  }

  _renderList() {
    const container = document.getElementById('list-items');
    if (!container) return;

    container.innerHTML = this._stories.length
      ? ''
      : '<p>Tidak ada cerita.</p>';

    this._stories.forEach((story, idx) => {
      const created = story.createdAt
        ? new Date(story.createdAt).toLocaleString()
        : 'Tanggal tidak tersedia';
      const html = `
        <article class="story-item" data-idx="${idx}" tabindex="0">
          <img src="${story.photoUrl}" alt="${story.name}" class="story-thumb" />
          <div class="story-meta">
            <h3>${story.name}</h3>
            <p class="desc">${story.description}</p>
            <p class="meta">📅 ${created}</p>
            <div class="story-actions">
              <button class="save-local-btn" data-id="${story.id}">💾 Simpan Lokal</button>
              <button class="delete-local-btn" data-id="${story.id}">🗑️ Hapus Lokal</button>
            </div>
          </div>
        </article>
      `;
      container.appendChild(createElementFromHTML(html));
    });
  }

  _renderMarkers() {
    if (!this._markerLayer || !this._map) return;

    this._markerLayer.clearLayers();
    this._markers = [];

    this._stories.forEach((story, idx) => {
      if (!story.lat || !story.lon) return;

      const created = story.createdAt
        ? new Date(story.createdAt).toLocaleString()
        : '';
      const popupHtml = `<strong>${story.name}</strong><br>${story.description}<br><small>${created}</small>`;

      const marker = L.marker([story.lat, story.lon], { icon: this._defaultIcon })
        .bindPopup(popupHtml)
        .addTo(this._markerLayer);

      marker._storyIdx = idx;
      this._markers.push(marker);
    });

    const latlngs = this._markers.map((m) => m.getLatLng());
    if (latlngs.length) {
      this._map.fitBounds(L.latLngBounds(latlngs).pad(0.2));
    }

    setTimeout(() => this._map.invalidateSize(), 200);
  }

  _clearHighlight() {
    this._markers.forEach((m) => m.setIcon(this._defaultIcon));
    document.querySelectorAll('.story-item.active').forEach((el) =>
      el.classList.remove('active')
    );
  }

  _highlightByIndex(idx) {
    this._clearHighlight();
    const marker = this._markers.find((m) => m._storyIdx === idx);
    if (marker) {
      marker.setIcon(this._highlightIcon);
      marker.openPopup();
      this._map.flyTo(marker.getLatLng(), 12);
    }
    const item = document.querySelector(`.story-item[data-idx="${idx}"]`);
    if (item) {
      item.classList.add('active');
      item.scrollIntoView({ block: 'nearest' });
    }
  }

  _setupInteraction() {
    const list = document.getElementById('list-items');
    if (!list) return;

    list.addEventListener('click', (e) => {
      const el = e.target.closest('.story-item');
      if (!el) return;
      this._highlightByIndex(parseInt(el.dataset.idx, 10));
    });

    this._markers.forEach((marker) => {
      marker.on('click', () => this._highlightByIndex(marker._storyIdx));
    });
  }

  _setupLocalButtons() {
    const container = document.getElementById('list-items');
    if (!container || container.dataset.listenerAttached) return;
    container.dataset.listenerAttached = true;

    container.addEventListener('click', async (event) => {
      if (event.target.classList.contains('save-local-btn')) {
        const storyId = event.target.dataset.id;
        const story = this._stories.find((s) => s.id === storyId);
        if (story) {
          await Idb.saveStory(story);
          alert(`✅ Cerita "${story.name}" disimpan ke lokal.`);
        }
      }

      if (event.target.classList.contains('delete-local-btn')) {
        const storyId = event.target.dataset.id;
        await Idb.deleteStory(storyId);
        alert('🗑️ Cerita dihapus dari penyimpanan lokal.');
      }
    });
  }
}
