// js/components/embedPlayer.js

/** Estrae l'ID di YouTube da un URL o restituisce la stringa così com'è.
 *  - video: 11 caratteri
 *  - playlist: usa isPlaylist=true (prende ?list=...)
 */
export function extractYouTubeId(input = '', isPlaylist = false){
  const s = String(input || '');

  if (isPlaylist){
    // es: https://www.youtube.com/playlist?list=PLxxxx
    const m = s.match(/[?&]list=([a-zA-Z0-9_-]+)/);
    return m ? m[1] : s;
  }

  // video: supporta youtu.be/<id> e ...v=<id>
  const m = s.match(/(?:youtu\.be\/|[?&]v=)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : s;
}

/** Ritorna l’HTML dell’embed in base ai provider presenti.
 *  context: 'release' | 'playlist'
 */
export function embedPlayer(embeds = {}, context = 'release'){
  if (!embeds) return '';

  // --- PLAYLIST: usa YouTube ---
  if (context === 'playlist' && embeds.youtube){
    const listId = extractYouTubeId(embeds.youtube, true);
    return `
      <div class="embed youtube">
        <iframe
          loading="lazy"
          src="https://www.youtube-nocookie.com/embed/videoseries?list=${listId}"
          title="YouTube playlist"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerpolicy="strict-origin-when-cross-origin"
          allowfullscreen
        ></iframe>
      </div>`;
  }

  // --- RELEASE: prefer Spotify se presente (player compatto) ---
  if (embeds.spotify){
    const { url, kind } = asSpotifyEmbed(embeds.spotify);
    return `
      <div class="embed spotify ${kind}">
        <iframe
          loading="lazy"
          src="${url}"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        ></iframe>
      </div>`;
  }

  // --- Fallback YouTube video ---
  if (embeds.youtube){
    const id = extractYouTubeId(embeds.youtube);
    return `
      <div class="embed youtube">
        <iframe
          loading="lazy"
          src="https://www.youtube-nocookie.com/embed/${id}"
          title="YouTube player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerpolicy="strict-origin-when-cross-origin"
          allowfullscreen
        ></iframe>
      </div>`;
  }

  // --- Fallback SoundCloud ---
  if (embeds.soundcloud){
    return `
      <div class="embed sc">
        <iframe loading="lazy"
          src="https://w.soundcloud.com/player/?url=${encodeURIComponent(embeds.soundcloud)}"
        ></iframe>
      </div>`;
  }

  return '';
}

/** Converte input Spotify (track:/album:/playlist: o URL) in URL embed */
function asSpotifyEmbed(input){
  const s = String(input || '');
  // match "track:ID" / "album:ID" / "playlist:ID" o URL con /track/ID ecc.
  const m = s.match(/(track|album|playlist)[:/](?:.+\/)?([0-9A-Za-z]{22})/);
  const kind = m ? m[1] : 'track';
  const id   = m ? m[2] : s;
  return { url: `https://open.spotify.com/embed/${kind}/${id}`, kind };
}
