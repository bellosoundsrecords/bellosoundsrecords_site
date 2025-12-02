import { unreleased } from "../content/unreleased.js";
import { renderHero } from "./components/hero.js";
import { playReleaseNow, addToQueue } from "./components/footerPlayer.js";

function loadUnreleasedDetail() {
  const params = new URLSearchParams(location.search);
  const slug = params.get("slug");

  const rel = unreleased.find(r => r.slug === slug);

  const app = document.getElementById("app");

  if (!rel) {
    app.innerHTML = `<p>Track not found.</p>`;
    return;
  }

  app.innerHTML = `
    ${renderHero(rel)}
    <section class="content">
      <h2>Description</h2>
      <p>${rel.description}</p>

      ${rel.embeds?.youtube ? `
      <div class="embed-box">
        <iframe class="embed"
          src="https://www.youtube.com/embed/${rel.embeds.youtube}"
          allowfullscreen></iframe>
      </div>` : ""}

      <button class="btn" id="play-now">Play in Player</button>
      <button class="btn outline" id="queue">Add to Queue</button>
    </section>
  `;

  document.getElementById("play-now")?.addEventListener("click", () => {
    playReleaseNow(rel);
  });

  document.getElementById("queue")?.addEventListener("click", () => {
    addToQueue(rel);
  });
}

document.addEventListener("DOMContentLoaded", loadUnreleasedDetail);
