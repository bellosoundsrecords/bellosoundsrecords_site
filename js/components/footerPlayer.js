// js/components/footerPlayer.js
// Player a tutta larghezza (footer) con coda semplice, basato su YouTube Iframe API.
// STEP 2: audio + queue + controlli base + waveform reale (clipPath).
let progressTimer = null;
// --- Media Session (BT / lockscreen / car) ---
let mediaSessionWired = false;
import { releases } from '../../content/releases.js';
// --- Heuristics BT / Screen & tick adattivo ---
let btDeviceClass = 'unknown'; // 'screen' | 'controller' | 'unknown'

function getTickMs(){
  return btDeviceClass === 'screen' ? 250 :
         btDeviceClass === 'controller' ? 500 : 750;
}

function markScreen(){ btDeviceClass = 'screen'; refreshProgressTimer(); }
function markRemote(){ if (btDeviceClass !== 'screen') { btDeviceClass = 'controller'; refreshProgressTimer(); } }

function progressTick(){
  const cur = player?.getCurrentTime?.() || 0;
  const dur = player?.getDuration?.() || 0;
  if (dur > 0) setWaveProgress(cur/dur);
  updateTimeUI(cur, dur);
  updateMediaSessionState();
}

function refreshProgressTimer(){
  if (!player) return;
  if (progressTimer){ clearInterval(progressTimer); progressTimer = null; }
  const st = player.getPlayerState ? player.getPlayerState() : -1;
  if (st === YT.PlayerState.PLAYING){
    progressTimer = setInterval(progressTick, getTickMs());
  }
}

function wireMediaSessionHandlers(){
  if (!('mediaSession' in navigator) || mediaSessionWired) return;
  mediaSessionWired = true;

  const safeSeek = (delta) => {
    try {
      const cur = player.getCurrentTime?.() || 0;
      const dur = player.getDuration?.() || 0;
      const pos = Math.max(0, Math.min(dur, cur + delta));
      player.seekTo?.(pos, true);
    } catch {}
  };

  try {
    navigator.mediaSession.setActionHandler('play',  () => { markRemote(); doPlay(); });
    navigator.mediaSession.setActionHandler('pause', () => { markRemote(); doPause(); });
    navigator.mediaSession.setActionHandler('stop',  () => { markRemote(); doStop(); });

    // next/prev canonici
    navigator.mediaSession.setActionHandler('nexttrack',     () => { markRemote(); next(); });
    navigator.mediaSession.setActionHandler('previoustrack', () => { markRemote(); prev(); });

    // molti headset mandano seek invece di next/prev:
    navigator.mediaSession.setActionHandler('seekforward', (d) => {
      markRemote();
      const off = d?.seekOffset ?? 10;
      // se è un "salto grosso" (>= 60s) lo interpretiamo come NEXT
      if (off >= 60) { next(); return; }
      safeSeek(off);
    });
    navigator.mediaSession.setActionHandler('seekbackward', (d) => {
      markRemote();
      const off = d?.seekOffset ?? 10;
      // salto grosso = PREV
      if (off >= 60) { prev(); return; }
      safeSeek(-off);
    });

  } catch {}
}

function updateMediaSessionMeta(rel){
  if (!('mediaSession' in navigator) || !rel) return;

  navigator.mediaSession.metadata = new MediaMetadata({
    title:  rel.title || '—',
    artist: (rel.artists && rel.artists.join(', ')) || 'BelloSounds Records',
    album:  rel.catalog || '—',
    artwork: rel.cover ? [
      { src: rel.cover, sizes: '512x512', type: 'image/jpeg' },
    ] : []
  });
}

function updateMediaSessionState(){
  if (!('mediaSession' in navigator) || !player) return;
  // playback state
  const st = player.getPlayerState ? player.getPlayerState() : -1;
  navigator.mediaSession.playbackState =
    (st === YT.PlayerState.PLAYING) ? 'playing' :
    (st === YT.PlayerState.PAUSED)  ? 'paused'  : 'none';
  // posizione (se disponibile)
  try {
    const dur = player.getDuration?.() || 0;
    const cur = player.getCurrentTime?.() || 0;
    if (dur > 0) {
      navigator.mediaSession.setPositionState({
        duration: dur,
        playbackRate: 1.0,
        position: cur
      });
    }
  } catch {}
}

