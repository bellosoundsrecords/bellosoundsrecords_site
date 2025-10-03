// components/filterBar.js
export function filterBar({years=[], aliases=[], tags=[]}, current={}, onChange){
  const yearOpts = ['All', ...years].map(y=>`<option ${current.year==y?'selected':''}>${y}</option>`).join('');
  const aliasOpts = ['All', ...aliases].map(a=>`<option ${current.alias==a?'selected':''} value="${a}">${a}</option>`).join('');
  const tagOpts = ['All', ...tags].map(t=>`<option ${current.tag==t?'selected':''} value="${t}">#${t}</option>`).join('');
  return `
  <div class="filter-bar">
    <label>Year <select id="f-year">${yearOpts}</select></label>
    <label>Alias <select id="f-alias">${aliasOpts}</select></label>
    <label>Tag <select id="f-tag">${tagOpts}</select></label>
    <label>Search <input id="f-q" type="search" placeholder="title/artist..."/></label>
  </div>`;
}

export function attachFilterBarHandlers(root, onChange){
  root.querySelector('#f-year')?.addEventListener('change', onChange);
  root.querySelector('#f-alias')?.addEventListener('change', onChange);
  root.querySelector('#f-tag')?.addEventListener('change', onChange);
  root.querySelector('#f-q')?.addEventListener('input', onChange);
}
