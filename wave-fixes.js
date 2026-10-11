// WAVE Mobile & Desktop Fixes - Comportamiento premium
// Correcciones para playlist mobile + player desktop + drawer sincronizado

const MOBILE_BREAKPOINT = 680;

function isMobile() {
  return window.innerWidth <= MOBILE_BREAKPOINT;
}

// ==========================================
// MOBILE DRAWER - PLAYLISTS & LIBRARY
// ==========================================

const mobDrawer = document.getElementById('mobDrawer');
const mobDrawerOverlay = document.getElementById('mobDrawerOverlay');
const mobDrawerContent = document.getElementById('mobDrawerContent');
const mobDrawerTitle = document.getElementById('mobDrawerTitle');
const mobDrawerClose = document.getElementById('mobDrawerClose');
const mobNavLibrary = document.getElementById('mobNavLibrary');
const mobNavPlaylists = document.getElementById('mobNavPlaylists');
const mobNavSearch = document.getElementById('mobNavSearch');
const mobNavPlayer = document.getElementById('mobNavPlayer');
const mobBottomNav = document.getElementById('mobBottomNav');

// Sincronizar tabs del sidebar con drawer mobile
function openMobileDrawer(mode = 'library') {
  if (!isMobile()) return;
  
  mobDrawerOverlay.classList.add('is-open');
  mobDrawer.classList.add('is-open');
  
  if (mode === 'library') {
    mobDrawerTitle.textContent = '📚 Biblioteca';
    renderLibraryInMobileDrawer();
  } else if (mode === 'playlists') {
    mobDrawerTitle.textContent = '🎵 Mis Playlists';
    renderPlaylistsInMobileDrawer();
  }
  
  document.body.style.overflow = 'hidden';
}

function closeMobileDrawer() {
  mobDrawerOverlay.classList.remove('is-open');
  mobDrawer.classList.remove('is-open');
  document.body.style.overflow = '';
}

function renderLibraryInMobileDrawer() {
  const trackList = document.getElementById('trackList');
  mobDrawerContent.innerHTML = trackList.innerHTML;
  
  // Agregar handlers a los items
  mobDrawerContent.querySelectorAll('.track-item').forEach(el => {
    el.onclick = () => {
      const idx = Array.from(el.parentNode.children).indexOf(el);
      currentIndex = idx;
      playTrack();
      closeMobileDrawer();
    };
  });
}

function renderPlaylistsInMobileDrawer() {
  const playlistList = document.getElementById('playlistList');
  if (playlistList.querySelector('.track-list-empty')) {
    mobDrawerContent.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text-mid)">Sin playlists aún. Creá una desde el botón <strong>+</strong></div>';
    return;
  }
  
  mobDrawerContent.innerHTML = playlistList.innerHTML;
  
  mobDrawerContent.querySelectorAll('.playlist-item').forEach(el => {
    el.onclick = () => {
      const plIdx = Array.from(el.parentNode.children).indexOf(el);
      currentPlaylistIndex = plIdx;
      showPlaylistView();
      closeMobileDrawer();
    };
  });
}

// Event listeners
mobNavLibrary?.addEventListener('click', () => openMobileDrawer('library'));
mobNavPlaylists?.addEventListener('click', () => openMobileDrawer('playlists'));
mobDrawerClose?.addEventListener('click', closeMobileDrawer);
mobDrawerOverlay?.addEventListener('click', closeMobileDrawer);

mobNavSearch?.addEventListener('click', () => {
  const mobSearchOverlay = document.getElementById('mobSearchOverlay');
  if (mobSearchOverlay) mobSearchOverlay.classList.add('is-open');
});

mobNavPlayer?.addEventListener('click', () => {
  const viewPlayer = document.getElementById('viewPlayer');
  const viewHome = document.getElementById('viewHome');
  if (viewPlayer && viewHome) {
    viewHome.style.display = 'none';
    viewPlayer.style.display = 'flex';
  }
});

// ==========================================
// PLAYER DESKTOP - VOLUMEN & CONTROLS FIJOS
// ==========================================

const volumeBar = document.getElementById('volumeBar');
const volPct = document.getElementById('volPct');
const controlsWrap = document.querySelector('.controls-wrap');
const volumeWrap = document.querySelector('.volume-wrap');
const miniplayer = document.getElementById('miniplayer');

// Sincronizar volumen entre sliders
if (volumeBar) {
  volumeBar.addEventListener('input', (e) => {
    const vol = parseFloat(e.target.value);
    if (typeof audio !== 'undefined' && audio) {
      audio.volume = vol;
    }
    volPct.textContent = `${Math.round(vol * 100)}%`;
    
    // Sync con miniplayer si existe
    const miniVolume = document.getElementById('miniVolume');
    if (miniVolume) miniVolume.value = vol;
  });
}

// Desktop: hacer que el volumen sea sticky
if (volumeWrap) {
  volumeWrap.style.position = 'sticky';
  volumeWrap.style.bottom = '16px';
  volumeWrap.style.zIndex = '50';
  volumeWrap.style.background = 'linear-gradient(to top, var(--bg-panel), transparent)';
  volumeWrap.style.padding = '16px 0 0';
}

// Desktop: hacer que los controles sean sticky
if (controlsWrap) {
  controlsWrap.style.position = 'sticky';
  controlsWrap.style.bottom = '50px';
  controlsWrap.style.zIndex = '50';
}