// --- Estrattore ID YouTube interno (accetta ID, youtu.be, watch?v=, embed/...) ---
function extractYouTubeId(input){
  if (!input) return null;
  const s = String(input).trim();
  if (/^[\w-]{11}$/.test(s)) return s; // ID puro
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
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(); };
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

function updateTimeUI(cur, dur){
  const bar = document.getElementById('audio-footer'); if(!bar) return;
  const t0 = bar.querySelector('.t0'); const tt = bar.querySelector('.ttot');
  const fmt = s => {
    s = Math.max(0, Math.floor(s));
    const m = Math.floor(s/60), ss = (s%60).toString().padStart(2,'0');
    return `${m}:${ss}`;
  };
  if (t0)  t0.textContent  = fmt(cur);
  if (tt)  tt.textContent  = dur ? fmt(dur) : '0:00';
}

// ---------- Waveform from low-quality MP3 (Web Audio API) ----------
const WF_BUCKETS = 800;             // più definita
const WF_CACHE_NS = 'bsr_wf_v2:';   // key per localStorage

async function getPeaksFromPreview(url){
  const k = WF_CACHE_NS + url;
  const cached = localStorage.getItem(k);
  if (cached) return JSON.parse(cached);

  const resp = await fetch(url);
  const arr  = await resp.arrayBuffer();
  const ctx  = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 44100 });
  const buf  = await ctx.decodeAudioData(arr);

  const ch0 = buf.getChannelData(0);
  const ch1 = buf.numberOfChannels > 1 ? buf.getChannelData(1) : null;
  const len = ch0.length;
  const step = Math.floor(len / WF_BUCKETS);

  const peaks = new Array(WF_BUCKETS).fill(0);
  for (let i=0;i<WF_BUCKETS;i++){
    const start = i*step;
    const end   = i===WF_BUCKETS-1 ? len : start+step;
    let max = 0;
    for (let j=start;j<end;j+=4){ // stride
      const sL = ch0[j]; const sR = ch1 ? ch1[j] : sL;
      const m  = Math.abs((sL+sR)*0.5);
      if (m>max) max=m;
    }
    peaks[i]=max;
  }
  // smooth leggero
  for (let i=1;i<WF_BUCKETS-1;i++){
    peaks[i] = (peaks[i-1] + peaks[i]*2 + peaks[i+1]) / 4;
  }
  const mx = Math.max(...peaks)||1;
  const norm = peaks.map(v => Math.min(1, v/mx));

  localStorage.setItem(k, JSON.stringify(norm));
  return norm;
}

// --- lock dimensione per evitare “respiro” dell’onda ---
function lockWaveWidth(){
  const wf  = document.querySelector('#audio-footer .wf');
  if (!wf) return;
  const w = Math.round(wf.getBoundingClientRect().width);
  wf.style.width = w + 'px';
  wf.style.maxWidth = w + 'px';
}
window.addEventListener('resize', ()=>{
  const wf = document.querySelector('#audio-footer .wf');
  if (!wf) return;
  wf.style.width = '';
  wf.style.maxWidth = '';
  lockWaveWidth();
});

let WF_UID = 0; // per id unici nel DOM

function buildWavePath(peaks, W=100, H=36){
  // genera un profilo “specchiato” (sopra e sotto) in un unico path chiuso
  const top = [];
  const bot = [];
  const n = peaks.length;
  for (let i=0;i<n;i++){
    const x = (i/(n-1))*W;
    const amp = 4 + peaks[i]* (H*0.45);     // min 4px, max ~80% di H
    const yTop = (H/2) - amp;
    top.push(`${i===0?'M':'L'}${x.toFixed(2)},${yTop.toFixed(2)}`);
  }
  for (let i=n-1;i>=0;i--){
    const x = (i/(n-1))*W;
    const amp = 4 + peaks[i]* (H*0.45);
    const yBot = (H/2) + amp;
    bot.push(`L${x.toFixed(2)},${yBot.toFixed(2)}`);
  }
  return `${top.join(' ')} ${bot.join(' ')} Z`;
}

function clamp01(x){ return Math.min(1, Math.max(0, x)); }

