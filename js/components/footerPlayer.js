// js/components/footerPlayer.js
// Player a tutta larghezza (footer) con coda semplice, basato su YouTube Iframe API.
// STEP 2: audio + queue + controlli base (niente progress/waveform).
let progressTimer = null;
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
const WF_BUCKETS = 800; // quante “barrette”
const WF_CACHE_NS = 'bsr_wf_v2:'; // key per localStorage

async function getPeaksFromPreview(url){
  const k = WF_CACHE_NS + url;
  const cached = localStorage.getItem(k);
  if (cached) return JSON.parse(cached);

  const resp = await fetch(url);
  const arr  = await resp.arrayBuffer();
  const ctx  = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 44100 });
  const buf  = await ctx.decodeAudioData(arr);

  // downmix mono + subsampling
  const ch0 = buf.getChannelData(0);
  const ch1 = buf.numberOfChannels > 1 ? buf.getChannelData(1) : null;
  const len = ch0.length;
  const step = Math.floor(len / WF_BUCKETS);

  const peaks = new Array(WF_BUCKETS).fill(0);
  for (let i=0;i<WF_BUCKETS;i++){
    const start = i*step;
    const end   = i===WF_BUCKETS-1 ? len : start+step;
    let max = 0;
    for (let j=start;j<end;j+=4){         // stride piccolo = più veloce
      const sL = ch0[j]; const sR = ch1 ? ch1[j] : sL;
      const m  = Math.abs((sL+sR)*0.5);
      if (m>max) max=m;
    }
    peaks[i]=max;
  }
  // smooth leggero
  for (let i=1;i<WF_BUCKETS-1;i++){
    peaks[i] = (peaks[i-1]+peaks[i]*2+peaks[i+1]) / 4;
  }
  const mx = Math.max(...peaks)||1;
  const norm = peaks.map(v => Math.min(1, v/mx));

  localStorage.setItem(k, JSON.stringify(norm));
  return norm;
}
  // normalizza 0..1
  const max = Math.max(...peaks) || 1;
  const norm = peaks.map(v => v / max);

  localStorage.setItem(k, JSON.stringify(norm));
  return norm;
}

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

function renderWave(peaks){
  const bar = document.getElementById('audio-footer');
  const wf  = bar?.querySelector('.wf');
  if (!wf) return;

  const uid = ++WF_UID;
  const W = 100, H = wf.clientHeight || 36;       // usa altezza reale box
  const pathD = buildWavePath(peaks, W, H);

  // colori da CSS
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

    <!-- barretta di avanzamento che colora SOLO dentro la forma -->
    <g clip-path="url(#wf-clip-${uid})">
      <rect id="wf-progress-${uid}" x="0" y="0" width="0" height="${H}" fill="${accent}"></rect>
    </g>
  </svg>`;
  
  // salva l'id sul nodo per update rapidi
  wf.dataset.wfId = String(uid);

  // blocca la larghezza per evitare “respiro”
  requestAnimationFrame(lockWaveWidth);
}

function setWaveProgress(percent){
  const bar = document.getElementById('audio-footer');
  const wf  = bar?.querySelector('.wf');
  if (!wf) return;
  const uid = wf.dataset.wfId;
  const svg = wf.querySelector('svg');
  if (!uid || !svg) return;
  const H = svg.viewBox.baseVal.height || 36;
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
      setToggleUI(true);
      // progress loop
      clearInterval(progressTimer);
      progressTimer = setInterval(()=>{
        const cur = player.getCurrentTime?.() || 0;
        const dur = player.getDuration?.() || 0;
        if (dur > 0) setWaveProgress(cur/dur);
        updateTimeUI(cur, dur); // facoltativo: per 0:00 / 0:00
      }, 250);
      break;
    case YT.PlayerState.PAUSED:
    case YT.PlayerState.BUFFERING:
      // pausa: ferma il timer ma non azzera
      clearInterval(progressTimer); progressTimer = null;
      break;
    case YT.PlayerState.ENDED:
      clearInterval(progressTimer); progressTimer = null;
      setWaveProgress(1);
      next();
      break;
    default:
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
  // se ho un previewAudio genero la waveform (una sola volta, poi cache)
if (rel.previewAudio){
  getPeaksFromPreview(rel.previewAudio)
    .then(renderWave)
    .catch(()=>{ /* fallback: resta la barra piatta */ });
} else {
  // niente preview -> waveform piatta
  renderWave(new Array(120).fill(0.3));
}

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
