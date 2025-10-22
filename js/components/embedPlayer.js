
// components/embedPlayer.js
export function embedPlayer(embeds){
  if(!embeds) return '';
  if(embeds.youtube){
    // Accept either full URL or video ID
    const id = extractYouTubeId(embeds.youtube);
    return `<div class="embed"><iframe width="560" height="315"
      src="https://www.youtube.com/embed/${id}" title="YouTube player" frameborder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div>`;
  }
  if(embeds.spotify){
    // ID could be track/album/playlist id or full URL
    const url = embeds.spotify.includes('open.spotify.com') ? embeds.spotify :
      `https://open.spotify.com/track/${embeds.spotify}`;
    return `<div class="embed"><iframe style="border-radius:12px" src="${url.replace('open.spotify.com/','open.spotify.com/embed/')}"
      width="100%" height="152" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe></div>`;
  }
  if(embeds.soundcloud){
    const url = embeds.soundcloud.includes('soundcloud.com') ? embeds.soundcloud :
      `https://soundcloud.com/${embeds.soundcloud}`;
    return `<div class="embed"><iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay"
      src="https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true"></iframe></div>`;
  }
  return '';
}

function extractYouTubeId(input){
  if(!input) return '';
  if(/^[\w-]{11}$/.test(input)) return input;
  const m = String(input).match(/(?:v=|\.be\/|embed\/)([\w-]{11})/);
  return m ? m[1] : input;
}
