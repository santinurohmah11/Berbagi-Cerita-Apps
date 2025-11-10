import "leaflet/dist/leaflet.css";
import L from "leaflet";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const STORY_API = "https://story-api.dicoding.dev/v1/stories";

export default class AddStoryPage {
  constructor() {
    this._map = null;
    this._pickedLatLng = null;
    this._videoStream = null;
    this._selectedMarker = null;
  }

  async render() {
    return `
      <section class="container add-story" aria-labelledby="add-title">
        <h1 id="add-title">Tambah Cerita</h1>

        <form id="add-story-form" class="form" novalidate autocomplete="off">
          <div class="form-row">
            <label for="story-name">Nama</label>
            <input 
              id="story-name" 
              name="name" 
              type="text" 
              required 
              placeholder="Masukkan nama Anda"
              autocomplete="name"
            />
          </div>

          <div class="form-row">
            <label for="story-description">Deskripsi</label>
            <textarea 
              id="story-description" 
              name="description" 
              rows="4" 
              required 
              placeholder="Tuliskan cerita Anda..." 
              autocomplete="off"
            ></textarea>
          </div>

          <div class="form-row">
            <label for="story-photo">Foto (upload atau gunakan kamera)</label>
            <input 
              id="story-photo" 
              name="photo" 
              type="file" 
              accept="image/*"
              autocomplete="off"
            />
            <div class="camera-controls">
              <button type="button" id="start-camera">🎥 Buka Kamera</button>
              <button type="button" id="capture-photo" disabled>📸 Ambil Foto</button>
              <button type="button" id="stop-camera" disabled>✖ Tutup Kamera</button>
            </div>
            <video id="video" autoplay playsinline style="display:none; max-width:100%; border-radius:8px;"></video>
            <canvas id="canvas" style="display:none;"></canvas>
            <img id="preview" alt="" style="display:block; max-width:200px; margin-top:8px; border-radius:8px;" />
          </div>

          <div class="form-row">
            <label for="form-map">Pilih Lokasi (klik pada peta)</label>
            <div id="form-map" style="min-height:300px; border:1px solid #ddd; border-radius:8px;"></div>
            <input id="story-lat" name="lat" type="hidden" />
            <input id="story-lon" name="lon" type="hidden" />
            <p id="location-hint" aria-live="polite" style="margin-top:6px; color:#555;">Lokasi belum dipilih</p>
          </div>

          <div class="form-row">
            <button type="submit" id="submit-btn">Kirim Cerita</button>
            <div id="form-message" role="status" aria-live="polite" style="margin-top:8px;"></div>
          </div>
        </form>
      </section>
    `;
  }

  async afterRender() {
    this._initMap();
    this._initForm();
  }

