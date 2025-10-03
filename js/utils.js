// utils.js
export function qs(selector, root=document){ return root.querySelector(selector); }
export function qsa(selector, root=document){ return Array.from(root.querySelectorAll(selector)); }
export function getParam(name){ const url = new URL(window.location.href); return url.searchParams.get(name); }
export function formatDate(iso){ if(!iso) return ''; try{ return new Date(iso).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'2-digit'});}catch(e){return iso;}}

export function renderHeaderFooter(settings){
  const header = document.getElementById('site-header');
  const footer = document.getElementById('site-footer');
  header.innerHTML = `
    <a class="site-brand" href="./">
      <span class="logo" aria-hidden="true"></span>
      <strong>${settings.brand}</strong>
    </a>
    <nav aria-label="Main menu">
      <a href="./releases.html">Releases</a>
      <a href="./artists.html">Artists</a>
      <a href="./playlists.html">Playlists</a>
      <a href="./about.html">About</a>
      <a href="./contact.html">Contact</a>
    </nav>
  `;
  footer.innerHTML = `
    <div class="grid">
      <div>© ${new Date().getFullYear()} ${settings.brand} · <a href="./legal.html">Legal</a></div>
      <div class="social" aria-label="Social links">
        ${renderSocial(settings.socials)}
      </div>
    </div>
    <div class="tagline">${settings.tagline}</div>
  `;
}

export function renderSocial(socials){
  if(!socials) return '';
  const icon = (name)=>`<img src="./icons/${name}.svg" alt="${name} icon" width="16" height="16" />`;
  const out = [];
  if(socials.youtube) out.push(`<a href="${socials.youtube}" target="_blank" rel="noopener">${icon('youtube')}</a>`);
  if(socials.soundcloud) out.push(`<a href="${socials.soundcloud}" target="_blank" rel="noopener">${icon('soundcloud')}</a>`);
  if(socials.spotify) out.push(`<a href="${socials.spotify}" target="_blank" rel="noopener">${icon('spotify')}</a>`);
  if(socials.instagram) out.push(`<a href="${socials.instagram}" target="_blank" rel="noopener">${icon('instagram')}</a>`);
  return out.join('');
}

export function onImageErrorUsePlaceholder(el){
  el.onerror = null; el.src = './images/placeholder.svg';
}

export function setPageMeta({title, description, image}){
  if(title) document.title = title;
  if(description){
    setOrCreate('meta[name="description"]','content',description, {name:'description'});
    setOrCreate('meta[property="og:description"]','content',description, {'property':'og:description'});
  }
  if(image){
    setOrCreate('meta[property="og:image"]','content',image, {'property':'og:image'});
  }
  setOrCreate('meta[property="og:title"]','content',document.title, {'property':'og:title'});
  setOrCreate('meta[property="og:type"]','content','website', {'property':'og:type'});
  function setOrCreate(sel,attr,val,attrs){
    let el = document.head.querySelector(sel);
    if(!el){ el = document.createElement('meta'); Object.entries(attrs).forEach(([k,v])=> el.setAttribute(k,v)); document.head.appendChild(el); }
    el.setAttribute(attr,val);
  }
}
