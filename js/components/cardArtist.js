// components/cardArtist.js
export function cardArtist(artist){
  return `
  <article class="card card-artist">
    <a href="./artist.html?slug=${artist.slug}" aria-label="Open ${artist.name}">
      <figure>
        <img src="${artist.image}" alt="${artist.name}" loading="lazy" onerror="this.onerror=null;this.src='./images/placeholder.svg';"/>
      </figure>
      <div class="meta">
        <h3>${artist.name}</h3>
        <p class="artists">${artist.tagline||''}</p>
      </div>
    </a>
  </article>`;
}