function seekToPercent(p){
  if (!player) return;
  const dur = player.getDuration?.() || 0;
  if (dur > 0){
    let pos = dur * clamp01(p);
    // evita di “toccare” la fine: altrimenti YT può emettere ENDED
    const EPS = 0.30; // 300 ms
    if (pos > dur - EPS) pos = Math.max(0, dur - EPS);

    player.seekTo?.(pos, true);
    setWaveProgress(pos / dur);
    updateMediaSessionState();
  }
}

let waveAbort = null;

function wireWaveSeek(){
  let dragging = false;
  const wf = document.querySelector('#audio-footer .wf');
  if (!wf) return;

  // pulizia vecchi listener
  if (waveAbort) { waveAbort.abort(); }
  waveAbort = new AbortController();
  const { signal } = waveAbort;

  // preferiamo misurare l'SVG interno (evita padding del contenitore)
  const svg = wf.querySelector('svg') || wf;

  const getP = (evt)=>{
    const r = svg.getBoundingClientRect();
    const clientX = (evt.touches && evt.touches[0]?.clientX) ?? evt.clientX;
    return clamp01((clientX - r.left) / r.width);
  };

  const onClick = (evt)=>{ markScreen(); seekToPercent(getP(evt)); };
const onStart = (evt)=>{ dragging = true; wf.classList.add('seeking'); markScreen(); seekToPercent(getP(evt)); };
  
  
  const onMove  = (evt)=>{ if (dragging) { seekToPercent(getP(evt)); evt.preventDefault(); } };
  const onEnd   = ()=>{ dragging = false; wf.classList.remove('seeking'); };

  wf.addEventListener('click', onClick, { signal });
  wf.addEventListener('mousedown', onStart, { signal });
  window.addEventListener('mousemove', onMove, { passive:false, signal });
  window.addEventListener('mouseup', onEnd, { signal });
  wf.addEventListener('touchstart', onStart, { passive:true, signal });
  window.addEventListener('touchmove', onMove, { passive:false, signal });
  window.addEventListener('touchend', onEnd, { signal });
} 
  

function renderWave(peaks){
  const bar = document.getElementById('audio-footer');
  const wf  = bar?.querySelector('.wf');
  if (!wf) return;

  const uid = ++WF_UID;
  const W = 100, H = wf.clientHeight || 36;       // usa altezza reale box
  const pathD = buildWavePath(peaks, W, H);

  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent') || '#ff8a3d';

  wf.innerHTML = `
  <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" class="wf-svg">
    <defs>
      <clipPath id="wf-clip-${uid}">
        <path d="${pathD}"/>
      </clipPath>
    </defs>

    <!-- fondo onda -->
    <path d="${pathD}" fill="#202027"></path>

    <!-- rettangolo di avanzamento, colorato SOLO dentro la forma -->
    <g clip-path="url(#wf-clip-${uid})">
      <rect id="wf-progress-${uid}" x="0" y="0" width="0" height="${H}" fill="${accent}"></rect>
    </g>
  </svg>`;

  wf.dataset.wfId = String(uid);
  requestAnimationFrame(lockWaveWidth); // blocca larghezza per evitare “respiro”
  wireWaveSeek();
}

function setWaveProgress(percent){
  const wf  = document.querySelector('#audio-footer .wf');
  if (!wf) return;
  const uid = wf.dataset.wfId;
  const svg = wf.querySelector('svg');
  if (!uid || !svg) return;
  const W = svg.viewBox.baseVal.width  || 100;
  const rect = wf.querySelector(`#wf-progress-${uid}`);
  if (rect) rect.setAttribute('width', Math.max(0, Math.min(1, percent))*W);
}

// ---------- Stato coda ----------
function getReleaseBySlug(slug) {
  return releases.find(r => r.slug === slug);
}
function current() {
  if (state.index < 0 || state.index >= state.queue.length) return null;
  return getReleaseBySlug(state.queue[state.index]);
}

function onYTState(e) {
  if (!player) return;
switch (e.data) {
  case YT.PlayerState.PLAYING:
    state.playing = true;
    updateMediaSessionMeta(current());
    setToggleUI(true);
    clearInterval(progressTimer);
    progressTimer = setInterval(progressTick, getTickMs());
    updateMediaSessionState();
    break;

  case YT.PlayerState.PAUSED:
  case YT.PlayerState.BUFFERING:
    clearInterval(progressTimer); progressTimer = null;
    updateMediaSessionState();
    break;

  case YT.PlayerState.ENDED:
    clearInterval(progressTimer); progressTimer = null;
    setWaveProgress(1);
    updateMediaSessionState();
    next();
    break;

  default:
    break;
}
}

