// components/cardRelease.js
import { onImageErrorUsePlaceholder } from '../utils.js';

export function cardRelease(rel){
  return `
  <article class="card-release">
    <a class="cover" href="./release.html?slug=${rel.slug}" aria-label="Open ${rel.title}">
      <figure>
        <img src="${rel.cover}" alt="${rel.title} — ${rel.artists.join(', ')}" loading="lazy"/>
      </figure>
    </a>
    <div class="meta">
      <span class="catalog">${rel.catalog}</span>
      <h3>${rel.title}</h3>
      <p class="artists">${rel.artists.join(', ')}</p>
      <div class="actions">
        <button class="btn xs play" data-action="play" data-slug="${rel.slug}">Play</button>
        <a class="btn xs" href="./release.html?slug=${rel.slug}">View</a>
      </div>
    </div>
  </article>`;
}