// ==========================================
// MINIPLAYER - SINCRONIZACIÓN DE ESTADO
// ==========================================

const miniPlay = document.getElementById('miniPlay');
const miniTitle = document.getElementById('miniTitle');
const miniArtist = document.getElementById('miniArtist');
const miniCover = document.getElementById('miniCover');
const miniProgressFill = document.getElementById('miniProgressFill');
const miniPrev = document.getElementById('miniPrev');
const miniNext = document.getElementById('miniNext');
const miniClose = document.getElementById('miniClose');

function updateMiniplayerDisplay() {
  if (!miniplayer || !currentTrack) return;
  
  miniTitle.textContent = currentTrack.name || 'Sin canción';
  miniArtist.textContent = currentTrack.artist || '—';
  
  if (currentTrack.cover) {
    miniCover.innerHTML = `<img src="${currentTrack.cover}" alt="cover" style="width:100%;height:100%;object-fit:cover">`;
  }
  
  miniplayer.classList.add('is-visible');
}

function syncMiniplayerProgress() {
  if (!miniplayer || !audio) return;
  
  const pct = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
  if (miniProgressFill) miniProgressFill.style.width = pct + '%';
}

// Event listeners miniplayer
miniPlay?.addEventListener('click', () => {
  const btnPlay = document.getElementById('btnPlay');
  if (btnPlay) btnPlay.click();
});

miniPrev?.addEventListener('click', () => {
  const btnPrev = document.getElementById('btnPrev');
  if (btnPrev) btnPrev.click();
});

miniNext?.addEventListener('click', () => {
  const btnNext = document.getElementById('btnNext');
  if (btnNext) btnNext.click();
});

miniClose?.addEventListener('click', () => {
  miniplayer.classList.remove('is-visible');
});

// ==========================================
// SINCRONIZACIÓN GLOBAL DE REPRODUCCIÓN
// ==========================================

// Hook para actualizar miniplayer cuando cambia la canción
const originalPlayTrack = window.playTrack;
window.playTrack = function() {
  if (originalPlayTrack) originalPlayTrack.call(this);
  updateMiniplayerDisplay();
};

// Actualizar barra de progreso del miniplayer cada 100ms
setInterval(syncMiniplayerProgress, 100);

// ==========================================
// RESPONSIVE IMPROVEMENTS
// ==========================================

window.addEventListener('resize', () => {
  if (isMobile()) {
    mobBottomNav.style.display = 'flex';
    document.querySelector('.sidebar')?.style.display = 'none';
  } else {
    mobBottomNav.style.display = 'none';
    document.querySelector('.sidebar')?.style.display = 'flex';
    closeMobileDrawer();
  }
});

// Initial check
if (isMobile()) {
  mobBottomNav.style.display = 'flex';
  if (document.querySelector('.sidebar')) {
    document.querySelector('.sidebar').style.display = 'none';
  }
}

// ==========================================
// PREMIUM UX ENHANCEMENTS
// ==========================================

// Detectar cuando hay una canción reproduciendo
function updatePlayerUX() {
  const trackTitle = document.getElementById('trackTitle');
  const hasTrack = trackTitle && trackTitle.textContent !== 'Sin canción cargada';
  
  // Mostrar miniplayer solo si hay canción en mobile
  if (isMobile() && hasTrack && currentTrack) {
    miniplayer.classList.add('is-visible');
  }
}

// Hotkeys mejoradas
document.addEventListener('keydown', (e) => {
  if (e.target === document.querySelector('.modal-search input') || 
      e.target === document.getElementById('mobSearchInput') ||
      e.target === document.getElementById('urlDownloadInput') ||
      e.target === document.getElementById('modalSearchInput')) {
    return; // No interceptar en inputs
  }
  
  const btnPlay = document.getElementById('btnPlay');
  const btnNext = document.getElementById('btnNext');
  const btnPrev = document.getElementById('btnPrev');
  const volumeBar = document.getElementById('volumeBar');
  
  if (e.code === 'Space') {
    e.preventDefault();
    btnPlay?.click();
  } else if (e.code === 'ArrowRight') {
    e.preventDefault();
    btnNext?.click();
  } else if (e.code === 'ArrowLeft') {
    e.preventDefault();
    btnPrev?.click();
  } else if (e.code === 'ArrowUp') {
    e.preventDefault();
    if (volumeBar) {
      volumeBar.value = Math.min(1, parseFloat(volumeBar.value) + 0.05);
      volumeBar.dispatchEvent(new Event('input'));
    }
  } else if (e.code === 'ArrowDown') {
    e.preventDefault();
    if (volumeBar) {
      volumeBar.value = Math.max(0, parseFloat(volumeBar.value) - 0.05);
      volumeBar.dispatchEvent(new Event('input'));
    }
  }
});

// ==========================================
// INICIALIZAR
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  updatePlayerUX();
  updateMiniplayerDisplay();
  
  // Cerrar drawer al hacer scroll
  mobDrawerContent?.addEventListener('wheel', (e) => {
    if (e.deltaY > 100) {
      closeMobileDrawer();
    }
  });
});

console.log('WAVE fixes loaded: Mobile drawer + Player sync + Premium UX');
