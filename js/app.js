// js/app.js — SPA “safe” router + boot
import { settings } from '../content/settings.js';
import { releases } from '../content/releases.js';
import { renderHeaderFooter } from './utils.js';
import { playReleaseNow, addToQueue, wireFooterControls } from './components/footerPlayer.js';

// 0) Header/Footer + footer player shell (una volta sola)
renderHeaderFooter(settings);
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
wireFooterControls();

// 1) Azioni globali: play / queue
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

// 2) Utils router
const INTERNAL_PATHS = new Set([
  '/', '/index.html',
  '/releases.html', '/release.html',
  '/artists.html',  '/artist.html',
  '/playlists.html','/playlist.html',
  '/about.html','/contact.html','/legal.html'
]);
function sameOrigin(href){
  try { return new URL(href, location.href).origin === location.origin; }
  catch { return false; }
}
function isInternalRoute(href){
  const u = new URL(href, location.href);
  // Considera anche link relativi tipo "./release.html"
  return sameOrigin(u.href) && (INTERNAL_PATHS.has(u.pathname) || u.pathname.endsWith('.html') || u.pathname === '/');
}
async function navigateTo(href, {replace=false} = {}){
  const url = new URL(href, location.href);
  if (replace) history.replaceState({}, '', url);
  else history.pushState({}, '', url);
  await route(); // se fallisce, lasceremo andare full load
}
window.addEventListener('popstate', route);

// Intercetta link interni in modo “safe”
document.addEventListener('click', async (e)=>{
  const a = e.target.closest('a[href]');
  if (!a) return;
  if (a.target && a.target !== '_self') return;   // rispetta _blank ecc
  if (a.hasAttribute('download')) return;
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1) return; // nuovi tab
  const href = a.getAttribute('href'); if (!href) return;
  if (href.startsWith('#')) return;               // ancore
  if (!isInternalRoute(href)) return;             // esterni

  e.preventDefault();
  try {
    await navigateTo(href);
  } catch {
    // fallback: se qualcosa va storto, navigazione normale
    location.href = href;
  }
});

// 3) Router: carica solo il contenuto necessario
async function route(){
  const app = document.getElementById('app');
  if (!app) return;

  const { pathname, search } = new URL(location.href);
  const searchParams = new URLSearchParams(search);

  // Helper per import modulare
  const load = (p) => import(p);

  try {
    if (pathname === '/' || pathname === '/index.html'){
      const mod = await load('./renderers/releases.js');
      mod.bootHome();

    } else if (pathname === '/releases.html'){
      const mod = await load('./renderers/releases.js');
      mod.bootReleases();

    } else if (pathname === '/release.html'){
      const mod = await load('./renderers/releases.js');
      mod.bootReleaseDetail();
      if (searchParams.get('autoplay') === '1') {
        const slug = searchParams.get('slug');
        const rel  = releases.find(r=>r.slug===slug);
        if (rel) playReleaseNow(rel);
      }

    } else if (pathname === '/artists.html'){
      const mod = await load('./renderers/artists.js');
      mod.bootArtists();

    } else if (pathname === '/artist.html'){
      const mod = await load('./renderers/artists.js');
      mod.bootArtistDetail();

    } else if (pathname === '/playlists.html'){
      const mod = await load('./renderers/playlists.js');
      mod.bootPlaylists();

    } else if (pathname === '/playlist.html'){
      const mod = await load('./renderers/playlists.js');
      mod.bootPlaylistDetail();

    } else if (INTERNAL_PATHS.has(pathname) || pathname.endsWith('.html')){
      // Pagine statiche semplici: fetch del file e estrazione <main id="app">…</main>
      const res = await fetch(pathname, { cache: 'no-cache' });
      if (!res.ok) throw new Error('HTTP '+res.status);
      const html = await res.text();
      const m = html.match(/<main[^>]*id=["']app["'][^>]*>([\s\S]*?)<\/main>/i);
      app.innerHTML = m ? m[1] : html; // se non c'è main, butta tutto (meglio vedere qualcosa che niente)

    } else {
      app.innerHTML = `<p>Page not found.</p>`;
    }
  } catch (err){
    console.error('Route error:', err);
    // fallback: navigazione full page per non bloccare il sito
    location.href = pathname + search;
    return;
  }

  // Scroll top
  window.scrollTo({ top: 0, behavior: 'instant' });
}

// 4) Supporto deep-link su GitHub Pages (via 404.html)
(function restoreDeepLink(){
  try {
    if (sessionStorage.redirect) {
      history.replaceState({}, '', sessionStorage.redirect);
      sessionStorage.removeItem('redirect');
    }
  } catch {}
})();

// Primo boot
route();
