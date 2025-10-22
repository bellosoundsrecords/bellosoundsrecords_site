// app.js - simple page boot dispatcher
import { settings } from '../content/settings.js';
import { renderHeaderFooter } from './utils.js';

renderHeaderFooter(settings);
// CREA SOLO IL CONTENITORE DEL PLAYER (niente logica ancora)
(function ensureAudioFooter(){
  if (document.getElementById('audio-footer')) return;
  const bar = document.createElement('div');
  bar.id = 'audio-footer';
  bar.innerHTML = `
    <div class="wrap">
      <div class="cover" style="background-image:url('./images/placeholder-cover.jpg')"></div>
      <div class="right">
        <div class="top">
          <div class="wave">
            <div class="wf">
              <svg class="wf-bg" viewBox="0 0 100 36"><rect x="0" y="10" width="100" height="16" rx="4" ry="4"/></svg>
              <div class="wf-played">
                <svg class="wf-fg" viewBox="0 0 100 36"><rect x="0" y="10" width="100" height="16" rx="4" ry="4"/></svg>
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
  // Mostralo: per ora come “shell” sempre visibile (poi lo nasconderemo/mostreremo quando serve)
  bar.style.display = 'block';
})();

// Dispatch by body data-page attribute
const page = document.body.dataset.page;

(async () => {
  try {
    if(page === 'home'){
      const mod = await import('./renderers/releases.js');
      mod.bootHome();
    } else if(page === 'releases'){
      const mod = await import('./renderers/releases.js');
      mod.bootReleases();
    } else if(page === 'release-detail'){
      const mod = await import('./renderers/releases.js');
      mod.bootReleaseDetail();
    } else if(page === 'artists'){
      const mod = await import('./renderers/artists.js');
      mod.bootArtists();
    } else if(page === 'artist-detail'){
      const mod = await import('./renderers/artists.js');
      mod.bootArtistDetail();
    } else if(page === 'playlists'){
      const mod = await import('./renderers/playlists.js');
      mod.bootPlaylists();
    } else if(page === 'playlist-detail'){
      const mod = await import('./renderers/playlists.js');
      mod.bootPlaylistDetail();
    }
  } catch (e){
    console.error('Boot error:', e);
    const app = document.getElementById('app');
    if(app) app.innerHTML = `<p>Something went wrong while loading this page.</p>`;
  }
})();
