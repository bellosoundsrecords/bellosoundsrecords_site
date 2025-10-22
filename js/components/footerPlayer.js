// js/components/footerPlayer.js
// Player a tutta larghezza (footer) con coda semplice, basato su YouTube Iframe API.
// STEP 2: audio + queue + controlli base (niente progress/waveform).

import { releases } from '../../content/releases.js';

// --- Estrattore ID YouTube interno (accetta ID, youtu.be, watch?v=, embed/...) ---
function extractYouTubeId(input){
  if (!input) return null;
  const s = String(input).trim();
  // ID puro
  if (/^[\w-]{11}$/.test(s)) return s;
  // URL comuni
  const m =
    s.match(/[?&]v=([\w-]{11})/) ||
    s.match(/youtu\.be\/([\w-]{11})/) ||
    s.match(/\/embed\/([\w-]{11})/);
  return m ? m[1] : null;
}

let apiReady = null;     // promise: Iframe API caricata
let player = null;       // istanza YT.Player
let playerReady = null;  // promise: player onReady

const state = {
  queue: [],    // array di slug
  index: -1,    // indice corrente in queue
  playing: false
};

// ---------- Boot Iframe API ----------
function ensureYTApi() {
  if (apiReady) return apiReady;
  apiReady = new Promise((resolve) => {
    if (window.YT && window.YT.Player) return resolve();
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(s);
    window.onYouTubeIframeAPIReady = () => resolve();
  });
  return apiReady;
}

function ensureHiddenHost() {
  let host = document.getElementById('yt-hidden-host');
  if (!host) {
    host = document.createElement('div');
    host.id = 'yt-hidden-host';
    host.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;left:-9999px;top:-9999px';
    document.body.appendChild(host);
  }
  return host;
}

async function ensurePlayer() {
  await ensureYTApi();
  if (player) return player;
  // promessa "onReady"
  playerReady = new Promise((resolve) => {
    player = new YT.Player(ensureHiddenHost(), {
      height: '0',
      width: '0',
      playerVars: { playsinline: 1 },
      events: {
        onReady: () => resolve(),
        onStateChange: onYTState
      }
    });
  });
  await playerReady; // aspetta che il player sia pronto
  return player;
}

// ---------- UI helpers ----------
function getBar() { return document.getElementById('audio-footer'); }
function q(sel, root = document) { return root.querySelector(sel); }

function setToggleUI(isPlaying) {
  const bar = getBar();
  if (!bar) return;
  const btn = q('.btn-ctl.toggle', bar);
  if (!btn) return;
  btn.textContent = isPlaying ? '⏸' : '⏯';
}

function enableControls(enabled) {
  const bar = getBar(); if (!bar) return;
  bar.querySelectorAll('.btn-ctl').forEach(btn => {
    btn.style.cursor = enabled ? 'pointer' : 'not-allowed';
    btn.style.opacity = enabled ? '1' : '.5';
  });
}

function updateMetaUI(rel) {
  const bar = getBar(); if (!bar) return;
  q('.title', bar).textContent = rel?.title ?? '—';
  q('.artist', bar).textContent = rel?.artists?.length ? '— ' + rel.artists.join(', ') : '—';
  q('.cat', bar).textContent = rel?.catalog ?? '—';
  const cover = q('.cover', bar);
  if (cover) cover.style.backgroundImage = rel?.cover ? `url('${rel.cover}')` : '';
  bar.style.display = 'block'; // mostralo alla prima riproduzione
}

// ---------- Stato coda ----------
function getReleaseBySlug(slug) {
  return releases.find(r => r.slug === slug);
}
function current() {
  if (state.index < 0 || state.index >= state.queue.length) return null;
  return getReleaseBySlug(state.queue[state.index]);
}

// ---------- Player state ----------
function onYTState(e) {
  if (!player) return;
  switch (e.data) {
    case YT.PlayerState.PLAYING:
      state.playing = true;
      setToggleUI(true);
      break;
    case YT.PlayerState.PAUSED:
      state.playing = false;
      setToggleUI(false);
      break;
    case YT.PlayerState.ENDED:
      next(); // auto-next
      break;
    default:
      // buffering/unstarted/cued -> non cambiamo UI
      break;
  }
}

// ---------- Controllo riproduzione ----------
async function playAt(index) {
  if (index < 0 || index >= state.queue.length) return;
  state.index = index;
  const rel = current();
  if (!rel?.embeds?.youtube) { console.warn('No youtube in release', rel); return; }
  const id = extractYouTubeId(rel.embeds.youtube);
  if (!id) { console.warn('Invalid YouTube id/url in', rel.embeds.youtube); return; }

  await ensurePlayer();  // API + player onReady
  updateMetaUI(rel);
  enableControls(true);

  // carica e riproduci
  player.loadVideoById(id);
  if (player.playVideo) player.playVideo();
  setToggleUI(true);
  state.playing = true;
}

// API pubbliche usate da app.js
export async function playReleaseNow(rel) {
  if (!rel || !rel.slug) return;
  // se già in queue, vai a quell'indice; altrimenti push & play
  const idxInQ = state.queue.indexOf(rel.slug);
  if (idxInQ === -1) state.queue.push(rel.slug);
  await playAt(idxInQ === -1 ? state.queue.length - 1 : idxInQ);
}

export function addToQueue(rel) {
  if (!rel || !rel.slug) return;
  if (!state.queue.includes(rel.slug)) {
    state.queue.push(rel.slug);
  }
  // non parte subito
  enableControls(true);
}

export function toggle() {
  if (!player) return;
  const st = player.getPlayerState ? player.getPlayerState() : -1;
  if (st === YT.PlayerState.PLAYING) {
    player.pauseVideo?.();
    setToggleUI(false);
    state.playing = false;
  } else {
    player.playVideo?.();
    setToggleUI(true);
    state.playing = true;
  }
}

export function next() {
  if (!state.queue.length) return;
  const nextIndex = state.index + 1;
  if (nextIndex < state.queue.length) {
    playAt(nextIndex);
  } else {
    // fine coda: ferma e non loopa
    state.playing = false;
    setToggleUI(false);
  }
}

export function prev() {
  if (!state.queue.length) return;
  const prevIndex = state.index - 1;
  if (prevIndex >= 0) playAt(prevIndex);
}

// ---------- Wire dei bottoni nel footer ----------
export function wireFooterControls() {
  const bar = getBar(); if (!bar) return;
  q('.btn-ctl.prev', bar)?.addEventListener('click', prev);
  q('.btn-ctl.next', bar)?.addEventListener('click', next);
  q('.btn-ctl.toggle', bar)?.addEventListener('click', toggle);
  // di default disabilitati finché non carichi qualcosa
  enableControls(false);
}
