// renderers/playlists.js
import { playlists } from '../../content/playlists.js';
import { releases } from '../../content/releases.js';
import { qs, getParam, setPageMeta } from '../utils.js';
import { settings } from '../../content/settings.js';
import { cardRelease } from '../components/cardRelease.js';

export function bootPlaylists(){
  const app = qs('#app');
  app.innerHTML = `
    <h1>Playlists</h1>
    <section class="grid releases">
      ${playlists.map(pl=>`
        <article class="card">
          <a href="./playlist.html?slug=${pl.slug}" aria-label="${pl.title}">
            <figure><img src="${pl.cover}" alt="${pl.title}" onerror="this.onerror=null;this.src='./images/placeholder.svg';"/></figure>
            <div class="meta"><h3>${pl.title}</h3><p class="artists">${pl.description||''}</p></div>
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
  const items = (pl.items||[]).map(s=> releases.find(r=> r.slug===s)).filter(Boolean);
  const embed = pl.embeds?.youtube ? `<iframe width="100%" height="315" src="https://www.youtube.com/embed/videoseries?list=${pl.embeds.youtube}" title="${pl.title}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture" allowfullscreen></iframe>`
    : pl.embeds?.spotify ? `<iframe style="border-radius:12px" src="https://open.spotify.com/embed/playlist/${pl.embeds.spotify}" width="100%" height="352" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe>`
    : '';
  app.innerHTML = `
    <article class="detail">
      <div class="cover"><img src="${pl.cover}" alt="${pl.title}" onerror="this.onerror=null;this.src='./images/placeholder.svg';"/></div>
      <div class="info">
        <h1>${pl.title}</h1>
        <p>${pl.description||''}</p>
        ${embed}
      </div>
    </article>
    <section style="margin-top:24px">
      <h2>Included releases</h2>
      <div class="grid releases">${items.map(cardRelease).join('')}</div>
    </section>
  `;
  setPageMeta({ title: `${pl.title} — ${settings.brand}`, description: pl.description, image: pl.cover });
}
