// renderers/artists.js
import { artists } from '../../content/artists.js';
import { releases } from '../../content/releases.js';
import { cardRelease } from '../components/cardRelease.js';
import { cardArtist } from '../components/cardArtist.js';
import { qs, getParam, setPageMeta } from '../utils.js';
import { settings } from '../../content/settings.js';

export function bootArtists(){
  const app = qs('#app');
  app.innerHTML = `
    <h1>Artists</h1>
    <section class="grid artists">
      ${artists.map(cardArtist).join('')}
    </section>
  `;
  setPageMeta({
    title: settings.brand + ' — Deep House Artists',
    description: 'Nick Evan and Neel Miles — deep house artist projects released by BelloSounds Records.'
  });
}

export function bootArtistDetail(){
  const app = qs('#app');
  const slug = getParam('slug');
  const a = artists.find(x=> x.slug===slug);
  if(!a){ app.innerHTML = `<p>Artist not found.</p>`; return; }
  const authored = releases.filter(r=> r.alias===a.slug).sort((a,b)=> b.releaseDate.localeCompare(a.releaseDate));
  app.innerHTML = `
    <article class="detail">
      <div class="cover"><img src="${a.image}" alt="${a.name}" onerror="this.onerror=null;this.src='./images/placeholder.svg';"/></div>
      <div class="info">
        <h1>${a.name}</h1>
        <p>${a.bioLong||a.bioShort||''}</p>
        <div class="links">${Object.entries(a.socials||{}).map(([k,v])=> `<a class="btn" href="${v}" target="_blank" rel="noopener">${k}</a>`).join(' ')}</div>
      </div>
    </article>
    <section style="margin-top:24px">
      <h2>Highlights</h2>
      <div class="grid releases">${authored.map(cardRelease).join('')}</div>
    </section>
  `;

  const genreLabel = (a.genres || []).slice(0,2).join(' / ');
  setPageMeta({
    title: `${a.name} — ${genreLabel || 'House Artist'} | BelloSounds Records`,
    description: a.bioShort,
    image: a.image
  });

  const canonicalUrl = new URL(`/artist.html?slug=${encodeURIComponent(a.slug)}`, location.origin).href;
  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }
  canonical.href = canonicalUrl;

  injectArtistJSONLD(a, authored, canonicalUrl);
}

function injectArtistJSONLD(a, authored, canonicalUrl){
  const existing = document.getElementById('bsr-jsonld-artist');
  if (existing) existing.remove();

  const releaseUrl = (rel) => rel.pageUrl
    ? new URL(rel.pageUrl, location.origin).href
    : rel.slug === 'bsr011-extension'
      ? new URL('/extension.html', location.origin).href
      : new URL(`/release.html?slug=${encodeURIComponent(rel.slug)}`, location.origin).href;

  const ld = {
    "@context": "https://schema.org",
    "@type": "MusicGroup",
    "@id": canonicalUrl + "#artist",
    "name": a.name,
    "url": canonicalUrl,
    "image": new URL(a.image, location.origin).href,
    "description": a.bioShort,
    "genre": a.genres || [],
    "sameAs": Object.values(a.socials || {}).filter(Boolean),
    "memberOf": {
      "@type": "Organization",
      "@id": `${location.origin}/#label`,
      "name": "BelloSounds Records",
      "url": `${location.origin}/`
    },
    "album": authored.map(rel => ({
      "@type": "MusicAlbum",
      "@id": releaseUrl(rel) + "#album",
      "name": rel.title,
      "url": releaseUrl(rel),
      "datePublished": rel.releaseDate
    }))
  };

  const s = document.createElement('script');
  s.id = 'bsr-jsonld-artist';
  s.type = 'application/ld+json';
  s.textContent = JSON.stringify(ld);
  document.head.appendChild(s);
}
