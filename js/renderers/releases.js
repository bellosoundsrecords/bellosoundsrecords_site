// renderers/releases.js
import { releases } from '../../content/releases.js';
import { playlists } from '../../content/playlists.js';
import { settings } from '../../content/settings.js';
import { cardRelease } from '../components/cardRelease.js';
import { embedPlayer } from '../components/embedPlayer.js';
import { filterBar, attachFilterBarHandlers } from '../components/filterBar.js';
import { qs, setPageMeta, getParam, formatDate } from '../utils.js';

export function bootHome(){
  const app = qs('#app');
  const latest = [...releases].sort((a,b)=> b.releaseDate.localeCompare(a.releaseDate)).slice(0,6);
  const hero = latest[0] || releases[0];
  app.innerHTML = `
    <section class="hero">${renderHero(hero)}</section>
    <h2>Latest Releases</h2>
    <section class="grid releases">${latest.map(cardRelease).join('')}</section>
    <h2>Release 2025</h2>
    <section class="playlist-highlight">${renderPlaylistHighlight('release-2025')}</section>
    <section class="split-hero">${renderTwoSides()}</section>
  `;
  setPageMeta({ title: settings.brand + ' — Two sides, one vision', description: 'Deep House, Soulful and Urban vibes.' , image: hero?.cover });
}

function renderHero(rel){
  if(!rel) return '';
  return `
  <div class="hero-inner">
    <img src="${rel.cover}" alt="${rel.title} cover" loading="eager" onerror="this.onerror=null;this.src='./images/placeholder.svg';"/>
    <div class="hero-text">
      <h1>${rel.title}</h1>
      <p>${rel.descriptionShort ?? ''}</p>
      <a class="btn" href="./release.html?slug=${rel.slug}">Listen</a>
      <a class="btn outline" href="./releases.html">View all</a>
    </div>
  </div>`;
}

function renderPlaylistHighlight(slug){
  const pl = playlists.find(p=>p.slug===slug);
  if(!pl) return '';
  const embed = pl.embeds?.youtube ? `<iframe width="100%" height="315" src="https://www.youtube.com/embed/videoseries?list=${pl.embeds.youtube}" title="${pl.title}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture" allowfullscreen></iframe>`
    : pl.embeds?.spotify ? `<iframe style="border-radius:12px" src="https://open.spotify.com/embed/playlist/${pl.embeds.spotify}" width="100%" height="352" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe>`
    : '';
  return `
    <div class="card">
      <div class="playlist-body">
        <div style="display:grid;grid-template-columns:1fr;gap:var(--gap);">
          <p>${pl.description||''}</p>
          ${embed}
          <a class="btn" href="./playlist.html?slug=${pl.slug}">Open playlist</a>
        </div>
      </div>
    </div>
  `;
}

function renderTwoSides(){
  return `
    <div class="block">
      <h3>Nick Evan</h3>
      <p>All heart. Introspective and essential soulful house.</p>
      <a class="btn outline" href="./artist.html?slug=nick-evan">Explore Nick</a>
    </div>
    <div class="block">
      <h3>Neel Miles</h3>
      <p>Raw groove. Instinctive, cutting club energy.</p>
      <a class="btn outline" href="./artist.html?slug=neel-miles">Explore Neel</a>
    </div>
  `;
}

// Releases index
export function bootReleases(){
  const app = qs('#app');
  const years = Array.from(new Set(releases.map(r=> (r.releaseDate||'').slice(0,4)).filter(Boolean))).sort().reverse();
  const aliases = Array.from(new Set(releases.map(r=> r.alias))).sort();
  const tags = Array.from(new Set(releases.flatMap(r=> r.tags||[]))).sort();

  app.innerHTML = `
    <h1>Releases</h1>
    ${filterBar({years, aliases, tags},{},()=>{})}
    <section id="list" class="grid releases"></section>
  `;

  const list = qs('#list');
  const trigger = ()=>{
    const fy = qs('#f-year').value;
    const fa = qs('#f-alias').value;
    const ft = qs('#f-tag').value;
    const q = (qs('#f-q').value||'').toLowerCase();
    let data = [...releases];
    if(fy && fy!=='All') data = data.filter(r=> (r.releaseDate||'').startsWith(fy));
    if(fa && fa!=='All') data = data.filter(r=> r.alias===fa);
    if(ft && ft!=='All') data = data.filter(r=> (r.tags||[]).includes(ft));
    if(q) data = data.filter(r=> (r.title+' '+r.artists.join(' ')).toLowerCase().includes(q));
    data.sort((a,b)=> b.releaseDate.localeCompare(a.releaseDate));
    list.innerHTML = data.map(cardRelease).join('') || '<p>No results.</p>';
  };
  attachFilterBarHandlers(app, trigger);
  trigger();
}

