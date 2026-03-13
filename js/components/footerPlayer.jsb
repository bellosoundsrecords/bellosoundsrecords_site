// js/components/footerPlayer.js
// Player a tutta larghezza (footer) con coda semplice, basato su <audio> HTML5.
// Supporta .ogg (preferito) + fallback .mp3 (Safari/iOS), queue, waveform da previewAudio,
// Media Session (BT / lockscreen / car) e una tendina per vedere/selezionare la coda.
//
// NOTE:
// - Il nome del dispositivo BT non è normalmente accessibile dal web: mostriamo solo una "spia" BT
//   (attiva quando si rileva uso da controlli remoti / media session).
// - OGG non è supportato su Safari/iOS -> fallback su mp3Audio.
// - Per seek/buffering ottimali, il server dovrebbe supportare HTTP Range requests.

let progressTimer = null;

// --- Media Session (BT / lockscreen / car) ---
let mediaSessionWired = false;

// --- Heuristics BT / Screen & tick adattivo ---
let btDeviceClass = 'unknown'; // 'screen' | 'controller' | 'unknown'
let btLastRemoteTs = 0;        // euristica: quando arriva un comando remoto

import { releases } from '../../content/releases.js';

// -------------------------
// Utils
// -------------------------
function q(sel, root = document) { return root.querySelector(sel); }
function getBar() { return document.getElementById('audio-footer'); }

function clamp01(x){ return Math.min(1, Math.max(0, x)); }

function getTickMs(){
  return btDeviceClass === 'screen' ? 250 :
         btDeviceClass === 'controller' ? 500 : 750;
}

function markScreen(){ btDeviceClass = 'screen'; refreshProgressTimer(); }
function markRemote(){
  btLastRemoteTs = Date.now();
  if (btDeviceClass !== 'screen') { btDeviceClass = 'controller'; refreshProgressTimer(); }
  updateBtUI();
}

function fmtTime(s){
  s = Math.max(0, Math.floor(s || 0));
  const m = Math.floor(s/60), ss = (s%60).toString().padStart(2,'0');
  return `${m}:${ss}`;
}

// -------------------------
// Audio element (singleton)
// -------------------------
let audioEl = null;

function ensureAudioEl(){
  if (audioEl) return audioEl;

  audioEl = document.getElementById('bsr-audio-el');
  if (!audioEl){
    audioEl = document.createElement('audio');
    audioEl.id = 'bsr-audio-el';
    audioEl.preload = 'auto';
    audioEl.crossOrigin = 'anonymous';
    audioEl.style.cssText = 'position:absolute;width:0;height:0;left:-9999px;top:-9999px;opacity:0;';
    document.body.appendChild(audioEl);
  }
  wireAudioEvents(audioEl);
  wireMediaSessionHandlers();
  return audioEl;
}

function pickSource(rel){
  // Preferisci OGG se supportato, altrimenti MP3 (Safari/iOS).
  if (!rel) return null;
  const test = document.createElement('audio');
  const canOgg = !!rel.oggAudio && test.canPlayType('audio/ogg; codecs="vorbis"');
  const canMp3 = !!rel.mp3Audio && test.canPlayType('audio/mpeg');

  if (canOgg) return rel.oggAudio;
  if (canMp3) return rel.mp3Audio;

  // fallback "grezzo": prova ciò che c'è
  return rel.oggAudio || rel.mp3Audio || null;
}

// -------------------------
// State & queue
// -------------------------
const state = {
  queue: [],    // array di slug
  index: -1,    // indice corrente in queue
  playing: false
};

function getReleaseBySlug(slug) {
  return releases.find(r => r.slug === slug);
}
function current() {
  if (state.index < 0 || state.index >= state.queue.length) return null;
  return getReleaseBySlug(state.queue[state.index]);
}

