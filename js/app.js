// js/app.js
import { addReleaseToQueue } from './components/ytQueue.js';

import { settings } from '../content/settings.js';
import { releases }  from '../content/releases.js';

import { renderHeaderFooter, qs } from './utils.js';
import { cardRelease } from './components/cardRelease.js';
import { embedPlayer } from './components/embedPlayer.js'; // se lo usi nel dettaglio

// ---------- Viste ----------
function renderHero(rel){
  return `
  <div class="hero-inner">
    <img src="${rel.cover}" alt="${rel.title} cover"/>
    <div class="hero-text">
      <h1>${rel.title}</h1>
      <p>${rel.descriptionShort ?? ''}</p>
      <div class="actions">
        <button class="btn play" data-action="play" data-slug="${rel.slug}">Play</button>
        <a class="btn" href="./release.html?slug=${rel.slug}">View</a>
      </div>
    </div>
  </div>`;
}

function bootHome(){
  const app = qs('#app');
  const latest = [...releases].sort((a,b)=> b.releaseDate.localeCompare(a.releaseDate)).slice(0,6);
  app.innerHTML = `
    <section class="hero">${renderHero(latest[0])}</section>
    <section class="grid releases">${latest.map(cardRelease).join('')}</section>
  `;
}

function bootReleases(){
  qs('#app').innerHTML = `
    <section class="grid releases">${releases.map(cardRelease).join('')}</section>
  `;
}

function bootReleaseDetail(slug){
  const app = qs('#app');
  const rel = releases.find(r=>r.slug===slug);
  if(!rel){ app.innerHTML = '<p>Release not found.</p>'; return; }
  app.innerHTML = `
  <section class="detail">
    <div class="media">
      <figure><img src="${rel.cover}" alt="${rel.title} — ${rel.artists.join(', ')} cover"></figure>
    </div>
    <div class="info">
      <h1>${rel.title}</h1>
      <p class="meta"><strong>${rel.catalog}</strong> · ${rel.artists.join(', ')}</p>
      ${rel.descriptionShort ? `<p class="desc">${rel.descriptionShort}</p>` : ''}
      ${rel.descriptionLong ? `<p class="desc-long">${rel.descriptionLong}</p>` : ''}

      <div class="actions">
        <button class="btn play" data-action="play" data-slug="${rel.slug}">Play</button>
      </div>

      ${embedPlayer(rel.embeds, 'release')}
    </div>
  </section>`;
}

// ---------- Router ----------
function route(){
  const { pathname, search } = location;
  const p = new URLSearchParams(search);
  if (pathname.endsWith('/') || pathname.endsWith('index.html')) return bootHome();
  if (pathname.endsWith('/releases.html')) return bootReleases();
  if (pathname.endsWith('/release.html'))  return bootReleaseDetail(p.get('slug'));
  return bootHome();
}
function navigate(url){ history.pushState({}, '', url); route(); }

// Intercetta la navigazione interna (SPA) ma **ignora** i click Play
document.addEventListener('click', (e)=>{
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

  // se il click riguarda Play, non è navigazione
  if (e.target.closest('[data-action="play"]')) return;

  const a = e.target.closest('a[href]');
  if (!a) return;

  const href = a.getAttribute('href');
  if (!href) return;
  if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
  if (a.target && a.target !== '_self') return;
  if (a.hasAttribute('download')) return;

  const url = new URL(href, location.href);
  if (url.origin !== location.origin) return;

  e.preventDefault();
  navigate(url.pathname + url.search);
});

// Unico listener Play → accoda nella coda YouTube
document.addEventListener('click', (e)=>{
  const el = e.target.closest('[data-action="play"]');
  if (!el) return;
  e.preventDefault();
  e.stopPropagation(); // evita che qualche altro handler navighi
  const slug = el.dataset.slug;
  const rel  = releases.find(r => r.slug === slug);
  if (!rel) { console.warn('Play: release non trovata per slug', slug); return; }
  addReleaseToQueue(rel, { autoplay:true });
});

// ---------- Boot ----------
renderHeaderFooter(settings);
window.addEventListener('popstate', route);
route();