// Release detail
export function bootReleaseDetail(){
  const app = qs('#app');
  const slug = getParam('slug');
  const rel = releases.find(r=> r.slug===slug);
  if(!rel){ app.innerHTML = `<p>Release not found.</p>`; return; }

  setPageMeta({ title: `${rel.title} — ${rel.artists.join(', ')} | ${rel.catalog}`, description: rel.descriptionShort, image: rel.cover });
  injectJSONLD(rel);

  const tags = (rel.tags||[]).map(t=>`<span class="tag">#${t}</span>`).join(' ');
  const links = renderLinks(rel);
  const tracklist = (rel.tracks||[]).map(t=>`<li>${t.title}${t.bpm?` · ${t.bpm} BPM`:''}${t.key?` · ${t.key}`:''}</li>`).join('');

  app.innerHTML = `
    <article class="detail">
      <div class="cover"><img src="${rel.cover}" alt="${rel.title} cover" onerror="this.onerror=null;this.src='./images/placeholder.svg';"/></div>
      <div class="info">
        <h1>${rel.title}</h1>
        <p class="artists">${rel.artists.join(', ')}</p>
        <p><strong>${rel.catalog}</strong> · ${formatDate(rel.releaseDate)}</p>
        <div class="tags">${tags}</div>
        ${embedPlayer(rel.embeds)}
        <section class="tracklist">
          <h3>Tracklist</h3>
          <ol>${tracklist}</ol>
        </section>
        <section class="credits">
          <h3>Credits</h3>
          <p>${Object.entries(rel.credits||{}).map(([k,v])=>`<strong>${titleCase(k)}:</strong> ${v}`).join('<br/>')}</p>
        </section>
        <section class="links">
          <h3>Listen / Buy</h3>
          ${links}
        </section>
      </div>
    </article>
    <section style="margin-top:24px">
      <h2>Related</h2>
      <div class="grid releases">${related(rel, releases).map(cardRelease).join('')}</div>
    </section>
  `;
}

function titleCase(s){ return String(s||'').replace(/([A-Z])/g,' $1').replace(/^./, m=>m.toUpperCase()); }

function renderLinks(rel){
  const out = [];
  const s = rel.links?.stream||{};
  const b = rel.links?.buy||{};
  if(s.youtube) out.push(`<a class="btn" href="${s.youtube}" target="_blank" rel="noopener">YouTube</a>`);
  if(s.spotify) out.push(`<a class="btn" href="${s.spotify}" target="_blank" rel="noopener">Spotify</a>`);
  if(s.apple) out.push(`<a class="btn" href="${s.apple}" target="_blank" rel="noopener">Apple</a>`);
  if(b.beatport) out.push(`<a class="btn outline" href="${b.beatport}" target="_blank" rel="noopener">Beatport</a>`);
  if(b.bandcamp) out.push(`<a class="btn outline" href="${b.bandcamp}" target="_blank" rel="noopener">Bandcamp</a>`);
  return out.join(' ');
}

function related(rel, all){
  // Top 3 by same alias or overlapping tags (excluding itself)
  const pool = all.filter(r=> r.slug!==rel.slug);
  const score = (r)=> (r.alias===rel.alias?2:0) + (r.tags||[]).filter(t=> (rel.tags||[]).includes(t)).length;
  return pool.map(r=>({r, s:score(r)})).filter(x=>x.s>0).sort((a,b)=> b.s-a.s).slice(0,3).map(x=>x.r);
}

function injectJSONLD(rel){
  const ld = {
    "@context": "https://schema.org",
    "@type": "MusicRelease",
    "name": rel.title,
    "catalogNumber": rel.catalog,
    "byArtist": {"@type":"MusicGroup","name": rel.artists?.join(', ')},
    "recordLabel": {"@type":"Organization","name":"BelloSounds Records"},
    "image": location.origin + rel.cover.replace(/^\./,''),
    "datePublished": rel.releaseDate
  };
  const s = document.createElement('script');
  s.type = 'application/ld+json';
  s.textContent = JSON.stringify(ld);
  document.head.appendChild(s);
}
