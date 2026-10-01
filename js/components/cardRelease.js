// components/cardRelease.js
import { onImageErrorUsePlaceholder } from '../utils.js';

export function cardRelease(rel){
  const tags = (rel.tags||[]).map(t=>`<span class="tag">#${t}</span>`).join(' ');
  return `
  <article class="card card-release">
    <a href="${rel.pageUrl || `./release.html?slug=${rel.slug}`}" aria-label="Open ${rel.title}">
      <figure>
        <img src="${rel.cover}" alt="${rel.title} — ${rel.artists.join(', ')}" loading="lazy" onerror="this.onerror=null;this.src='./images/placeholder.svg';"/>
      </figure>
      <div class="meta">
        <span class="catalog">${rel.catalog}${rel.previewOnly ? " · Pre-release preview" : ""}</span>
        <h3>${rel.title}</h3>
        <p class="artists">${rel.artists.join(', ')}</p>
        <div class="tags">${tags}</div>
      </div>
    </a>
  </article>`;
}

