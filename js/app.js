// app.js - simple page boot dispatcher
import { settings } from '../content/settings.js';
import { renderHeaderFooter } from './utils.js';

renderHeaderFooter(settings);

// Dispatch by body data-page attribute
const page = document.body.dataset.page;

(async () => {
  try {
    if(page === 'home'){
      const mod = await import('./renderers/releases.js');
      mod.bootHome();
    } else if(page === 'releases'){
      const mod = await import('./renderers/releases.js');
      mod.bootReleases();
    } else if(page === 'release-detail'){
      const mod = await import('./renderers/releases.js');
      mod.bootReleaseDetail();
    } else if(page === 'artists'){
      const mod = await import('./renderers/artists.js');
      mod.bootArtists();
    } else if(page === 'artist-detail'){
      const mod = await import('./renderers/artists.js');
      mod.bootArtistDetail();
    } else if(page === 'playlists'){
      const mod = await import('./renderers/playlists.js');
      mod.bootPlaylists();
    } else if(page === 'playlist-detail'){
      const mod = await import('./renderers/playlists.js');
      mod.bootPlaylistDetail();
    }
  } catch (e){
    console.error('Boot error:', e);
    const app = document.getElementById('app');
    if(app) app.innerHTML = `<p>Something went wrong while loading this page.</p>`;
  }
})();
