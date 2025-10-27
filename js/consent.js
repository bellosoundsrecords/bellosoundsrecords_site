// js/consent.js
const CONSENT_KEY = 'bsr_consent_v1';

export function getConsent(){
  try { return JSON.parse(localStorage.getItem(CONSENT_KEY)) || null; }
  catch { return null; }
}
export function saveConsent(obj){
  localStorage.setItem(CONSENT_KEY, JSON.stringify(obj));
}

// --- GA4: carica solo se analytics=true
export function enableAnalytics(measurementId){
  if (!measurementId) return;
  if (document.getElementById('ga4-tag')) return;
  const s = document.createElement('script');
  s.id = 'ga4-tag';
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  function gtag(){ dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', measurementId);
}

// --- Sblocco embed: sposta data-src -> src solo se media=true
export function enableEmbeds(){
  document.querySelectorAll('[data-consent="media"][data-src]').forEach(el=>{
    if (!el.getAttribute('src')) {
      el.setAttribute('src', el.getAttribute('data-src'));
    }
  });
}

// --- Banner UI
export function mountCookieBar({measurementId, legalUrl='/legal.html'}={}){
  if (getConsent()) {
    // applica effetti se già dato
    const c = getConsent();
    if (c.analytics) enableAnalytics(measurementId);
    if (c.media) enableEmbeds();
    return;
  }
  const bar = document.createElement('div');
  bar.className = 'cookie-bar';
  bar.innerHTML = `
    <h4>Cookies & privacy</h4>
    <p>Usiamo solo cookie essenziali. Facoltativi: <strong>Analytics</strong> (GA4) e <strong>Media</strong> (YouTube/Spotify).
       Leggi <a class="cookie-link" href="${legalUrl}">informativa</a>.</p>
    <div class="cookie-actions">
      <button class="cookie-btn" data-act="essentials">Solo essenziali</button>
      <button class="cookie-btn" data-act="prefs">Preferenze</button>
      <button class="cookie-btn primary" data-act="accept">Accetta tutti</button>
    </div>
    <div class="cookie-actions" style="display:none" id="cookie-prefs">
      <label><input type="checkbox" id="ck-analytics" checked> Analytics</label>
      <label><input type="checkbox" id="ck-media" checked> Media (YT/Spotify)</label>
      <button class="cookie-btn primary" data-act="save-prefs">Salva</button>
    </div>
  `;
  document.body.appendChild(bar);
  bar.style.display = 'block';

  const setAndApply = (c)=>{
    saveConsent(c);
    if (c.analytics) enableAnalytics(measurementId);
    if (c.media) enableEmbeds();
    bar.remove();
  };

  bar.addEventListener('click', (e)=>{
    const act = e.target?.dataset?.act;
    if (!act) return;
    if (act === 'essentials') setAndApply({analytics:false, media:false, ts:Date.now()});
    if (act === 'accept')     setAndApply({analytics:true,  media:true,  ts:Date.now()});
    if (act === 'prefs')      bar.querySelector('#cookie-prefs').style.display = 'flex';
    if (act === 'save-prefs') {
      const analytics = bar.querySelector('#ck-analytics').checked;
      const media     = bar.querySelector('#ck-media').checked;
      setAndApply({analytics, media, ts:Date.now()});
    }
  });
}
