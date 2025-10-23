// js/app.js — SPA router + boot
import { settings } from '../content/settings.js';
import { releases } from '../content/releases.js';
import { renderHeaderFooter } from './utils.js';
import { playReleaseNow, addToQueue, wireFooterControls } from './components/footerPlayer.js';

// ---------- Header/Footer + Audio footer shell ----------
renderHeaderFooter(settings);

// crea la shell del player se non esiste (resta fissa, non ricaricata)
(function ensureAudioFooter(){
  if (document.getElementById('audio-footer')) return;
  const bar = document.createElement('div');
  bar.id = 'audio-footer';
  bar.innerHTML = `
    <div class="wrap">
      <div class="cover"></div>
      <div class="right">
        <div class="top">
          <div class="wave"><div class="wf"></div></div>
          <div class="time"><span class="t0">0:00</span> / <span class="ttot">0:00</span></div>
        </div>
        <div class="bottom">
          <div class="meta"><span class="title">—</span><span class="artist">—</span><span class="cat">—</span></div>
          <div class="controls">
            <button class="btn-ctl prev" aria-label="Previous">‹</button>
            <button class="btn-ctl toggle" aria-label="Play/Pause">⏯</button>
            <button class="btn-ctl next" aria-label="Next">›</button>
          </div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(bar);
  bar.style.display = 'block';
})();
wireFooterControls(); // attiva i bottoni del footer

// ---------- Azioni globali Play / Queue (delegates) ----------
document.addEventListener('click', (e)=>{
  const el = e.target.closest('[data-action="play"]');
  if (!el) return;
  e.preventDefault();
  const slug = el.dataset.slug;
  const rel  = releases.find(r => r.slug === slug);
  if (rel) playReleaseNow(rel);
});
document.addEventListener('click', (e)=>{
  const el = e.target.closest('[data-action="queue"]');
  if (!el) return;
  e.preventDefault();
  const slug = el.dataset.slug;
  const rel  = releases.find(r => r.slug === slug);
  if (rel) addToQueue(rel);
});

// ---------- Mini Router ----------
function sameOrigin(href){
  try { const u = new URL(href, location.href); return u.origin === location.origin; }
  catch { return false; }
}
function navigateTo(href, {replace=false} = {}){
  const url = new URL(href, location.href);
  if (replace) history.replaceState({}, '', url);
  else history.pushState({}, '', url);
  route();
}
window.addEventListener('popstate', route);

// intercetta tutti i link interni (no target _blank, no download, no hash esterno)
document.addEventListener('click', (e)=>{
  const a = e.target.closest('a[href]');
  if (!a) return;
  if (a.target && a.target !== '_self') return;
  if (a.hasAttribute('download')) return;
  const href = a.getAttribute('href');
  if (!href || href.startsWith('#')) return; // anchor locali
  if (!sameOrigin(href)) return;            // esterni

  // Se è una rotta del sito, preveniamo e navighiamo via SPA
  const url = new URL(href, location.href);
  const isInternalRoute = [
    '/', '/index.html',
    '/releases.html', '/release.html',
    '/artists.html',  '/artist.html',
    '/playlists.html','/playlist.html',
    '/about.html','/contact.html','/legal.html'
  ].includes(url.pathname);
  if (isInternalRoute){
    e.preventDefault();
    navigateTo(url.href);
  }
});

// ---------- Dispatcher di pagina ----------
async function route(){
  const app = document.getElementById('app');
  if (!app) return;

  const { pathname, searchParams } = new URL(location.href);
  try {
    if (pathname === '/' || pathname === '/index.html'){
      const mod = await import('./renderers/releases.js');
      mod.bootHome();
    } else if (pathname === '/releases.html'){
      const mod = await import('./renderers/releases.js');
      mod.bootReleases();
    } else if (pathname === '/release.html'){
      const mod = await import('./renderers/releases.js');
      mod.bootReleaseDetail();
      // opzionale: autoplay via ?autoplay=1
      if (searchParams.get('autoplay') === '1') {
        const slug = searchParams.get('slug');
        const rel  = releases.find(r=>r.slug===slug);
        if (rel) playReleaseNow(rel);
      }
    } else if (pathname === '/artists.html'){
      const mod = await import('./renderers/artists.js');
      mod.bootArtists();
    } else if (pathname === '/artist.html'){
      const mod = await import('./renderers/artists.js');
      mod.bootArtistDetail();
    } else if (pathname === '/playlists.html'){
      const mod = await import('./renderers/playlists.js');
      mod.bootPlaylists();
    } else if (pathname === '/playlist.html'){
      const mod = await import('./renderers/playlists.js');
      mod.bootPlaylistDetail();
    } else if (pathname === '/about.html' || pathname === '/contact.html' || pathname === '/legal.html'){
      // pagine semplici statiche: carichiamo il file e prendiamo solo <main id="app">?
      // più semplice: fetch e dumping del body dentro #app
      const res = await fetch(pathname, { cache: 'no-cache' });
      const html = await res.text();
      const m = html.match(/<main[^>]*id=["']app["'][^>]*>([\s\S]*?)<\/main>/i);
      app.innerHTML = m ? m[1] : '<p>—</p>';
    } else {
      // fallback semplice
      app.innerHTML = `<p>Page not found.</p>`;
    }
  } catch (e){
    console.error('Route error:', e);
    app.innerHTML = `<p>Something went wrong while loading this page.</p>`;
  }

  // scroll top “gentile”
  window.scrollTo({ top: 0, behavior: 'instant' });
}

// primo boot
route();
