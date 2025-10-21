// Carica la IFrame API una volta sola
let ytAPIReady = new Promise((resolve) => {
  if (window.YT && YT.Player) return resolve();
  const s = document.createElement('script');
  s.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(s);
  window.onYouTubeIframeAPIReady = () => resolve();
});

export function ytAudioCover({ youtubeId, cover, label = 'Play' }){
  const uid = 'yta_' + Math.random().toString(36).slice(2,8);
  // Markup: cover 1:1 + pulsante, iframe invisibile
  const html = `
    <div class="yt-audio" data-id="${youtubeId}" data-uid="${uid}">
      <button class="cover" type="button" style="background-image:url('${cover}')" aria-label="${label}">
        <span class="play">▶</span>
      </button>
      <div id="${uid}" class="yt-iframe" aria-hidden="true"></div>
    </div>`;
  // attach dopo inserimento nel DOM
  queueMicrotask(async ()=>{
    await ytAPIReady;
    const wrap = document.querySelector('.yt-audio[data-uid="'+uid+'"]');
    const btn  = wrap.querySelector('.cover');
    const pid  = wrap.dataset.id;
    const player = new YT.Player(uid, {
      height: '0', width:'0', videoId: pid,
      playerVars: { rel:0, modestbranding:1, playsinline:1 },
      events: { 'onReady': () => {
        btn.addEventListener('click', () => {
          const state = player.getPlayerState();
          if (state === YT.PlayerState.PLAYING) { player.pauseVideo(); btn.classList.remove('playing'); }
          else { player.playVideo(); btn.classList.add('playing'); }
        });
      }}
    });
  });
  return html;
}