// -------------------------
// UI helpers
// -------------------------
function setToggleUI(isPlaying) {
  const bar = getBar();
  if (!bar) return;
  const btn = q('.btn-ctl.toggle', bar);
  if (!btn) return;
  btn.textContent = isPlaying ? '⏸' : '⏯';
}

function enableControls(enabled) {
  const bar = getBar(); if (!bar) return;
  const hasQueue = state.queue.length > 1;

  // Toggle sempre attivo quando enabled=true
  const toggleBtn = bar.querySelector('.btn-ctl.toggle');
  if (toggleBtn){
    toggleBtn.style.cursor = enabled ? 'pointer' : 'not-allowed';
    toggleBtn.style.opacity = enabled ? '1' : '.5';
  }

  // Prev/Next solo se c'è una vera coda
  ['prev','next'].forEach(cls => {
    const btn = bar.querySelector('.btn-ctl.'+cls);
    if (!btn) return;
    const ok = enabled && hasQueue;
    btn.style.cursor = ok ? 'pointer' : 'not-allowed';
    btn.style.opacity = ok ? '1' : '.4';
  });

  // Queue button
  const qbtn = bar.querySelector('.btn-ctl.queue');
  if (qbtn){
    qbtn.style.cursor = enabled ? 'pointer' : 'not-allowed';
    qbtn.style.opacity = enabled ? '1' : '.6';
  }
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
  const bar = getBar(); if(!bar) return;
  const t0 = bar.querySelector('.t0'); const tt = bar.querySelector('.ttot');
  if (t0) t0.textContent = fmtTime(cur);
  if (tt) tt.textContent = dur ? fmtTime(dur) : '0:00';
}

function updateBufferUI(cur, dur){
  // Mostra in modo discreto "BUF +Xs" se stai buffrando.
  const bar = getBar(); if(!bar) return;
  const el = bar.querySelector('.bt-buf'); // riuso classe "bt-buf" (buffer)
  if (!el) return;

  const a = audioEl;
  if (!a || !dur || !a.buffered || a.buffered.length === 0){
    el.textContent = '';
    el.style.opacity = '0';
    return;
  }

  let end = 0;
  try {
    // trova il range buffered che contiene currentTime (o il più vicino)
    for (let i=0;i<a.buffered.length;i++){
      const s = a.buffered.start(i);
      const e = a.buffered.end(i);
      if (cur >= s && cur <= e){ end = e; break; }
      end = Math.max(end, e);
    }
  } catch {}

  const buf = Math.max(0, end - cur);
  if (buf >= 2 && state.playing){ // soglia per non "lampeggiare"
    el.textContent = `BUF +${Math.floor(buf)}s`;
    el.style.opacity = '1';
  } else {
    el.textContent = '';
    el.style.opacity = '0';
  }
}

function ensureQueueUI(){
  const bar = getBar(); if (!bar) return;

  // Crea un piccolo bottone e una tendina se non esistono già nel markup
  let qbtn = bar.querySelector('.btn-ctl.queue');
  if (!qbtn){
    const anchor = bar.querySelector('.btn-ctl.next') || bar.querySelector('.btn-ctl.toggle');
    qbtn = document.createElement('button');
    qbtn.type = 'button';
    qbtn.className = 'btn-ctl queue';
    qbtn.textContent = '≡';
    qbtn.title = 'Queue';
    qbtn.style.cssText = 'margin-left:8px;';
    anchor?.parentNode?.insertBefore(qbtn, anchor.nextSibling);
  }

  let panel = bar.querySelector('.queue-panel');
  if (!panel){
    panel = document.createElement('div');
    panel.className = 'queue-panel';
    panel.style.cssText = `
      position:absolute; right:12px; bottom:64px;
      width:min(420px, 92vw);
      max-height:44vh; overflow:auto;
      background:rgba(10,10,14,.96);
      border:1px solid rgba(255,255,255,.10);
      border-radius:12px;
      box-shadow:0 14px 30px rgba(0,0,0,.45);
      padding:10px;
      display:none;
      z-index:9999;
      backdrop-filter: blur(8px);
    `;
    // bar.style.position = bar.style.position || 'relative';
    bar.appendChild(panel);
  }

  qbtn.addEventListener('click', () => {
    markScreen();
    panel.style.display = (panel.style.display === 'none' || !panel.style.display) ? 'block' : 'none';
    renderQueueList();
  });

  // chiudi clic fuori
  document.addEventListener('click', (evt) => {
    if (!panel || panel.style.display !== 'block') return;
    if (panel.contains(evt.target) || qbtn.contains(evt.target)) return;
    panel.style.display = 'none';
  });
}

