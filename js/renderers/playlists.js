// js/renderers/playlists.js
import { playlists } from '../../content/playlists.js';
import { releases } from '../../content/releases.js';
import { qs, getParam, setPageMeta } from '../utils.js';
import { settings } from '../../content/settings.js';
import { cardRelease } from '../components/cardRelease.js';
import { playReleaseNow, addToQueue } from '../components/footerPlayer.js';

export function bootPlaylists(){
  const app = qs('#app');
  app.innerHTML = `
    <h1>Playlists</h1>
    <section class="grid releases">
      ${playlists.map(pl=>`
        <article class="card">
          <a href="./playlist.html?slug=${pl.slug}" aria-label="${pl.title}">
            <figure><img src="${pl.cover}" alt="${pl.title}" onerror="this.onerror=null;this.src='./images/placeholder.svg';"/></figure>
            <div class="meta">
              <h3>${pl.title}</h3>
              <p class="artists">${pl.description||''}</p>
            </div>
          </a>
        </article>
      `).join('')}
    </section>
  `;
  setPageMeta({ title: settings.brand + ' — Playlists', description: 'Official BelloSounds selections' });
}

export function bootPlaylistDetail(){
  const app = qs('#app');
  const slug = getParam('slug');
  const pl = playlists.find(p=> p.slug===slug);
  if(!pl){ app.innerHTML = `<p>Playlist not found.</p>`; return; }

  // Mappa gli slug -> releases effettive
  const items = (pl.items||[])
    .map(s=> releases.find(r=> r.slug===s))
    .filter(Boolean);

  // Header + azioni (niente embed)
  app.innerHTML = `
    <article class="detail">
      <div class="cover">
        <img src="${pl.cover}" alt="${pl.title}" onerror="this.onerror=null;this.src='./images/placeholder.svg';"/>
      </div>
      <div class="info">
        <h1>${pl.title}</h1>
        <p>${pl.description||''}</p>

        <div class="actions" style="margin-top:12px; display:flex; gap:10px; flex-wrap:wrap;">
          <button class="btn" data-action="pl-play-all">Play all</button>
          <button class="btn outline" data-action="pl-queue-all">Add all to queue</button>
        </div>
      </div>
    </article>

    <section style="margin-top:24px">
      <h2>Included releases</h2>
      <div class="grid releases">
        ${items.map(cardRelease).join('')}
      </div>
    </section>
  `;

  setPageMeta({ title: `${pl.title} — ${settings.brand}`, description: pl.description, image: pl.cover });

  // Wire pulsanti "Play all" / "Queue all"
  const playAllBtn  = app.querySelector('[data-action="pl-play-all"]');
  const queueAllBtn = app.querySelector('[data-action="pl-queue-all"]');

  playAllBtn?.addEventListener('click', (e)=>{
    e.preventDefault();
    if (!items.length) return;
    // Avvia la prima, poi accoda le altre (APPENDE alla coda esistente)
    playReleaseNow(items[0]);
    for (let i=1; i<items.length; i++) addToQueue(items[i]);
  });

  queueAllBtn?.addEventListener('click', (e)=>{
    e.preventDefault();
    for (const rel of items) addToQueue(rel); // solo accoda
  });
}
