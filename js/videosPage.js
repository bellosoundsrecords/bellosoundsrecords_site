import { videos } from "../content/videos.js";

function extractYouTubeId(url){
  if (!url) return null;
  const s = String(url).trim();
  const m =
    s.match(/[?&]v=([\w-]{11})/) ||
    s.match(/youtu\.be\/([\w-]{11})/) ||
    s.match(/\/embed\/([\w-]{11})/);
  return m ? m[1] : s;
}

function renderVideoCard(video){
  const ytId = extractYouTubeId(video.embeds?.youtube);
  const ytIframe = ytId ? `
    <div class="video-embed-wrapper">
      <iframe
        class="video-embed"
        src="https://www.youtube.com/embed/${ytId}"
        title="${video.title}"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen></iframe>
    </div>
  ` : "";

  return `
    <article class="video-card">
      <div class="video-meta">
        <div class="cover">
          <img src="${video.cover}" alt="${video.title}">
        </div>
        <div class="text">
          <h2>${video.title}</h2>
          <p class="date">${new Date(video.date).toLocaleDateString("it-IT")}</p>
          <p class="desc">${video.description.replace(/\n/g, "<br>")}</p>
        </div>
      </div>
      ${ytIframe}
    </article>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  const app = document.getElementById("app");
  if (!app) return;

  app.innerHTML = `
    <section class="videos-list container">
      <h1 class="page-title">Videos</h1>
      ${videos.map(renderVideoCard).join("")}
    </section>
  `;
});
