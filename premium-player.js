// WAVE Premium Player - Comportamiento final de producción

const MOBILE_BP = 680;

function isMobile() {
  return window.innerWidth <= MOBILE_BP;
}

// ==========================================
// MOBILE DRAWER LOGIC
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

function openMobileDrawer(mode = 'library') {
  if (!isMobile()) return;
  
  mobDrawerOverlay.classList.add('is-open');
  mobDrawer.classList.add('is-open');
  
  if (mode === 'library') {
    mobDrawerTitle.textContent = '📚 Biblioteca';
    const trackList = document.getElementById('trackList');
    if (trackList) {
      mobDrawerContent.innerHTML = trackList.innerHTML;
      syncLibraryInDrawer();
    }
  } else if (mode === 'playlists') {
    mobDrawerTitle.textContent = '🎵 Mis Playlists';
    const playlistList = document.getElementById('playlistList');
    if (playlistList) {
      mobDrawerContent.innerHTML = playlistList.innerHTML;
      syncPlaylistsInDrawer();
    }
  }
  
  document.body.style.overflow = 'hidden';
}

function closeMobileDrawer() {
  mobDrawerOverlay.classList.remove('is-open');
  mobDrawer.classList.remove('is-open');
  document.body.style.overflow = '';
}

function syncLibraryInDrawer() {
  mobDrawerContent.querySelectorAll('.track-item').forEach((el, idx) => {
    el.onclick = () => {
      if (typeof currentIndex !== 'undefined') {
        currentIndex = idx;
        if (typeof playTrack === 'function') playTrack();
      }
      closeMobileDrawer();
    };
  });
}

function syncPlaylistsInDrawer() {
  mobDrawerContent.querySelectorAll('.playlist-item').forEach((el, idx) => {
    el.onclick = () => {
      if (typeof currentPlaylistIndex !== 'undefined') {
        currentPlaylistIndex = idx;
        if (typeof showPlaylistView === 'function') showPlaylistView();
      }
      closeMobileDrawer();
    };
  });
}

// Event listeners
if (mobNavLibrary) mobNavLibrary.addEventListener('click', () => openMobileDrawer('library'));
if (mobNavPlaylists) mobNavPlaylists.addEventListener('click', () => openMobileDrawer('playlists'));
if (mobDrawerClose) mobDrawerClose.addEventListener('click', closeMobileDrawer);
if (mobDrawerOverlay) mobDrawerOverlay.addEventListener('click', closeMobileDrawer);

if (mobNavSearch) {
  mobNavSearch.addEventListener('click', () => {
    const mobSearchOverlay = document.getElementById('mobSearchOverlay');
    if (mobSearchOverlay) {
      mobSearchOverlay.classList.add('is-open');
    }
  });
}

if (mobNavPlayer) {
  mobNavPlayer.addEventListener('click', () => {
    const viewPlayer = document.getElementById('viewPlayer');
    const viewHome = document.getElementById('viewHome');
    if (viewPlayer && viewHome) {
      viewHome.classList.add('hidden');
      viewPlayer.classList.add('active');
    }
  });
}

// ==========================================
// PLAYER VOLUME - STICKY & RESPONSIVE
// ==========================================

const volumeBar = document.getElementById('volumeBar');
const volPct = document.getElementById('volPct');
const volumeWrap = document.querySelector('.volume-wrap');
const controlsWrap = document.querySelector('.controls-wrap');

if (volumeBar) {
  volumeBar.addEventListener('input', (e) => {
    const vol = parseFloat(e.target.value);
    if (typeof audio !== 'undefined' && audio) {
      audio.volume = vol;
    }
    if (volPct) volPct.textContent = `${Math.round(vol * 100)}%`;
    
    // Update gradient visual
    const pct = vol * 100;
    e.target.style.background = `linear-gradient(to right, var(--accent) ${pct}%, rgba(255,255,255,0.12) ${pct}%)`;
  });
}

// ==========================================
// MINIPLAYER SYNC
// ==========================================

const miniplayer = document.getElementById('miniplayer');
const miniTitle = document.getElementById('miniTitle');
const miniArtist = document.getElementById('miniArtist');
const miniCover = document.getElementById('miniCover');
const miniPlay = document.getElementById('miniPlay');
const miniPrev = document.getElementById('miniPrev');
const miniNext = document.getElementById('miniNext');
const miniProgressFill = document.getElementById('miniProgressFill');
const miniClose = document.getElementById('miniClose');

