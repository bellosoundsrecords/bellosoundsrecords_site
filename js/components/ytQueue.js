// js/components/ytQueue.js
import { extractYouTubeId } from './embedPlayer.js';

let apiReady = new Promise((resolve) => {
  if (window.YT && YT.Player) return resolve();
  const s = document.createElement('script');
  s.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(s);
  window.onYouTubeIframeAPIReady = () => resolve();
});

let player = null;
let queue = [];      // [{id, title, cover}]
let i = -1;          // indice corrente

function ensureHost(){
  let host = document.getElementById('yt-audio-host');
  if (!host){
    host = document.createElement('div');
    host.id = 'yt-audio-host';
    host.style.width = '0'; host.style.height = '0'; host.style.overflow = 'hidden';
    document.body.appendChild(host);
  }
  return host;
}

async function ensurePlayer(){
  await apiReady;
  if (player) return player;
  const host = ensureHost();
  player = new YT.Player(host, {
    height: '0', width: '0',
    events: { onStateChange: onStateChange }
  });
  return player;
}

function onStateChange(e){
  // auto-next quando finisce
  if (e.data === YT.PlayerState.ENDED) next();
  updateToggleUI();
}

function current(){ return queue[i]; }

async function playCurrent(){
  if (!current()) return;
  await ensurePlayer();
  player.loadVideoById(current().id);
  renderUI();
}

function renderUI(){
  const box = document.getElementById('sticky-player');
  if (!box) return;
  const cur = current();
  box.className = 'miniplayer visible';
  box.innerHTML = `
    <div class="art" style="background-image:url('${cur.cover}')">
      <button class="ctl prev" aria-label="Previous">‹</button>
      <button class="ctl toggle" aria-label="Play/Pause">▶</button>
      <button class="ctl next" aria-label="Next">›</button>
    </div>`;
  box.querySelector('.prev').onclick = prev;
  box.querySelector('.next').onclick = next;
  box.querySelector('.toggle').onclick = toggle;
  updateToggleUI();
}

function updateToggleUI(){
  const btn = document.querySelector('#sticky-player .ctl.toggle');
  if (!btn || !player || typeof player.getPlayerState !== 'function') return;
  const s = player.getPlayerState();
  btn.textContent = (s === YT.PlayerState.PLAYING) ? '❚❚' : '▶';
}

export function addReleaseToQueue(rel, { autoplay = true } = {}){
  const id = extractYouTubeId(rel?.embeds?.youtube || '');
  if (!id) return; // niente YT → non aggiunge
  queue.push({
    id,
    title: `${rel.artists.join(', ')} — ${rel.title}`,
    cover: rel.cover
  });
  if (autoplay || i === -1){ i = queue.length - 1; playCurrent(); }
  else renderUI();
}

export function next(){
  if (!queue.length) return;
  i = (i + 1) % queue.length;
  playCurrent();
}
export function prev(){
  if (!queue.length) return;
  i = (i - 1 + queue.length) % queue.length;
  playCurrent();
}
export function toggle(){
  if (!player) return;
  const s = player.getPlayerState();
  if (s === YT.PlayerState.PLAYING) player.pauseVideo();
  else player.playVideo();
  updateToggleUI();
}