  _initForm() {
    const form = document.getElementById("add-story-form");
    const photoInput = document.getElementById("story-photo");
    const preview = document.getElementById("preview");
    const startBtn = document.getElementById("start-camera");
    const captureBtn = document.getElementById("capture-photo");
    const stopBtn = document.getElementById("stop-camera");
    const video = document.getElementById("video");
    const canvas = document.getElementById("canvas");
    const msg = document.getElementById("form-message");
    const submitBtn = document.getElementById("submit-btn");
    const locationHint = document.getElementById("location-hint");

    // === Preview file upload ===
    photoInput.addEventListener("change", () => {
      const file = photoInput.files[0];
      if (file) {
        preview.src = URL.createObjectURL(file);
        preview.alt = "Preview gambar yang diupload";
      } else {
        preview.removeAttribute("src");
        preview.removeAttribute("alt");
      }
    });

    // === Kamera ===
    startBtn.addEventListener("click", async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        this._videoStream = stream;
        video.srcObject = stream;
        video.style.display = "block";
        captureBtn.disabled = false;
        stopBtn.disabled = false;
        startBtn.disabled = true;
        if (msg) msg.textContent = "Kamera aktif. Arahkan dan ambil foto.";
      } catch {
        if (msg) msg.textContent = "❌ Tidak dapat mengakses kamera.";
      }
    });

    captureBtn.addEventListener("click", () => {
      if (!this._videoStream) return;
      const ctx = canvas.getContext("2d");
      const scale = 800 / video.videoWidth;
      const newWidth = 800;
      const newHeight = video.videoHeight * scale;

      canvas.width = newWidth;
      canvas.height = newHeight;
      ctx.drawImage(video, 0, 0, newWidth, newHeight);

      canvas.toBlob(
        (blob) => {
          const file = new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" });
          const dt = new DataTransfer();
          dt.items.add(file);
          photoInput.files = dt.files;
          preview.src = URL.createObjectURL(file);
          preview.alt = "Foto hasil capture (terkompres)";
          if (msg) msg.textContent = "✅ Foto berhasil diambil dan dikompres.";
        },
        "image/jpeg",
        0.7
      );
    });

    stopBtn.addEventListener("click", () => {
      this._stopVideoStream();
      video.style.display = "none";
      captureBtn.disabled = true;
      stopBtn.disabled = true;
      startBtn.disabled = false;
      if (msg) msg.textContent = "Kamera dimatikan.";
    });

    // === Submit form ===
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (msg) msg.textContent = "";

      const name = document.getElementById("story-name").value.trim();
      const description = document.getElementById("story-description").value.trim();
      const lat = document.getElementById("story-lat").value;
      const lon = document.getElementById("story-lon").value;
      const photoFile = photoInput.files[0];
      const token = localStorage.getItem("token");

      if (!token) {
        alert("Anda harus login terlebih dahulu!");
        window.location.hash = "#/login";
        return;
      }

      if (!name || !description) {
        if (msg) {
          msg.textContent = "❗ Nama dan deskripsi wajib diisi.";
          msg.style.color = "red";
        }
        return;
      }
      if (!lat || !lon) {
        if (msg) {
          msg.textContent = "❗ Silakan pilih lokasi di peta.";
          msg.style.color = "red";
        }
        return;
      }
      if (!photoFile) {
        if (msg) {
          msg.textContent = "❗ Upload foto atau ambil dengan kamera.";
          msg.style.color = "red";
        }
        return;
      }

      const fd = new FormData();
      fd.append("description", `${name}: ${description}`);
      fd.append("lat", lat);
      fd.append("lon", lon);
      fd.append("photo", photoFile);

      submitBtn.disabled = true;
      submitBtn.textContent = "Mengirim...";
      msg.style.color = "#333";

      try {
        const res = await fetch(STORY_API, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Gagal mengirim cerita");

        if (msg) {
          msg.style.color = "green";
          msg.textContent = "✅ Cerita berhasil dikirim!";
        }

        window.location.hash = "#/";
        window.dispatchEvent(new CustomEvent("story:added"));
        form.reset();

        if (preview) {
          preview.removeAttribute("src");
          preview.removeAttribute("alt");
        }

        if (locationHint) {
          locationHint.textContent = "Lokasi belum dipilih";
        }

        this._pickedLatLng = null;
      } catch (err) {
        console.error(err);
        if (msg) {
          msg.style.color = "red";
          msg.textContent = `❌ ${err.message}`;
        }
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Kirim Cerita";
        this._stopVideoStream();
      }
    });
  }

  _initMap() {
    this._map = L.map("form-map", {
      center: [-6.914744, 107.60981],
      zoom: 10,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(this._map);

    this._map.on("click", (e) => {
      this._pickedLatLng = e.latlng;
      document.getElementById("story-lat").value = e.latlng.lat;
      document.getElementById("story-lon").value = e.latlng.lng;
      const hint = document.getElementById("location-hint");
      if (hint) {
        hint.textContent = `📍 Lokasi dipilih: ${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}`;
      }

      if (this._selectedMarker) {
        this._selectedMarker.setLatLng(e.latlng);
      } else {
        this._selectedMarker = L.marker(e.latlng).addTo(this._map);
      }
      this._map.flyTo(e.latlng, 12);
    });
  }

  _stopVideoStream() {
    if (this._videoStream) {
      this._videoStream.getTracks().forEach((track) => track.stop());
      this._videoStream = null;
    }
  }
}