function updateMiniplayer() {
  if (!miniplayer) return;
  
  if (typeof currentTrack !== 'undefined' && currentTrack) {
    miniTitle.textContent = currentTrack.name || 'Sin canción';
    miniArtist.textContent = currentTrack.artist || '—';
    
    if (currentTrack.cover) {
      miniCover.innerHTML = `<img src="${currentTrack.cover}" alt="cover" />`;
    }
    miniplayer.classList.add('is-visible');
  }
}

function updateMiniplayerProgress() {
  if (!miniplayer || !miniProgressFill) return;
  
  if (typeof audio !== 'undefined' && audio && audio.duration) {
    const pct = (audio.currentTime / audio.duration) * 100;
    miniProgressFill.style.width = pct + '%';
  }
}

if (miniPlay) miniPlay.addEventListener('click', () => {
  const btnPlay = document.getElementById('btnPlay');
  if (btnPlay) btnPlay.click();
});

if (miniPrev) miniPrev.addEventListener('click', () => {
  const btnPrev = document.getElementById('btnPrev');
  if (btnPrev) btnPrev.click();
});

if (miniNext) miniNext.addEventListener('click', () => {
  const btnNext = document.getElementById('btnNext');
  if (btnNext) btnNext.click();
});

if (miniClose) miniClose.addEventListener('click', () => {
  miniplayer.classList.remove('is-visible');
});

// ==========================================
// PROGRESS SYNC
// ==========================================

setInterval(() => {
  updateMiniplayerProgress();
  
  const progressBar = document.getElementById('progressBar');
  if (progressBar && typeof audio !== 'undefined' && audio && audio.duration) {
    const pct = (audio.currentTime / audio.duration) * 100;
    progressBar.style.background = `linear-gradient(to right, rgba(255,255,255,0.85) ${pct}%, rgba(255,255,255,0.12) ${pct}%)`;
  }
}, 100);

// ==========================================
// RESPONSIVE INIT
// ==========================================

function initResponsive() {
  const sidebar = document.querySelector('.sidebar');
  
  if (isMobile()) {
    if (mobBottomNav) mobBottomNav.style.display = 'flex';
    if (sidebar) sidebar.style.display = 'none';
  } else {
    if (mobBottomNav) mobBottomNav.style.display = 'none';
    if (sidebar) sidebar.style.display = 'flex';
    closeMobileDrawer();
  }
}

window.addEventListener('resize', initResponsive);
window.addEventListener('orientationchange', () => {
  setTimeout(initResponsive, 100);
});

// ==========================================
// KEYBOARD CONTROLS
// ==========================================

document.addEventListener('keydown', (e) => {
  const focused = document.activeElement;
  const isInputFocused = focused.tagName === 'INPUT' || focused.tagName === 'TEXTAREA';
  
  if (isInputFocused) return;
  
  const btnPlay = document.getElementById('btnPlay');
  const btnNext = document.getElementById('btnNext');
  const btnPrev = document.getElementById('btnPrev');
  const volumeBar = document.getElementById('volumeBar');
  
  if (e.code === 'Space') {
    e.preventDefault();
    if (btnPlay) btnPlay.click();
  } else if (e.code === 'ArrowRight') {
    e.preventDefault();
    if (btnNext) btnNext.click();
  } else if (e.code === 'ArrowLeft') {
    e.preventDefault();
    if (btnPrev) btnPrev.click();
  } else if (e.code === 'ArrowUp') {
    e.preventDefault();
    if (volumeBar) {
      volumeBar.value = Math.min(1, parseFloat(volumeBar.value) + 0.05).toFixed(2);
      volumeBar.dispatchEvent(new Event('input', { bubbles: true }));
    }
  } else if (e.code === 'ArrowDown') {
    e.preventDefault();
    if (volumeBar) {
      volumeBar.value = Math.max(0, parseFloat(volumeBar.value) - 0.05).toFixed(2);
      volumeBar.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
});

// ==========================================
// INIT
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  initResponsive();
  updateMiniplayer();
  
  // Close drawer on content scroll
  mobDrawerContent?.addEventListener('wheel', (e) => {
    if (e.deltaY > 100) {
      closeMobileDrawer();
    }
  });
});

console.log('%c✨ WAVE Premium Player v1.0 loaded', 'color: #00d9ff; font-weight: bold; font-size: 14px;');
