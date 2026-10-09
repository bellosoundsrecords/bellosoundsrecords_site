// js/renderers/playlists.js
import { playlists } from '../../content/playlists.js';
import { releases } from '../../content/releases.js';
import { qs, getParam, setPageMeta } from '../utils.js';
import { settings } from '../../content/settings.js';
import { cardRelease } from '../components/cardRelease.js';
import { playReleaseNow, addToQueue } from '../components/footerPlayer.js';

export function bootPlaylists(){
  document.getElementById('bsr-jsonld-playlist')?.remove();

  const app = qs('#app');
  app.innerHTML = `
    <h1>Playlists</h1>
    <section class="grid releases">
      ${[...playlists]
  .sort((a,b)=> b.playlistDate.localeCompare(a.playlistDate))
  .map(pl=>`
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

  setPageMeta({
    title: settings.brand + ' — Deep House Playlists',
    description: 'Official BelloSounds Records deep house playlists and selections connecting Nick Evan, Neel Miles, soulful house and underground house.'
  });

  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }
  canonical.href = new URL('/playlists.html', location.origin).href;
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

  const genres = pl.genres || ['Deep House'];
  const semanticDescription = `${pl.title} is an official BelloSounds Records ${genres.join(', ')} playlist featuring ${[...new Set(items.flatMap(r=>r.artists||[]))].join(' and ')}. ${pl.description || ''}`.trim();

  setPageMeta({
    title: `${pl.title} — Deep House Playlist | BelloSounds Records`,
    description: semanticDescription,
    image: pl.cover
  });

  const canonicalUrl = new URL(`/playlist.html?slug=${encodeURIComponent(pl.slug)}`, location.origin).href;
  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }
  canonical.href = canonicalUrl;

  injectPlaylistJSONLD(pl, items, canonicalUrl, semanticDescription);

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

function releasePageUrl(rel){
  if (rel.pageUrl) return new URL(rel.pageUrl, location.origin).href;
  if (rel.slug === 'bsr011-extension') return new URL('/extension.html', location.origin).href;
  return new URL(`/release.html?slug=${encodeURIComponent(rel.slug)}`, location.origin).href;
}

function spotifyUrl(value){
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value)) return value;
  const m = String(value).match(/^(track|album|playlist|artist):([^?]+)(\?.*)?$/i);
  if (m) return `https://open.spotify.com/${m[1].toLowerCase()}/${m[2]}${m[3] || ''}`;
  return undefined;
}

function youtubeUrl(value){
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value)) return value;
  return `https://www.youtube.com/watch?v=${value}`;
}

function recordingExternalUrls(rel){
  const urls = [];

  const embeddedSpotify = spotifyUrl(rel.embeds?.spotify);
  if (embeddedSpotify) urls.push(embeddedSpotify);

  const streamSpotify = rel.links?.stream?.spotify;
  if (streamSpotify) urls.push(streamSpotify);

  const embeddedYouTube = youtubeUrl(rel.embeds?.youtube);
  if (embeddedYouTube) urls.push(embeddedYouTube);

  const streamYouTube = rel.links?.stream?.youtube;
  if (streamYouTube) urls.push(streamYouTube);

  const streamSoundCloud = rel.links?.stream?.soundcloud;
  if (streamSoundCloud) urls.push(streamSoundCloud);

  return [...new Set(urls.filter(Boolean))];
}

function playlistExternalUrls(pl){
  const urls = [];
  if (pl.links?.spotify) urls.push(pl.links.spotify);
  if (pl.links?.youtube) urls.push(pl.links.youtube);
  if (pl.links?.soundcloud) urls.push(pl.links.soundcloud);
  if (pl.embeds?.spotify) {
    const id = String(pl.embeds.spotify).replace(/^playlist:/,'').trim();
    if (id) urls.push(`https://open.spotify.com/playlist/${id}`);
  }
  if (pl.embeds?.youtube) {
    const id = String(pl.embeds.youtube).trim();
    if (id) urls.push(`https://www.youtube.com/playlist?list=${id}`);
  }
  return [...new Set(urls.filter(Boolean))];
}

function injectPlaylistJSONLD(pl, items, canonicalUrl, semanticDescription){
  document.getElementById('bsr-jsonld-playlist')?.remove();

  const playlistId = canonicalUrl + '#playlist';
  const labelId = `${location.origin}/#label`;

  const itemListElement = items.map((rel, index) => {
    const pageUrl = releasePageUrl(rel);
    const track = rel.tracks?.[0] || {};
    const artistName = (rel.artists || []).join(', ');
    const artistId = rel.alias
      ? `${location.origin}/artist.html?slug=${encodeURIComponent(rel.alias)}#artist`
      : undefined;
    const externalUrls = recordingExternalUrls(rel);

    const recording = {
      "@type": "MusicRecording",
      "@id": `${pageUrl}#album-track-1`,
      "name": track.title || rel.title,
      "url": pageUrl,
      "byArtist": artistId
        ? { "@type": "MusicGroup", "@id": artistId, "name": artistName }
        : { "@type": "MusicGroup", "name": artistName },
      "inPlaylist": { "@id": playlistId }
    };

    if (track.isrc && track.isrc !== 'TBD') recording.isrcCode = track.isrc;
    if (externalUrls.length) {
      recording.sameAs = externalUrls;
      recording.potentialAction = externalUrls.map(url => ({
        "@type": "ListenAction",
        "target": url
      }));
    }

    return {
      "@type": "ListItem",
      "position": index + 1,
      "item": recording
    };
  });

  const playlistUrls = playlistExternalUrls(pl);

  const playlist = {
    "@type": "MusicPlaylist",
    "@id": playlistId,
    "name": pl.title,
    "url": canonicalUrl,
    "description": semanticDescription,
    "datePublished": pl.playlistDate,
    "image": new URL(pl.cover, location.origin).href,
    "genre": pl.genres || ["Deep House"],
    "numTracks": items.length,
    "creator": {
      "@type": "Organization",
      "@id": labelId,
      "name": "BelloSounds Records",
      "url": `${location.origin}/`
    },
    "publisher": { "@id": labelId },
    "track": {
      "@type": "ItemList",
      "numberOfItems": items.length,
      "itemListElement": itemListElement
    }
  };

  if (playlistUrls.length) {
    playlist.sameAs = playlistUrls;
    playlist.potentialAction = playlistUrls.map(url => ({
      "@type": "ListenAction",
      "target": url
    }));
  }

  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      playlist,
      {
        "@type": "Organization",
        "@id": labelId,
        "name": "BelloSounds Records",
        "url": `${location.origin}/`,
        "description": "Independent deep house record label and creative lab focused on deep, soulful and late-night underground house music."
      }
    ]
  };

  const s = document.createElement('script');
  s.id = 'bsr-jsonld-playlist';
  s.type = 'application/ld+json';
  s.textContent = JSON.stringify(ld);
  document.head.appendChild(s);
}
