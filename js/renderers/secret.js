// js/renderers/secret.js

import { unreleased } from '../content/unreleased.js';   // sezione unreleased
import { videos } from '../content/videos.js';           // sezione video futuri

export function bootSecretRoom(){
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = `
    <section class="secret-hero">
      <h1>Secret Room</h1>
      <p>Exclusive materials, unreleased tracks, video sessions and drafts.</p>
    </section>

    <section id="unreleased-section"></section>
    <section id="videos-section"></section>
  `;

  renderUnreleased();
  renderVideos();
}

// --- UNRELEASED ---
function renderUnreleased(){
  const box = document.getElementById('unreleased-section');
  if (!box) return;

  let html = `<h2>Unreleased Tracks</h2><div class="grid">`;

  unreleased.forEach(item=>{
    html += `
      <article class="card">
        <img src="${item.cover}" class="cov" />
        <h3>${item.title}</h3>
        <p>${item.description}</p>
        <button data-action="play-unrel" data-id="${item.youtube}">
          ▶ Play Preview
        </button>
      </article>
    `;
  });

  html += `</div>`;
  box.innerHTML = html;

  // in seguito collegheremo il player
}

// --- VIDEO ---
function renderVideos(){
  const box = document.getElementById('videos-section');
  if (!box) return;

  let html = `<h2>Video Sessions</h2><div class="grid">`;

  videos.forEach(v=>{
    html += `
      <article class="card">
        <h3>${v.title}</h3>
        <iframe width="100%" height="250"
          src="https://www.youtube.com/embed/${v.youtube}"
          frameborder="0" allowfullscreen></iframe>
        <p>${v.description}</p>
      </article>
    `;
  });

  html += `</div>`;
  box.innerHTML = html;
}
