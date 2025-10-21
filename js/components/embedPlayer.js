// js/components/embedPlayer.js
export function extractYouTubeId(input = '', isPlaylist = false){
  const s = String(input || '');
  if (isPlaylist){
    const m = s.match(/[?&]list=([a-zA-Z0-9_-]+)/);
    return m ? m[1] : s;
  }
  const m = s.match(/(?:youtu\.be\/|[?&]v=)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : s;
}
function asSpotifyEmbed(input){
  const s = String(input || '');
  const m = s.match(/(track|album|playlist)[:/](?:.+\/)?([0-9A-Za-z]{22})/);
  const kind = m ? m[1] : 'track';
  const id   = m ? m[2] : s;
  return { url: `https://open.spotify.com/embed/${kind}/${id}`, kind };
}
export function embedPlayer(embeds = {}, context = 'release'){
  if (!embeds) return '';
  // Release: prefer Spotify (audio-first)
  if (embeds.spotify){
    const { url, kind } = asSpotifyEmbed(embeds.spotify);
    return `<div class="embed spotify ${kind}">
      <iframe loading="lazy" src="${url}"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe>
    </div>`;
  }
  // Fallback YouTube
  if (embeds.youtube){
    const id = extractYouTubeId(embeds.youtube);
    return `<div class="embed youtube">
      <iframe loading="lazy"
        src="https://www.youtube-nocookie.com/embed/${id}"
        title="YouTube player"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
    </div>`;
  }
  return '';
}
