// js/app.js
import { addReleaseToQueue } from './components/ytQueue.js';
import { settings } from '../content/settings.js';
import { releases }  from '../content/releases.js';
import { renderHeaderFooter, qs } from './utils.js';
import { cardRelease } from './components/cardRelease.js';
import { embedPlayer } from './components/embedPlayer.js';
import { setPlayer } from './components/stickyPlayer.js';

function renderHero(rel){
  return `
  <div class="hero-inner">
    <img src="${rel.cover}" alt="${rel.title} cover"/>
    <div class="hero-text">
      <h1>${rel.title}</h1>
      <p>${rel.descriptionShort ?? ''}</p>
      <a class="btn play" data-slug="${rel.slug}" href="./release.html?slug=${rel.slug}">Play</a>
    </div>
  </div>`;
}
function bootHome(){
  const app = qs('#app');
  const latest = [...releases].sort((a,b)=> b.releaseDate.localeCompare(a.releaseDate)).slice(0,6);
  app.innerHTML = `<section class="hero">${renderHero(latest[0])}</section>
  <section class="grid releases">${latest.map(cardRelease).join('')}</section>`;
}
function bootReleases(){
  qs('#app').innerHTML = `<section class="grid releases">${releases.map(cardRelease).join('')}</section>`;
}
function bootReleaseDetail(slug){
  const app = qs('#app');
  const rel = releases.find(r=>r.slug===slug);
  if(!rel){ app.innerHTML = '<p>Release not found.</p>'; return; }
  app.innerHTML = `
  <section class="detail">
    <div class="media"><figure><img src="${rel.cover}" alt="${rel.title} — ${rel.artists.join(', ')} cover"></figure></div>
    <div class="info">
      <h1>${rel.title}</h1>
      <p class="meta"><strong>${rel.catalog}</strong> · ${rel.artists.join(', ')}</p>
      ${rel.descriptionShort ? `<p class="desc">${rel.descriptionShort}</p>` : ''}
      ${rel.descriptionLong ? `<p class="desc-long">${rel.descriptionLong}</p>` : ''}
      <div class="actions">
        <button class="btn play" data-slug="${rel.slug}">Play</button>
      </div>
    </div>
  </section>`;
}

function route(){
  const { pathname, search } = location;
  const p = new URLSearchParams(search);
  if (pathname.endsWith('/') || pathname.endsWith('index.html')) return bootHome();
  if (pathname.endsWith('/releases.html')) return bootReleases();
  if (pathname.endsWith('/release.html'))  return bootReleaseDetail(p.get('slug'));
  return bootHome();
}
function navigate(url){ history.pushState({}, '', url); route(); }


// --- nav interna senza reload (router SPA super robusto)
document.addEventListener('click', (e)=>{
  // solo click sinistro, senza modificatori, non già gestito
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

  const a = e.target.closest('a[href]');
  if (!a) return;

  const href = a.getAttribute('href');
  if (!href) return;

  // link che NON vogliamo intercettare
  if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
  if (a.target && a.target !== '_self') return;     // es. _blank o altro target
  if (a.hasAttribute('download')) return;

  const url = new URL(href, location.href);
  if (url.origin !== location.origin) return;        // esterni -> lascia stare

  e.preventDefault();
  navigate(url.pathname + url.search);
});



renderHeaderFooter(settings);
window.addEventListener('popstate', route);
route();
