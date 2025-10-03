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
  setPageMeta({ title: settings.brand + ' — Artists', description: 'Nick Evan & Neel Miles' });
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
  setPageMeta({ title: `${a.name} — ${settings.brand}`, description: a.bioShort, image: a.image });
}
