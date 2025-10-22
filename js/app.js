// app.js — boot + footer player wiring (clean)

// --- IMPORT ---
import { settings } from '../content/settings.js';
import { releases } from '../content/releases.js';
import { renderHeaderFooter } from './utils.js';
import { playReleaseNow, addToQueue, wireFooterControls } from './components/footerPlayer.js';

// --- DEBUG HELP (facoltativo: utile da mobile) ---
window.BSR = window.BSR || {};
window.BSR.releases = releases;

// 1) Header/footer del sito
renderHeaderFooter(settings);

// 2) CREA il contenitore del player (shell, nessuna logica qui)
(function ensureAudioFooter(){
  if (document.getElementById('audio-footer')) return;
  const bar = document.createElement('div');
  bar.id = 'audio-footer';
  bar.innerHTML = `
    <div class="wrap">
      <div class="cover"></div>
      <div class="right">
        <div class="top">
          <div class="wave">
            <div class="wf">
              <svg class="wf-bg" viewBox="0 0 100 36">
                <rect x="0" y="10" width="100" height="16" rx="4" ry="4"/>
              </svg>
              <div class="wf-played">
                <svg class="wf-fg" viewBox="0 0 100 36">
                  <rect x="0" y="10" width="100" height="16" rx="4" ry="4"/>
                </svg>
              </div>
            </div>
          </div>
          <div class="time"><span class="t0">0:00</span> / <span class="ttot">0:00</span></div>
        </div>
        <div class="bottom">
          <div class="meta">
            <span class="title">—</span>
            <span class="artist">—</span>
            <span class="cat">—</span>
          </div>
          <div class="controls">
            <button class="btn-ctl prev" aria-label="Previous">‹</button>
            <button class="btn-ctl toggle" aria-label="Play/Pause">⏯</button>
            <button class="btn-ctl next" aria-label="Next">›</button>
          </div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(bar);
  // Mostralo solo quando parte una traccia
  bar.style.display = 'block';
})();

// 3) Attacca i listener dei bottoni del footer (prev/toggle/next)
wireFooterControls();

// 4) Listener globali: Play (parte e accoda se serve) + Add (accoda e basta)
//    Evita doppie bind se per qualunque motivo app.js venisse ricaricato.
if (!window.__BSR_LISTENERS_BOUND__) {
  window.__BSR_LISTENERS_BOUND__ = true;

  // PLAY ORA
  document.addEventListener('click', (e)=>{
    const el = e.target.closest('[data-action="play"]');
    if (!el) return;
    e.preventDefault();
    const slug = el.dataset.slug;
    if (!slug) { console.warn('Play: missing data-slug'); return; }
    const rel  = releases.find(r => r.slug === slug);
    if (!rel)  { console.warn('Play: release not found for', slug); return; }
    // mostra il footer alla prima riproduzione
    const bar = document.getElementById('audio-footer');
    if (bar) bar.style.display = 'block';
    playReleaseNow(rel);
  });

  // ACCODA (non parte)
  document.addEventListener('click', (e)=>{
    const el = e.target.closest('[data-action="queue"]');
    if (!el) return;
    e.preventDefault();
    const slug = el.dataset.slug;
    if (!slug) { console.warn('Queue: missing data-slug'); return; }
    const rel  = releases.find(r => r.slug === slug);
    if (!rel)  { console.warn('Queue: release not found for', slug); return; }
    addToQueue(rel);
  });
}

// ---------- Dispatch by body data-page attribute ----------
const page = document.body.dataset.page;

(async () => {
  try {
    if (page === 'home') {
      const mod = await import('./renderers/releases.js');
      mod.bootHome();
    } else if (page === 'releases') {
      const mod = await import('./renderers/releases.js');
      mod.bootReleases();
    } else if (page === 'release-detail') {
      const mod = await import('./renderers/releases.js');
      mod.bootReleaseDetail();
    } else if (page === 'artists') {
      const mod = await import('./renderers/artists.js');
      mod.bootArtists();
    } else if (page === 'artist-detail') {
      const mod = await import('./renderers/artists.js');
      mod.bootArtistDetail();
    } else if (page === 'playlists') {
      const mod = await import('./renderers/playlists.js');
      mod.bootPlaylists();
    } else if (page === 'playlist-detail') {
      const mod = await import('./renderers/playlists.js');
      mod.bootPlaylistDetail();
    }
  } catch (e) {
    console.error('Boot error:', e);
    const app = document.getElementById('app');
    if (app) app.innerHTML = `<p>Something went wrong while loading this page.</p>`;
  }
})();