async function ensurePlayer() {
  await ensureYTApi();
  if (player) return player;
  playerReady = new Promise((resolve) => {
    player = new YT.Player(ensureHiddenHost(), {
      height: '0', width: '0',
      playerVars: { playsinline: 1, rel: 0 },
      events: {
        onReady: () => { wireMediaSessionHandlers(); resolve(); },
        onStateChange: onYTState
      }
    });
  });
  await playerReady;
  return player;
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
  updateMediaSessionMeta(rel);
updateMediaSessionState();

  // waveform reale (previewAudio -> calcola una volta, poi cache)
  if (rel.previewAudio){
    getPeaksFromPreview(rel.previewAudio)
      .then(renderWave)
      .catch(()=>{ renderWave(new Array(120).fill(0.3)); });
  } else {
    renderWave(new Array(120).fill(0.3));
  }

  enableControls(true);

  // carica e riproduci
  state.playing = true; // lo prepariamo “in playing” prima del load
  setWaveProgress(0);
  updateTimeUI(0, 0);
  player.loadVideoById(id);
  player.playVideo?.();
  setToggleUI(true);
}

// API pubbliche usate da app.js
export async function playReleaseNow(rel) {
  if (!rel || !rel.slug) return;
  const idxInQ = state.queue.indexOf(rel.slug);
  if (idxInQ === -1) state.queue.push(rel.slug);
  await playAt(idxInQ === -1 ? state.queue.length - 1 : idxInQ);
}

export function addToQueue(rel) {
  if (!rel || !rel.slug) return;
  if (!state.queue.includes(rel.slug)) {
    state.queue.push(rel.slug);
  }
  enableControls(true); // non parte subito
}

export function toggle() {
  if (!player) return;
  const st = player.getPlayerState ? player.getPlayerState() : -1;
  if (st === YT.PlayerState.PLAYING) {
    doPause();
  } else {
    doPlay();
  }
}

function doPlay(){
  if (!player) return;
  markScreen();
  player.playVideo?.();
  state.playing = true;
  setToggleUI(true);
  updateMediaSessionState();
  refreshProgressTimer();
}
function doPause(){
  if (!player) return;
  markScreen();
  player.pauseVideo?.();
  state.playing = false;
  setToggleUI(false);
  updateMediaSessionState();
  refreshProgressTimer();
}

function doStop(){
  if (!player) return;
  try { player.stopVideo?.(); } catch {}
  if (progressTimer) { clearInterval(progressTimer); progressTimer = null; } // <—
  state.playing = false;
  setWaveProgress(0);
  updateTimeUI(0, player.getDuration?.() || 0);
  setToggleUI(false);
  updateMediaSessionState();
}

export function next() {
  const cur = current();
  if (!cur) return;

  // se la coda ha 0/1 elementi, popolala con tutti i releases
  if (state.queue.length <= 1) {
    state.queue = releases.map(r => r.slug);
    state.index = state.queue.indexOf(cur.slug);
  }

  const ni = state.index + 1;
  if (ni < state.queue.length) {
    playAt(ni);
  } else {
    doStop(); // fine coda
  }
}

export function prev() {
  const cur = current();
  if (!cur) return;

  // se la coda ha 0/1 elementi, popolala con tutti i releases
  if (state.queue.length <= 1) {
    state.queue = releases.map(r => r.slug);
    state.index = state.queue.indexOf(cur.slug);
  }

  const pi = state.index - 1;
  if (pi >= 0) {
    playAt(pi);
  } else {
    playAt(0); // opzionale: vai all'inizio
  }
}

// ---------- Wire dei bottoni nel footer ----------
export function wireFooterControls() {
  const bar = getBar(); if (!bar) return;
  q('.btn-ctl.prev', bar)?.addEventListener('click', prev);
  q('.btn-ctl.next', bar)?.addEventListener('click', next);
  q('.btn-ctl.toggle', bar)?.addEventListener('click', toggle);
  enableControls(false);
}
