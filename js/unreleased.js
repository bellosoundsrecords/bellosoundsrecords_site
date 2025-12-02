import { unreleased } from "../content/unreleased.js";
import { renderReleaseCard } from "./components/releaseCard.js";

export function loadUnreleasedList() {
  const app = document.getElementById("app");
  app.innerHTML = `
    <section class="release-list">
      <h1>Unreleased</h1>
      <div class="grid">
        ${unreleased.map(renderReleaseCard).join("")}
      </div>
    </section>
  `;
}

document.addEventListener("DOMContentLoaded", loadUnreleasedList);
