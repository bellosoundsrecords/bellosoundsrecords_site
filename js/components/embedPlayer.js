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

export function embedPlayer(embeds = {}, context = 'release'){
  if (!embeds?.youtube) return '';
  const id = extractYouTubeId(embeds.youtube, context==='playlist');
  const src = (context==='playlist')
    ? `https://www.youtube-nocookie.com/embed/videoseries?list=${id}`
    : `https://www.youtube-nocookie.com/embed/${id}`;
  return `<div class="embed youtube">
    <iframe loading="lazy" src="${src}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
  </div>`;
}
