// Shared announcement. Edit its text and destination in content/settings.js.
import { settings } from '../content/settings.js?v=20261001-announcement';

export function renderAnnouncement(){
  const header = document.getElementById('site-header');
  if (!header) return;
  const notice = settings.announcement;
  const existing = [...document.querySelectorAll('.notice-bar')];
  if (!notice?.enabled || !notice.text) {
    existing.forEach(bar => bar.remove());
    return;
  }
  const bar = existing.shift() || document.createElement('div');
  existing.forEach(duplicate => duplicate.remove());
  bar.id = 'site-announcement';
  bar.className = 'notice-bar';
  bar.setAttribute('role', 'region');
  bar.setAttribute('aria-label', 'Latest release');
  const inner = document.createElement('div');
  inner.className = 'inner';
  const text = document.createElement(notice.href ? 'a' : 'span');
  text.textContent = notice.text;
  if (notice.href) text.setAttribute('href', notice.href);
  inner.appendChild(text);
  bar.replaceChildren(inner);
  header.insertAdjacentElement('afterend', bar);
}

renderAnnouncement();