function renderQueueList(){
  const bar = getBar(); if (!bar) return;
  const panel = bar.querySelector('.queue-panel'); if (!panel) return;

  const items = state.queue.map((slug, i) => {
    const r = getReleaseBySlug(slug);
    const title = (r?.title || slug);
    const artist = (r?.artists?.join(', ') || 'BelloSounds Records');
    const active = (i === state.index);
    return `
      <div class="q-item" data-qi="${i}"
           style="display:flex;gap:10px;align-items:center;padding:8px 6px;border-radius:10px;cursor:pointer;${active?'background:rgba(255,255,255,.06);':''}">
        <div style="flex:1;min-width:0">
          <div style="font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(title)}</div>
          <div style="font-size:12px;opacity:.75;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(artist)}</div>
        </div>
        <div style="font-size:12px;opacity:.7">${active ? '▶' : ''}</div>
      </div>`;
  }).join('');

  panel.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
      <div style="font-size:12px;opacity:.8;letter-spacing:.08em;text-transform:uppercase;">Queue</div>
      <button type="button" class="q-close" style="background:transparent;border:0;color:inherit;opacity:.7;cursor:pointer;font-size:14px;">✕</button>
    </div>
    ${items || `<div style="opacity:.75;font-size:13px;padding:8px 2px;">Queue is empty.</div>`}
  `;

  panel.querySelector('.q-close')?.addEventListener('click', ()=>{ panel.style.display='none'; });

  panel.querySelectorAll('.q-item').forEach(el=>{
    el.addEventListener('click', ()=>{
      markScreen();
      const idx = Number(el.getAttribute('data-qi'));
      if (!Number.isNaN(idx)) playAt(idx);
    });
  });
}

function escapeHtml(s){
  return String(s ?? '')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');
}

// --- BT "spia" (non il nome device) ---
function ensureBtUI(){
  const bar = getBar(); if (!bar) return;
  let el = bar.querySelector('.bt-ind');
  if (!el){
    el = document.createElement('div');
    el.className = 'bt-ind';
    el.style.cssText = 'margin-left:10px;font-size:11px;opacity:.6;display:flex;align-items:center;gap:6px;';
    el.innerHTML = `<span class="dot" style="width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,.25);display:inline-block;"></span>
                    <span class="lbl">BT</span>
                    <span class="bt-buf" style="margin-left:6px;opacity:0;transition:opacity .2s;"></span>`;
    // prova ad appenderlo vicino ai tempi, se esiste un contenitore
    const right = bar.querySelector('.right') || bar;
    right.appendChild(el);
  }
  updateBtUI();
}

function updateBtUI(){
  const bar = getBar(); if (!bar) return;
  const dot = bar.querySelector('.bt-ind .dot');
  if (!dot) return;

  // euristica: se abbiamo ricevuto comando remoto di recente o se siamo in modalità controller
  const hot = (Date.now() - btLastRemoteTs) < 15000;
  const on = (btDeviceClass === 'controller') || hot;

  dot.style.background = on ? 'rgba(0,255,140,.75)' : 'rgba(255,255,255,.25)';
  dot.style.boxShadow = on ? '0 0 10px rgba(0,255,140,.45)' : 'none';
}

// -------------------------
// Waveform from previewAudio (Web Audio API)
// -------------------------
const WF_BUCKETS = 800;
const WF_CACHE_NS = 'bsr_wf_v2:';

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
    for (let j=start;j<end;j+=4){
      const sL = ch0[j]; const sR = ch1 ? ch1[j] : sL;
      const m  = Math.abs((sL+sR)*0.5);
      if (m>max) max=m;
    }
    peaks[i]=max;
  }
  for (let i=1;i<WF_BUCKETS-1;i++){
    peaks[i] = (peaks[i-1] + peaks[i]*2 + peaks[i+1]) / 4;
  }
  const mx = Math.max(...peaks)||1;
  const norm = peaks.map(v => Math.min(1, v/mx));

  localStorage.setItem(k, JSON.stringify(norm));
  return norm;
}

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

let WF_UID = 0;
let waveAbort = null;

function buildWavePath(peaks, W=100, H=36){
  const top = [];
  const bot = [];
  const n = peaks.length;
  for (let i=0;i<n;i++){
    const x = (i/(n-1))*W;
    const amp = 4 + peaks[i]* (H*0.45);
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

function wireWaveSeek(){
  let dragging = false;
  const wf = document.querySelector('#audio-footer .wf');
  if (!wf) return;

  if (waveAbort) { waveAbort.abort(); }
  waveAbort = new AbortController();
  const { signal } = waveAbort;

  const svg = wf.querySelector('svg') || wf;

  const getP = (evt)=>{
    const r = svg.getBoundingClientRect();
    const clientX = (evt.touches && evt.touches[0]?.clientX) ?? evt.clientX;
    return clamp01((clientX - r.left) / r.width);
  };

  const onSeek = (evt)=>{
    markScreen();
    const a = ensureAudioEl();
    const dur = a.duration || 0;
    if (!dur) return;
    let pos = dur * getP(evt);
    const EPS = 0.15; // evita tocchi fine
    if (pos > dur - EPS) pos = Math.max(0, dur - EPS);
    a.currentTime = pos;
    setWaveProgress(pos / dur);
    updateMediaSessionState();
  };

  const onClick = (evt)=> onSeek(evt);
  const onStart = (evt)=>{ dragging = true; wf.classList.add('seeking'); onSeek(evt); };
  const onMove  = (evt)=>{ if (dragging) { onSeek(evt); evt.preventDefault(); } };
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
  const bar = getBar();
  const wf  = bar?.querySelector('.wf');
  if (!wf) return;

  const uid = ++WF_UID;
  const W = 100, H = wf.clientHeight || 36;
  const pathD = buildWavePath(peaks, W, H);

  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent') || '#ff8a3d';

  wf.innerHTML = `
  <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" class="wf-svg">
    <defs>
      <clipPath id="wf-clip-${uid}">
        <path d="${pathD}"/>
      </clipPath>
    </defs>

    <path d="${pathD}" fill="#202027"></path>

    <g clip-path="url(#wf-clip-${uid})">
      <rect id="wf-progress-${uid}" x="0" y="0" width="0" height="${H}" fill="${accent}"></rect>
    </g>
  </svg>`;

  wf.dataset.wfId = String(uid);
  requestAnimationFrame(lockWaveWidth);
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

// -------------------------
// Media Session
// -------------------------
function wireMediaSessionHandlers(){
  if (!('mediaSession' in navigator) || mediaSessionWired) return;
  mediaSessionWired = true;

  const safeSeek = (delta) => {
    const a = ensureAudioEl();
    const cur = a.currentTime || 0;
    const dur = a.duration || 0;
    if (!dur) return;
    const pos = Math.max(0, Math.min(dur, cur + delta));
    a.currentTime = pos;
  };

  try {
    navigator.mediaSession.setActionHandler('play',  () => { markRemote(); doPlay(); });
    navigator.mediaSession.setActionHandler('pause', () => { markRemote(); doPause(); });
    navigator.mediaSession.setActionHandler('stop',  () => { markRemote(); doStop(); });

    navigator.mediaSession.setActionHandler('nexttrack',     () => { markRemote(); next(); });
    navigator.mediaSession.setActionHandler('previoustrack', () => { markRemote(); prev(); });

    // headset spesso manda seek invece di next/prev
    navigator.mediaSession.setActionHandler('seekforward', (d) => {
      markRemote();
      const off = d?.seekOffset ?? 10;
      if (off >= 60) { next(); return; }
      safeSeek(off);
    });
    navigator.mediaSession.setActionHandler('seekbackward', (d) => {
      markRemote();
      const off = d?.seekOffset ?? 10;
      if (off >= 60) { prev(); return; }
      safeSeek(-off);
    });

    navigator.mediaSession.setActionHandler('seekto', (d) => {
      markRemote();
      const a = ensureAudioEl();
      const dur = a.duration || 0;
      if (!dur) return;
      const pos = Math.max(0, Math.min(dur, d?.seekTime ?? 0));
      a.currentTime = pos;
    });

  } catch {}
}

function updateMediaSessionMeta(rel){
  if (!('mediaSession' in navigator) || !rel) return;

  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title:  rel.title || '—',
      artist: (rel.artists && rel.artists.join(', ')) || 'BelloSounds Records',
      album:  rel.catalog || '—',
      artwork: rel.cover ? [
        { src: rel.cover, sizes: '512x512', type: 'image/jpeg' },
      ] : []
    });
  } catch {}
}

function updateMediaSessionState(){
  if (!('mediaSession' in navigator)) return;
  const a = audioEl;
  if (!a) return;

  navigator.mediaSession.playbackState = a.paused ? 'paused' : 'playing';

  try {
    const dur = a.duration || 0;
    const cur = a.currentTime || 0;
    if (dur > 0) {
      navigator.mediaSession.setPositionState({
        duration: dur,
        playbackRate: a.playbackRate || 1.0,
        position: cur
      });
    }
  } catch {}
}

// -------------------------
// Progress tick
// -------------------------
function progressTick(){
  const a = audioEl;
  if (!a) return;
  const cur = a.currentTime || 0;
  const dur = a.duration || 0;
  if (dur > 0) setWaveProgress(cur/dur);
  updateTimeUI(cur, dur);
  updateBufferUI(cur, dur);
  updateMediaSessionState();
  updateBtUI();
}

function refreshProgressTimer(){
  if (!audioEl) return;
  if (progressTimer){ clearInterval(progressTimer); progressTimer = null; }
  if (!audioEl.paused){
    progressTimer = setInterval(progressTick, getTickMs());
  }
}

// -------------------------
// Audio events
// -------------------------
function wireAudioEvents(a){
  if (a._bsrWired) return;
  a._bsrWired = true;

  a.addEventListener('play', () => {
    state.playing = true;
    setToggleUI(true);
    refreshProgressTimer();
    updateMediaSessionState();
  });

  a.addEventListener('pause', () => {
    state.playing = false;
    setToggleUI(false);
    refreshProgressTimer();
    updateMediaSessionState();
  });

  a.addEventListener('waiting', () => {
    // buffer
    refreshProgressTimer();
    updateMediaSessionState();
  });

  a.addEventListener('stalled', () => {
    refreshProgressTimer();
  });

  a.addEventListener('timeupdate', () => {
    // tick leggero: l'interval fa il lavoro "smooth", qui solo fail-safe
    if (!progressTimer && !a.paused) refreshProgressTimer();
  });

  a.addEventListener('durationchange', () => {
    progressTick();
  });

  a.addEventListener('ended', () => {
    setWaveProgress(1);
    next();
  });
}

// -------------------------
// Playback control
// -------------------------
export async function playReleaseNow(rel) {
  if (!rel || !rel.slug) return;
  ensureAudioEl();
  ensureQueueUI();
  ensureBtUI();

  const idxInQ = state.queue.indexOf(rel.slug);
  if (idxInQ === -1) state.queue.push(rel.slug);
  await playAt(idxInQ === -1 ? state.queue.length - 1 : idxInQ);
}

async function playAt(index) {
  const step = (state.index === -1) ? 1 : (index >= state.index ? 1 : -1);
  let i = index;

  while (i >= 0 && i < state.queue.length) {
    const relTry = getReleaseBySlug(state.queue[i]);
    const srcTry = pickSource(relTry);

    if (relTry && srcTry) {
      state.index = i;
      const rel = relTry;

      const a = ensureAudioEl();
      updateMetaUI(rel);
      updateMediaSessionMeta(rel);
      updateMediaSessionState();

      // waveform: usa sempre previewAudio (tipicamente mp3 leggero)
      if (rel.previewAudio) {
        getPeaksFromPreview(rel.previewAudio)
          .then(renderWave)
          .catch(() => renderWave(new Array(120).fill(0.3)));
      } else {
        renderWave(new Array(120).fill(0.3));
      }

      enableControls(true);
      setWaveProgress(0);
      updateTimeUI(0, 0);
      updateBufferUI(0, 0);

      // carica & play
      try {
        if (a.src !== srcTry) a.src = srcTry;
        a.load();
      } catch {}

      try {
        const p = a.play();
        if (p?.catch) p.catch(()=>{ /* autoplay block */ });
      } catch {}

      state.playing = !a.paused;
      setToggleUI(state.playing);

      renderQueueList();
      return;
    }
    i += step;
  }

  doStop();
}

export function addToQueue(rel) {
  if (!rel || !rel.slug) return;
  ensureQueueUI();
  ensureBtUI();
  if (!state.queue.includes(rel.slug)) state.queue.push(rel.slug);
  enableControls(true);
  renderQueueList();
}

export function toggle() {
  const a = audioEl;
  if (!a) return;
  if (!a.paused) doPause(); else doPlay();
}

function doPlay(){
  const a = ensureAudioEl();
  markScreen();
  try { a.play(); } catch {}
  state.playing = true;
  setToggleUI(true);
  updateMediaSessionState();
  refreshProgressTimer();
}

function doPause(){
  const a = ensureAudioEl();
  markScreen();
  try { a.pause(); } catch {}
  state.playing = false;
  setToggleUI(false);
  updateMediaSessionState();
  refreshProgressTimer();
}

function doStop(){
  const a = audioEl;
  if (!a) return;
  try { a.pause(); } catch {}
  try { a.currentTime = 0; } catch {}
  if (progressTimer) { clearInterval(progressTimer); progressTimer = null; }
  state.playing = false;
  setWaveProgress(0);
  updateTimeUI(0, a.duration || 0);
  setToggleUI(false);
  updateMediaSessionState();
}

export function next() {
  if (state.queue.length <= 1) { 
    doStop(); 
    return; 
  }
  const ni = state.index + 1;
  if (ni < state.queue.length) playAt(ni);
  else doStop();
}

export function prev() {
  const rel = current();
  if (!rel) return;

  // Se non c'è una vera coda: torna all'inizio
  if (state.queue.length <= 1) {
    try { ensureAudioEl().currentTime = 0; } catch {}
    return;
  }

  const pi = state.index - 1;
  if (pi >= 0) playAt(pi);
  else playAt(0);
}

// -------------------------
// Wire footer controls
// -------------------------
export function wireFooterControls() {
  const bar = getBar(); if (!bar) return;

  // assicura UI extra (queue + bt)
  ensureQueueUI();
  ensureBtUI();

  q('.btn-ctl.prev', bar)?.addEventListener('click', () => { markScreen(); prev(); });
  q('.btn-ctl.next', bar)?.addEventListener('click', () => { markScreen(); next(); });
  q('.btn-ctl.toggle', bar)?.addEventListener('click', () => { markScreen(); toggle(); });

  enableControls(false);
}
