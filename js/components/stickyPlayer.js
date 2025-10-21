// js/components/stickyPlayer.js
import { extractYouTubeId } from './embedPlayer.js';

function asSpotifyEmbed(input){
  const s = String(input||'');
  const m = s.match(/(track|album|playlist)[:/](?:.+\/)?([0-9A-Za-z]{22})/);
  const kind = m ? m[1] : 'track';
  const id   = m ? m[2] : s;
  return { url: `https://open.spotify.com/embed/${kind}/${id}`, kind };
}

export function setPlayer({ title = '', embeds = {} } = {}){
  const box = document.getElementById('sticky-player');
  if(!box) return;

  let iframe = '';
  if (embeds.spotify){
    const { url } = asSpotifyEmbed(embeds.spotify);
    iframe = `<iframe src="${url}" height="152"
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe>`;
  } else if (embeds.youtube){
    const id = extractYouTubeId(embeds.youtube);
    iframe = `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"></iframe>`;
  } else return;

  box.innerHTML = `
    <div class="bar">
      <span class="title">${title || 'Now Playing'}</span>
      <button class="close" aria-label="Close player">✕</button>
    </div>
    ${iframe}
  `;
  box.classList.add('visible');
  box.querySelector('.close')?.addEventListener('click', ()=> {
    box.classList.remove('visible'); box.innerHTML='';
  });
}
