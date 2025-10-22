// js/components/footerPlayer.js
// Player a tutta larghezza (footer) con coda semplice, basato su YouTube Iframe API.
// STEP 2: audio + queue + controlli base (niente progress/waveform).

import { releases } from '../../content/releases.js';
import { extractYouTubeId } from './embedPlayer.js';

let ytReady = null;
let player = null;

const state = {
  queue: [],    // array di slug
  index: -1,    // indice corrente in queue
  playing: false
};

function ensureYT() {
  if (ytReady) return ytReady;
  ytReady = new Promise((resolve) => {
    if (window.YT && window.YT.Player) return resolve();
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(s);
    window.onYouTubeIframeAPIReady = () => resolve();
  });
  return ytReady;
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
  await ensureYT();
  if (player) return player;
  player = new YT.Player(ensureHiddenHost(), {
    height: '0',
    width: '0',
    events: {
      onStateChange: onYTState
    }
  });
  return player;
}

function onYTState(e) {
  if (!player) return;
  switch (e.data) {
    case YT.PlayerState.PLAYING:
      state.playing = true;
      setToggleUI(true);
      break;
    case YT.PlayerState.PAUSED:
    case YT.PlayerState.BUFFERING:
      // teniamo playing true solo su PLAYING
      break;
    case YT.PlayerState.ENDED:
      next(); // auto-next
      break;
    default:
      break;
  }
}

// ---------- Helpers UI ----------
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
  q('.artist', bar).textContent = rel?.artists?.join(', ') ? '— ' + rel.artists.join(', ') : '—';
  q('.cat', bar).textContent = rel?.catalog ?? '—';
  const cover = q('.cover', bar);
  if (cover) cover.style.backgroundImage = rel?.cover ? `url('${rel.cover}')` : '';
  bar.style.display = 'block'; // assicura visibile
}

// ---------- Queue ops ----------
function getReleaseBySlug(slug) {
  return releases.find(r => r.slug === slug);
}
function current() {
  if (state.index < 0 || state.index >= state.queue.length) return null;
  return getReleaseBySlug(state.queue[state.index]);
}

async function playAt(index) {
  if (index < 0 || index >= state.queue.length) return;
  state.index = index;
  const rel = current();
  if (!rel?.embeds?.youtube) return;
  const id = extractYouTubeId(rel.embeds.youtube);
  await ensurePlayer();
  updateMetaUI(rel);
  enableControls(true);
  player.loadVideoById(id);
  player.playVideo?.();
  setToggleUI(true);
  state.playing = true;
}

export async function playReleaseNow(rel) {
  // se già in queue, spostati lì; altrimenti push e vai
  const idxInQ = state.queue.indexOf(rel.slug);
  if (idxInQ === -1) state.queue.push(rel.slug);
  await playAt(idxInQ === -1 ? state.queue.length - 1 : idxInQ);
}

export function addToQueue(rel) {
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
