
const fileInput        = document.getElementById('fileInput');
const trackList        = document.getElementById('trackList');
const trackCount       = document.getElementById('trackCount');
const searchInput      = document.getElementById('searchInput');
const sortNameBtn      = document.getElementById('sortName');
const sortDurBtn       = document.getElementById('sortDuration');
const sortRecBtn       = document.getElementById('sortRecent');
const queueInfoEl      = document.getElementById('queueInfo');
const clearLibBtn      = document.getElementById('clearLibBtn');
const folderBtn        = document.getElementById('folderBtn');

const tabLibrary       = document.getElementById('tabLibrary');
const tabPlaylists     = document.getElementById('tabPlaylists');
const panelLibrary     = document.getElementById('panelLibrary');
const panelPlaylists   = document.getElementById('panelPlaylists');
const playlistList     = document.getElementById('playlistList');
const newPlaylistBtn   = document.getElementById('newPlaylistBtn');

const btnPlay          = document.getElementById('btnPlay');
const btnPrev          = document.getElementById('btnPrev');
const btnNext          = document.getElementById('btnNext');
const btnShuffle       = document.getElementById('btnShuffle');
const btnRepeat        = document.getElementById('btnRepeat');
const iconPlay         = document.getElementById('iconPlay');
const iconPause        = document.getElementById('iconPause');

const progressBar      = document.getElementById('progressBar');
const volumeBar        = document.getElementById('volumeBar');
const timeCurrent      = document.getElementById('timeCurrent');
const timeTotal        = document.getElementById('timeTotal');
const trackTitle       = document.getElementById('trackTitle');
const trackArtist      = document.getElementById('trackArtist');
const trackAlbum       = document.getElementById('trackAlbum');
const badgeIdx         = document.getElementById('badgeIdx');
const badgeDuration    = document.getElementById('badgeDuration');
const badgeYear        = document.getElementById('badgeYear');
const coverArt         = document.getElementById('coverArt');
const volPct           = document.getElementById('volPct');
const vizCanvas        = document.getElementById('vizCanvas');
const ctx2d            = vizCanvas.getContext('2d');

const queueList        = document.getElementById('queueList');
const queueCount       = document.getElementById('queueCount');
const queueClearBtn    = document.getElementById('queueClearBtn');

const viewPlayer       = document.getElementById('viewPlayer');
const viewPlaylist     = document.getElementById('viewPlaylist');
const backToPlayer     = document.getElementById('backToPlayer');
const playlistViewName = document.getElementById('playlistViewName');
const playlistViewCount= document.getElementById('playlistViewCount');
const playlistViewCover= document.getElementById('playlistViewCover');
const playlistPlayAll  = document.getElementById('playlistPlayAll');
const playlistAddSongs = document.getElementById('playlistAddSongs');
const playlistDeleteBtn= document.getElementById('playlistDeleteBtn');
const playlistTracksEl = document.getElementById('playlistTracks');

const addSongsModal    = document.getElementById('addSongsModal');
const modalClose       = document.getElementById('modalClose');
const modalSearchInput = document.getElementById('modalSearchInput');
const modalTrackList   = document.getElementById('modalTrackList');
const modalConfirm     = document.getElementById('modalConfirm');


let library        = [];
let filteredLib    = [];
let currentIndex   = -1;
let isPlaying      = false;
let isShuffleOn    = false;
let isRepeatMode   = 0;
let sortMode       = 'recent';
let idCounter      = 0;
let playQueue      = [];
let folderHandle   = null;

let playlists      = [];
let playlistCounter= 0;
let activePlaylistId = null;
let modalSelected  = new Set();
let playContext    = 'library';

const audioCross      = new Audio();
audioCross.volume     = 0;
let crossFadeActive   = false;
let crossFadeInterval = null;

const audio = new Audio();
let userVolume        = parseFloat(localStorage.getItem('wave-volume') ?? '0.75');
audio.volume    = userVolume;
volumeBar.value = userVolume;
volPct.textContent = `${Math.round(userVolume * 100)}%`;
paintSlider(volumeBar, userVolume * 100);


const DB_NAME = 'wave-db', DB_VERSION = 1, STORE = 'handles';

function openDB() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, DB_VERSION);
    r.onupgradeneeded = e => {
      if (!e.target.result.objectStoreNames.contains(STORE))
        e.target.result.createObjectStore(STORE);
    };
    r.onsuccess = e => res(e.target.result);
    r.onerror   = e => rej(e.target.error);
  });
}
async function saveHandleToDB(h)  { const db = await openDB(); return new Promise((res,rej) => { const tx = db.transaction(STORE,'readwrite'); tx.objectStore(STORE).put(h,'folderHandle'); tx.oncomplete=res; tx.onerror=e=>rej(e.target.error); }); }
async function loadHandleFromDB() { const db = await openDB(); return new Promise((res,rej) => { const r = db.transaction(STORE,'readonly').objectStore(STORE).get('folderHandle'); r.onsuccess=e=>res(e.target.result||null); r.onerror=e=>rej(e.target.error); }); }
async function clearHandleFromDB(){ const db = await openDB(); return new Promise((res,rej) => { const tx = db.transaction(STORE,'readwrite'); tx.objectStore(STORE).delete('folderHandle'); tx.oncomplete=res; tx.onerror=e=>rej(e.target.error); }); }


const supportsFS = 'showDirectoryPicker' in window;

async function pickFolder() {
  if (!supportsFS) { alert('Usá Chrome o Edge para esta función.'); return; }
  try {
    const handle = await window.showDirectoryPicker({ mode: 'read' });
    folderHandle = handle;
    await saveHandleToDB(handle);
    library = []; idCounter = 0;
    await loadFilesFromFolder(handle);
  } catch(e) { if (e.name !== 'AbortError') console.warn(e); }
}

async function loadFilesFromFolder(handle) {
  const files = [];
  for await (const entry of handle.values()) {
    if (entry.kind !== 'file') continue;
    if (!/\.(mp3|flac|wav|ogg|m4a|aac)$/i.test(entry.name)) continue;
    try { files.push(await entry.getFile()); } catch {}
  }
  if (!files.length) { showToast('No se encontraron archivos de audio.'); return; }
  await importFiles(files);
  showToast(`${files.length} canciones cargadas.`);
}

async function tryRestoreFolder() {
  if (!supportsFS) return;
  try {
    const handle = await loadHandleFromDB();
    if (!handle) return;
    const perm = await handle.queryPermission({ mode: 'read' });
    if (perm === 'granted') {
      folderHandle = handle;
      library = []; idCounter = 0;
      await loadFilesFromFolder(handle);
    } else if (perm === 'prompt') {
      try {
        const requested = await handle.requestPermission({ mode: 'read' });
        if (requested === 'granted') {
          folderHandle = handle;
          library = []; idCounter = 0;
          await loadFilesFromFolder(handle);
        } else {
          showReconnectBanner(handle);
        }
      } catch {
        showReconnectBanner(handle);
      }
    }
  } catch(e) { console.warn(e); }
}

function showReconnectBanner(handle) {
  if (document.getElementById('reconnectBanner')) return;
  const b = document.createElement('div');
  b.id = 'reconnectBanner';
  b.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:12px;background:#1a1a1a;border:1px solid #444;border-radius:12px;padding:20px 24px;font-size:.82rem;color:#ccc;flex-shrink:0;text-align:center;margin-bottom:4px';
  b.innerHTML = `
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
    <div>
      <div style="color:#fff;font-weight:600;margin-bottom:4px">Biblioteca lista</div>
      <div style="color:#888;font-size:.75rem">El navegador necesita que confirmes el acceso a tu carpeta de música para reproducir.</div>
    </div>
    <button id="reconnectBtn" style="background:#fff;color:#111;border:none;font-family:inherit;font-size:.8rem;font-weight:600;padding:9px 24px;border-radius:40px;cursor:pointer;width:100%">
      Confirmar acceso a carpeta
    </button>
    <button id="dismissBanner" style="background:none;border:none;color:#444;font-family:inherit;font-size:.72rem;cursor:pointer;padding:0">Omitir por ahora</button>
  `;
  viewPlayer.prepend(b);
  document.getElementById('reconnectBtn').addEventListener('click', async () => {
    try {
      const perm = await handle.requestPermission({ mode: 'read' });
      if (perm === 'granted') {
        folderHandle = handle; b.remove();
        library = []; idCounter = 0;
        await loadFilesFromFolder(handle);
      } else {
        showToast('Permiso denegado. Elegí la carpeta manualmente.');
        b.remove();
      }
    } catch { b.remove(); }
  });
  document.getElementById('dismissBanner').addEventListener('click', () => b.remove());
}

folderBtn.addEventListener('click', pickFolder);


let audioCtx=null, analyser=null, sourceNode=null, dataArray=null, bufferLen=0;

function initAudioCtx() {
  if (audioCtx) return;
  audioCtx   = new (window.AudioContext || window.webkitAudioContext)();
  sourceNode = audioCtx.createMediaElementSource(audio);
  analyser   = audioCtx.createAnalyser();
  analyser.fftSize = 256; analyser.smoothingTimeConstant = 0.82;
  sourceNode.connect(analyser); analyser.connect(audioCtx.destination);
  bufferLen = analyser.frequencyBinCount; dataArray = new Uint8Array(bufferLen);
}


function resizeCanvas() {
  const dpr=window.devicePixelRatio||1, r=vizCanvas.parentElement.getBoundingClientRect();
  vizCanvas.width=r.width*dpr; vizCanvas.height=r.height*dpr;
  ctx2d.setTransform(dpr,0,0,dpr,0,0);
}
resizeCanvas(); window.addEventListener('resize', resizeCanvas);

function drawFrame() {
  requestAnimationFrame(drawFrame);
  const W=vizCanvas.width/(window.devicePixelRatio||1), H=vizCanvas.height/(window.devicePixelRatio||1);
  ctx2d.clearRect(0,0,W,H);
  if (!analyser||!isPlaying) { drawIdleBars(W,H); return; }
  analyser.getByteFrequencyData(dataArray);

  if (vizStyle === 'bars') {
    const gap=2, barW=(W-gap*(bufferLen-1))/bufferLen;
    for (let i=0;i<bufferLen;i++) {
      const val=dataArray[i]/255, barH=Math.max(2,val*(H-2));
      const x=i*(barW+gap), y=H-barH, br=Math.round(80+val*175), a=0.3+val*0.7;
      const g=ctx2d.createLinearGradient(x,y,x,y+barH);
      g.addColorStop(0,`rgba(${br},${br},${br},${a})`);
      g.addColorStop(1,`rgba(${br},${br},${br},${a*0.15})`);
      ctx2d.fillStyle=g; ctx2d.beginPath(); ctx2d.roundRect(x,y,barW,barH,[2,2,0,0]); ctx2d.fill();
      if (val>0.6) { ctx2d.shadowColor=`rgba(255,255,255,${val*0.35})`; ctx2d.shadowBlur=5; ctx2d.fillRect(x,y,barW,2); ctx2d.shadowBlur=0; }
    }
  } else if (vizStyle === 'mirror') {
    const gap=2, barW=(W-gap*(bufferLen-1))/bufferLen, mid=H/2;
    for (let i=0;i<bufferLen;i++) {
      const val=dataArray[i]/255, barH=Math.max(1,val*(mid-2));
      const x=i*(barW+gap), br=Math.round(80+val*175), a=0.3+val*0.7;
      const g=ctx2d.createLinearGradient(0,mid-barH,0,mid+barH);
      g.addColorStop(0,`rgba(${br},${br},${br},${a*0.1})`);
      g.addColorStop(0.5,`rgba(${br},${br},${br},${a})`);
      g.addColorStop(1,`rgba(${br},${br},${br},${a*0.1})`);
      ctx2d.fillStyle=g;
      ctx2d.beginPath(); ctx2d.roundRect(x,mid-barH,barW,barH*2,[1,1,1,1]); ctx2d.fill();
    }
  } else if (vizStyle === 'wave') {
    ctx2d.beginPath();
    const step = W / bufferLen;
    ctx2d.moveTo(0, H/2);
    for (let i=0;i<bufferLen;i++) {
      const val=(dataArray[i]/255)*2-1;
      const x=i*step, y=H/2+val*(H/2-4);
      if(i===0) ctx2d.moveTo(x,y); else ctx2d.lineTo(x,y);
    }
    ctx2d.strokeStyle='rgba(255,255,255,0.7)';
    ctx2d.lineWidth=1.5; ctx2d.lineJoin='round'; ctx2d.stroke();
    ctx2d.strokeStyle='rgba(255,255,255,0.12)';
    ctx2d.lineWidth=6; ctx2d.stroke();
  } else if (vizStyle === 'circle') {
    const cx=W/2, cy=H/2, r=Math.min(W,H)*0.28;
    const step=Math.PI*2/bufferLen;
    ctx2d.beginPath();
    for (let i=0;i<bufferLen;i++) {
      const val=dataArray[i]/255, len=val*r*0.8;
      const angle=i*step-Math.PI/2;
      const x1=cx+Math.cos(angle)*r, y1=cy+Math.sin(angle)*r;
      const x2=cx+Math.cos(angle)*(r+len), y2=cy+Math.sin(angle)*(r+len);
      ctx2d.moveTo(x1,y1); ctx2d.lineTo(x2,y2);
    }
    ctx2d.strokeStyle='rgba(255,255,255,0.65)'; ctx2d.lineWidth=1.5; ctx2d.stroke();
    ctx2d.beginPath(); ctx2d.arc(cx,cy,r,0,Math.PI*2);
    ctx2d.strokeStyle='rgba(255,255,255,0.08)'; ctx2d.lineWidth=1; ctx2d.stroke();
  }
}
function drawIdleBars(W,H) {
  const total=64,gap=2,barW=(W-gap*(total-1))/total;
  for(let i=0;i<total;i++){const t=i/total,h=2+Math.sin(t*Math.PI)*7+Math.sin(t*Math.PI*6)*2.5;ctx2d.fillStyle='rgba(255,255,255,0.07)';ctx2d.beginPath();ctx2d.roundRect(i*(barW+gap),H-h,barW,h,[1,1,0,0]);ctx2d.fill();}
}
drawFrame();


function cleanTitle(title) {
  if (!title) return title;
  return title
    .replace(/\[[A-Za-z0-9_\-]{6,}\]/g, '')
    .replace(/\[(Video Oficial|Official Video|Official Audio|Audio Oficial|Video Lyric|Lyric Video|Official Lyric|HQ|HD|4K|MV|Official MV|Visualizer|Live|Explicit|Clean)\]/gi, '')
    .replace(/\((Video Oficial|Official Video|Official Audio|Audio Oficial|Video Lyric|Lyric Video|Official Lyric|HQ|HD|4K|MV|Official MV|Visualizer|Explicit|Clean)\)/gi, '')
    .replace(/\s*[\(\[](ft\.|feat\.|featuring)[^\)\]]*[\)\]]/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
function formatTime(s) { if(isNaN(s)||s<0)return'0:00'; return`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`; }
function paintSlider(el,pct) { el.style.background=`linear-gradient(to right,rgba(255,255,255,.85) ${pct}%,rgba(255,255,255,.12) ${pct}%)`; }
function escapeHtml(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function uid() { return Date.now().toString(36)+Math.random().toString(36).slice(2); }

function showToast(msg) {
  let t=document.getElementById('wave-toast');
  if(!t){t=document.createElement('div');t.id='wave-toast';t.style.cssText='position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#222;color:#eee;font-size:.78rem;padding:8px 18px;border-radius:20px;border:1px solid #333;z-index:9999;opacity:0;transition:opacity .2s ease;pointer-events:none;font-family:"Inter Tight",sans-serif;white-space:nowrap';document.body.appendChild(t);}
  t.textContent=msg; t.style.opacity='1'; clearTimeout(t._t); t._t=setTimeout(()=>{t.style.opacity='0';},2500);
}

function readID3Tags(file) {
  return new Promise(resolve => {
    if (typeof jsmediatags==='undefined'){resolve({});return;}
    jsmediatags.read(file,{
      onSuccess(r){const t=r.tags;let cover=null;if(t.picture){const bin=t.picture.data.reduce((a,b)=>a+String.fromCharCode(b),'');cover=`data:${t.picture.format};base64,${btoa(bin)}`;}resolve({title:t.title||null,artist:t.artist||null,album:t.album||null,year:t.year||null,cover})},
      onError(){resolve({});}
    });
  });
}


async function importFiles(files) {
  const valid = Array.from(files).filter(f=>f.type.startsWith('audio/')||/\.(mp3|flac|wav|ogg|m4a|aac)$/i.test(f.name));
  if (!valid.length) return;
  for (const file of valid) {
    if (library.some(t=>t.name===file.name)) continue;
    const url = URL.createObjectURL(file);
    const dur = await new Promise(r=>{const a=new Audio();a.addEventListener('loadedmetadata',()=>r(a.duration));a.addEventListener('error',()=>r(0));a.src=url;});
    const tags = await readID3Tags(file);
    const raw=file.name.replace(/\.[^/.]+$/,''), parts=raw.split(' - ');
    library.push({
      id: idCounter++, name: file.name,
      title:  cleanTitle(tags.title  ||(parts.length>=2?parts.slice(1).join(' - ').trim():raw.trim())),
      artist: tags.artist ||(parts.length>=2?parts[0].trim():'Artista desconocido'),
      album:  tags.album  ||'', year: tags.year||'',
      cover:  tags.cover  ||null, duration: dur, url, addedAt: Date.now(), _file: file
    });
  }
  applyFilterAndSort(); updateTrackCount(); saveMetadata();
  if (currentIndex===-1&&filteredLib.length>0) loadTrack(0,false);
}

fileInput.addEventListener('change', e=>{importFiles(e.target.files);fileInput.value='';});


const META_KEY = 'wave-meta', PL_KEY = 'wave-playlists';

function saveMetadata() {
  try { localStorage.setItem(META_KEY, JSON.stringify(library.map(({_file,url,...r})=>r))); }
  catch { localStorage.setItem(META_KEY, JSON.stringify(library.map(({_file,url,cover,...r})=>({...r,cover:null})))); }
}

function loadMetadata() {
  const raw=localStorage.getItem(META_KEY);
  if (!raw) return false;
  try {
    const s=JSON.parse(raw);
    if (!Array.isArray(s)||!s.length) return false;
    library=s.map(t=>({...t,url:null,_file:null}));
    idCounter=Math.max(...library.map(t=>t.id))+1;
    applyFilterAndSort(); updateTrackCount(); return true;
  } catch { return false; }
}

function savePlaylists() { localStorage.setItem(PL_KEY, JSON.stringify(playlists)); }

function loadPlaylists() {
  const raw=localStorage.getItem(PL_KEY);
  if (!raw) return;
  try {
    const s=JSON.parse(raw);
    if (Array.isArray(s)) {
      playlists=s;
      playlistCounter=playlists.length ? Math.max(...playlists.map((_,i)=>i))+1 : 0;
    }
  } catch {}
}


tabLibrary.addEventListener('click', () => {
  tabLibrary.classList.add('active'); tabPlaylists.classList.remove('active');
  panelLibrary.classList.add('active'); panelPlaylists.classList.remove('active');
});

tabPlaylists.addEventListener('click', () => {
  tabPlaylists.classList.add('active'); tabLibrary.classList.remove('active');
  panelPlaylists.classList.add('active'); panelLibrary.classList.remove('active');
  renderPlaylistSidebar();
});

newPlaylistBtn.addEventListener('click', () => {
  const name = prompt('Nombre de la playlist:');
  if (!name || !name.trim()) return;
  const pl = { id: uid(), name: name.trim(), trackIds: [] };
  playlists.push(pl);
  savePlaylists();
  renderPlaylistSidebar();
  openPlaylistView(pl.id);
  tabPlaylists.click();
});

function renderPlaylistSidebar() {
  playlistList.innerHTML = '';
  if (!playlists.length) {
    playlistList.innerHTML = `<li class="track-list-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>Creá tu primera playlist con el botón +</li>`;
    return;
  }
  playlists.forEach(pl => {
    const tracks = pl.trackIds.map(id=>library.find(t=>t.id===id)).filter(Boolean);
    const coverSrc = tracks.find(t=>t.cover)?.cover;
    const li = document.createElement('li');
    li.className = 'playlist-item' + (pl.id===activePlaylistId?' is-active':'');
    li.innerHTML = `
      <div class="playlist-item-cover">
        ${coverSrc ? `<img src="${coverSrc}" />` : `<svg viewBox="0 0 36 36" fill="none"><rect width="36" height="36" fill="#1e1e1e"/><line x1="10" y1="13" x2="26" y2="13" stroke="#444" stroke-width="1.5" stroke-linecap="round"/><line x1="10" y1="18" x2="26" y2="18" stroke="#444" stroke-width="1.5" stroke-linecap="round"/><line x1="10" y1="23" x2="20" y2="23" stroke="#444" stroke-width="1.5" stroke-linecap="round"/></svg>`}
      </div>
      <div class="playlist-item-info">
        <div class="playlist-item-name">${escapeHtml(pl.name)}</div>
        <div class="playlist-item-count">${tracks.length} canción${tracks.length!==1?'es':''}</div>
      </div>`;
    li.addEventListener('click', () => openPlaylistView(pl.id));
    playlistList.appendChild(li);
  });
}

function openPlaylistView(plId) {
  activePlaylistId = plId;
  viewPlayer.style.display = 'none';
  viewPlaylist.style.display = 'flex';
  viewPlaylist.style.flexDirection = 'column';
  viewPlaylist.style.gap = '20px';
  renderPlaylistView();
  renderPlaylistSidebar();
}

backToPlayer.addEventListener('click', () => {
  activePlaylistId = null;
  viewPlaylist.style.display = 'none';
  viewPlayer.style.display = 'flex';
  renderPlaylistSidebar();
});

function renderPlaylistView() {
  const pl = playlists.find(p=>p.id===activePlaylistId);
  if (!pl) { backToPlayer.click(); return; }

  const tracks = pl.trackIds.map(id=>library.find(t=>t.id===id)).filter(Boolean);

  playlistViewName.textContent = pl.name;
  playlistViewName.contentEditable = 'true';
  playlistViewName.onblur = () => {
    const newName = playlistViewName.textContent.trim();
    if (newName) { pl.name = newName; savePlaylists(); renderPlaylistSidebar(); }
    else playlistViewName.textContent = pl.name;
  };
  playlistViewName.onkeydown = e => { if (e.key==='Enter'){e.preventDefault();playlistViewName.blur();} };

  playlistViewCount.textContent = `${tracks.length} canción${tracks.length!==1?'es':''}`;

  const covers = tracks.filter(t=>t.cover).slice(0,4);
  if (covers.length>=4) {
    playlistViewCover.className='playlist-view-cover has-grid';
    playlistViewCover.innerHTML=covers.map(t=>`<img src="${t.cover}" />`).join('');
  } else if (covers.length>0) {
    playlistViewCover.className='playlist-view-cover';
    playlistViewCover.innerHTML=`<img src="${covers[0].cover}" style="width:100%;height:100%;object-fit:cover"/>`;
  } else {
    playlistViewCover.className='playlist-view-cover';
    playlistViewCover.innerHTML=`<svg viewBox="0 0 60 60" fill="none"><rect width="60" height="60" rx="8" fill="#1e1e1e"/><line x1="15" y1="20" x2="45" y2="20" stroke="#444" stroke-width="2" stroke-linecap="round"/><line x1="15" y1="30" x2="45" y2="30" stroke="#444" stroke-width="2" stroke-linecap="round"/><line x1="15" y1="40" x2="35" y2="40" stroke="#444" stroke-width="2" stroke-linecap="round"/></svg>`;
  }

  playlistTracksEl.innerHTML='';
  if (!tracks.length) {
    playlistTracksEl.innerHTML=`<li class="track-list-empty" style="border-top:none;padding-top:0"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>Tocá "Agregar canciones" para llenar esta playlist</li>`;
    return;
  }

  tracks.forEach((track, idx) => {
    const isActive = track.id === library[currentIndex]?.id;
    const li = document.createElement('li');
    li.className = 'playlist-track-item' + (isActive?' is-active':'');
    li.innerHTML = `
      <div class="track-num">${idx+1}</div>
      <div class="track-info">
        <span class="track-name-item">${escapeHtml(track.title)}</span>
        <span class="track-artist-item">${escapeHtml(track.artist)}</span>
      </div>
      <span class="track-dur">${formatTime(track.duration)}</span>
      <button class="remove-from-pl-btn" title="Quitar de la playlist">✕</button>`;

    li.addEventListener('click', e => {
      if (e.target.classList.contains('remove-from-pl-btn')) return;
      if (!track.url) { showToast('Reconectá la carpeta para reproducir.'); return; }
      playContext = pl.id;
      const libIdx = filteredLib.findIndex(t=>t.id===track.id);
      if (libIdx>=0) loadTrack(libIdx,true);
    });

    li.querySelector('.remove-from-pl-btn').addEventListener('click', e => {
      e.stopPropagation();
      pl.trackIds = pl.trackIds.filter(id=>id!==track.id);
      savePlaylists(); renderPlaylistView(); renderPlaylistSidebar();
    });

    playlistTracksEl.appendChild(li);
  });
}

playlistPlayAll.addEventListener('click', () => {
  const pl = playlists.find(p=>p.id===activePlaylistId);
  if (!pl||!pl.trackIds.length) { showToast('La playlist está vacía.'); return; }
  const first = library.find(t=>t.id===pl.trackIds[0]);
  if (!first?.url) { showToast('Reconectá la carpeta primero.'); return; }
  playContext = pl.id;
  const idx = filteredLib.findIndex(t=>t.id===first.id);
  if (idx>=0) loadTrack(idx,true);
});

playlistDeleteBtn.addEventListener('click', () => {
  if (!confirm('¿Eliminar esta playlist?')) return;
  playlists = playlists.filter(p=>p.id!==activePlaylistId);
  savePlaylists();
  backToPlayer.click();
  renderPlaylistSidebar();
});


playlistAddSongs.addEventListener('click', () => {
  const pl = playlists.find(p=>p.id===activePlaylistId);
  if (!pl) return;
  modalSelected = new Set(pl.trackIds);
  modalSearchInput.value = '';
  renderModalList('');
  addSongsModal.style.display = 'flex';
  modalSearchInput.focus();
});

modalClose.addEventListener('click', () => { addSongsModal.style.display='none'; });
addSongsModal.addEventListener('click', e => { if(e.target===addSongsModal) addSongsModal.style.display='none'; });
modalSearchInput.addEventListener('input', () => renderModalList(modalSearchInput.value.toLowerCase().trim()));

function renderModalList(q) {
  modalTrackList.innerHTML='';
  const shown = library.filter(t =>
    !q || t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q)
  );
  if (!shown.length) {
    modalTrackList.innerHTML='<li style="padding:20px;text-align:center;color:#555;font-size:.78rem">Sin resultados</li>';
    return;
  }
  shown.forEach(track => {
    const sel = modalSelected.has(track.id);
    const li = document.createElement('li');
    li.className = 'modal-track-item' + (sel?' selected':'');
    li.innerHTML = `
      <div class="modal-check">${sel?'✓':''}</div>
      <div class="modal-track-info">
        <div class="modal-track-name">${escapeHtml(track.title)}</div>
        <div class="modal-track-artist">${escapeHtml(track.artist)}</div>
      </div>
      <span class="modal-track-dur">${formatTime(track.duration)}</span>`;
    li.addEventListener('click', () => {
      if (modalSelected.has(track.id)) { modalSelected.delete(track.id); li.classList.remove('selected'); li.querySelector('.modal-check').textContent=''; }
      else { modalSelected.add(track.id); li.classList.add('selected'); li.querySelector('.modal-check').textContent='✓'; }
    });
    modalTrackList.appendChild(li);
  });
}

modalConfirm.addEventListener('click', () => {
  const pl = playlists.find(p=>p.id===activePlaylistId);
  if (!pl) return;
  pl.trackIds = [...modalSelected];
  savePlaylists();
  addSongsModal.style.display='none';
  renderPlaylistView();
  renderPlaylistSidebar();
  showToast(`${pl.trackIds.length} canciones en la playlist.`);
});


sortNameBtn.addEventListener('click', ()=>{sortMode='name';    updateSortBtns();applyFilterAndSort();});
sortDurBtn .addEventListener('click', ()=>{sortMode='duration';updateSortBtns();applyFilterAndSort();});
sortRecBtn .addEventListener('click', ()=>{sortMode='recent';  updateSortBtns();applyFilterAndSort();});

function updateSortBtns() {
  sortNameBtn.classList.toggle('active',sortMode==='name');
  sortDurBtn .classList.toggle('active',sortMode==='duration');
  sortRecBtn .classList.toggle('active',sortMode==='recent');
}

function applyFilterAndSort() {
  const q=searchInput.value.toLowerCase().trim();
  filteredLib=library.filter(t=>t.title.toLowerCase().includes(q)||t.artist.toLowerCase().includes(q)||(t.album&&t.album.toLowerCase().includes(q)));
  filteredLib.sort((a,b)=>{if(sortMode==='name')return a.title.localeCompare(b.title);if(sortMode==='duration')return a.duration-b.duration;return b.addedAt-a.addedAt;});
  renderTrackList(); updateQueueInfoDisplay();
}


function renderTrackList() {
  trackList.innerHTML='';
  if (!filteredLib.length) {
    const li=document.createElement('li'); li.className='track-list-empty';
    li.innerHTML=!library.length
      ?`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>Elegí una carpeta de música`
      :`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>Sin resultados`;
    trackList.appendChild(li); return;
  }
  filteredLib.forEach((track,idx)=>{
    const isActive=idx===currentIndex, inQueue=playQueue.some(t=>t.id===track.id), noFile=!track.url;
    const li=document.createElement('li');
    li.className='track-item'+(isActive?' is-active':'')+(isActive&&!isPlaying?' is-paused':'');
    li.innerHTML=`
      <div class="track-num">${idx+1}</div>
      <div class="track-eq"><span></span><span></span><span></span></div>
      <div class="track-info">
        <span class="track-name-item">${escapeHtml(track.title)}${noFile?'<span style="color:#555" title="Sin archivo"> ·</span>':''}</span>
        <span class="track-artist-item">${escapeHtml(track.artist)}</span>
      </div>
      <span class="track-dur">${formatTime(track.duration)}</span>
      <button class="add-queue-btn ${inQueue?'in-queue':''}" title="${inQueue?'Quitar de la cola':'Agregar a la cola'}">${inQueue?'✓':'+'}</button>`;
    li.addEventListener('click',e=>{
      if(e.target.classList.contains('add-queue-btn'))return;
      if(noFile){showToast('Reconectá la carpeta para reproducir.');return;}
      if(idx===currentIndex){isPlaying?pauseAudio():playAudio();}else{playContext='library';loadTrack(idx,true);}
    });
    li.querySelector('.add-queue-btn').addEventListener('click',e=>{e.stopPropagation();if(noFile){showToast('Reconectá la carpeta primero.');return;}toggleQueue(track);});
    trackList.appendChild(li);
  });
}

function updateTrackCount(){const n=library.length;trackCount.textContent=`${n}`;}
function updateQueueInfoDisplay(){queueInfoEl.textContent=(currentIndex<0||!filteredLib.length)?'—':`${currentIndex+1} / ${filteredLib.length}`;}


function toggleQueue(track){
  const i=playQueue.findIndex(t=>t.id===track.id);
  if(i>=0)playQueue.splice(i,1);else playQueue.push(track);
  renderQueueList();renderTrackList();
}
function removeFromQueue(pos){playQueue.splice(pos,1);renderQueueList();renderTrackList();}
queueClearBtn.addEventListener('click',()=>{playQueue=[];renderQueueList();renderTrackList();});

function renderQueueList(){
  queueList.innerHTML='';
  queueCount.textContent=`${playQueue.length} canción${playQueue.length!==1?'es':''}`;
  if(!playQueue.length){
    queueList.innerHTML=`<li class="queue-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>Agregá canciones con el botón <strong>+</strong> en la biblioteca</li>`;
    return;
  }
  playQueue.forEach((track,pos)=>{
    const li=document.createElement('li');
    li.className='queue-card'+(pos===0?' is-now-playing':'');
    const cv=track.cover?`<img src="${track.cover}" alt="cover"/>`:`<svg viewBox="0 0 60 60" fill="none"><rect width="60" height="60" fill="#1a1a1a"/><rect x="16" y="22" width="4" height="16" rx="2" fill="#444"/><rect x="22" y="16" width="4" height="28" rx="2" fill="#555"/><rect x="28" y="19" width="4" height="22" rx="2" fill="#666"/><rect x="34" y="12" width="4" height="36" rx="2" fill="#777"/><rect x="40" y="19" width="4" height="22" rx="2" fill="#555"/></svg>`;
    li.innerHTML=`<span class="queue-pos">${pos+1}</span><div class="queue-card-cover">${cv}</div><div class="queue-card-info"><div class="queue-card-title">${escapeHtml(track.title)}</div><div class="queue-card-artist">${escapeHtml(track.artist)}</div></div><div class="queue-card-foot"><span class="queue-card-dur">${formatTime(track.duration)}</span><button class="queue-remove-btn" title="Quitar">✕</button></div>`;
    li.addEventListener('click',e=>{if(e.target.classList.contains('queue-remove-btn'))return;playQueue.splice(pos,1);renderQueueList();renderTrackList();const idx=filteredLib.findIndex(t=>t.id===track.id);if(idx>=0)loadTrack(idx,true);});
    li.querySelector('.queue-remove-btn').addEventListener('click',e=>{e.stopPropagation();removeFromQueue(pos);});
    queueList.appendChild(li);
  });
  queueList.scrollLeft=0;
}


function loadTrack(idx,autoPlay=true){
  if(idx<0||idx>=filteredLib.length)return;
  currentIndex=idx;
  const track=filteredLib[idx];
  audio.src=track.url; audio.load();
  trackTitle.textContent=track.title; trackArtist.textContent=track.artist; trackAlbum.textContent=track.album||'';
  if(track.year){badgeYear.textContent=track.year;badgeYear.style.display='inline-block';}else badgeYear.style.display='none';
  badgeDuration.textContent=formatTime(track.duration); badgeIdx.textContent=`${idx+1} / ${filteredLib.length}`;
  updateCoverArt(track.cover);
  progressBar.value=0; timeCurrent.textContent='0:00'; timeTotal.textContent=formatTime(track.duration); paintSlider(progressBar,0);
  renderTrackList(); renderQueueList();
  if(activePlaylistId) renderPlaylistView();
  scrollToActive(); updateQueueInfoDisplay();
  onTrackChangeLyrics(track);
  if(autoPlay)playAudio();
}

function updateCoverArt(cover){
  coverArt.style.opacity='0'; coverArt.style.transform='scale(0.96)';
  setTimeout(()=>{
    coverArt.innerHTML=cover?`<img src="${cover}" alt="Carátula"/>`:`<svg viewBox="0 0 100 100" fill="none"><rect width="100" height="100" fill="#181818"/><rect x="26" y="38" width="6" height="24" rx="3" fill="#333"/><rect x="36" y="28" width="6" height="44" rx="3" fill="#555"/><rect x="46" y="33" width="6" height="34" rx="3" fill="#777"/><rect x="56" y="22" width="6" height="56" rx="3" fill="#999"/><rect x="66" y="32" width="6" height="36" rx="3" fill="#666"/></svg>`;
    coverArt.style.opacity='1'; coverArt.style.transform='';
    updateAmbientColors(cover);
  },180);
}

function scrollToActive(){const a=trackList.querySelector('.track-item.is-active');if(a)a.scrollIntoView({block:'nearest',behavior:'smooth'});}
coverArt.style.transition='opacity .18s ease,transform .18s ease';


const ambientCanvas = document.getElementById('ambientBg');
const ambientCtx    = ambientCanvas.getContext('2d');
let   ambientColors = ['#1a1a2e', '#16213e', '#0f3460', '#111111'];
let   ambientAnim   = null;

const orbs = [
  { x: 0.2, y: 0.3, vx: 0.0003, vy: 0.0002, r: 0.65 },
  { x: 0.8, y: 0.2, vx: -0.0002, vy: 0.0003, r: 0.60 },
  { x: 0.5, y: 0.8, vx: 0.0001, vy: -0.0003, r: 0.55 },
  { x: 0.1, y: 0.7, vx: 0.0002, vy: 0.0001, r: 0.50 },
];

function resizeAmbient() {
  ambientCanvas.width  = window.innerWidth;
  ambientCanvas.height = window.innerHeight;
}
resizeAmbient();
window.addEventListener('resize', resizeAmbient);

function drawAmbient() {
  const w = ambientCanvas.width;
  const h = ambientCanvas.height;
  ambientCtx.clearRect(0, 0, w, h);

 
  ambientCtx.fillStyle = '#080808';
  ambientCtx.fillRect(0, 0, w, h);


  orbs.forEach(o => {
    o.x += o.vx; o.y += o.vy;
    if (o.x < 0 || o.x > 1) o.vx *= -1;
    if (o.y < 0 || o.y > 1) o.vy *= -1;
  });

 
  orbs.forEach((o, i) => {
    const color = ambientColors[i % ambientColors.length];
    const cx = o.x * w, cy = o.y * h;
    const radius = Math.max(w, h) * o.r;
    const grad = ambientCtx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    grad.addColorStop(0, hexToRgba(color, 0.9));
    grad.addColorStop(1, hexToRgba(color, 0));
    ambientCtx.fillStyle = grad;
    ambientCtx.fillRect(0, 0, w, h);
  });

  ambientAnim = requestAnimationFrame(drawAmbient);
}

function hexToRgba(hex, alpha) {
  hex = hex.replace('#','');
  if (hex.length === 3) hex = hex.split('').map(c=>c+c).join('');
  const r = parseInt(hex.slice(0,2),16);
  const g = parseInt(hex.slice(2,4),16);
  const b = parseInt(hex.slice(4,6),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function extractColors(imgEl) {
  const size = 80;
  const offscreen = document.createElement('canvas');
  offscreen.width = offscreen.height = size;
  const ctx = offscreen.getContext('2d');
  ctx.drawImage(imgEl, 0, 0, size, size);
  const data = ctx.getImageData(0, 0, size, size).data;

  const buckets = {};
  for (let i = 0; i < data.length; i += 12) {
    const r = Math.round(data[i]   / 24) * 24;
    const g = Math.round(data[i+1] / 24) * 24;
    const b = Math.round(data[i+2] / 24) * 24;
    const brightness = (r + g + b) / 3;
    if (brightness < 10 || brightness > 245) continue;
    const key = `${r},${g},${b}`;
    buckets[key] = (buckets[key] || 0) + 1;
  }

  const sorted = Object.entries(buckets)
    .sort((a,b) => b[1]-a[1])
    .map(([k]) => k.split(',').map(Number));

  if (!sorted.length) return ['#3a1a4e', '#1a3e6e', '#1a4a3a', '#2a1a1a'];

  const picked = [];
  for (const [r,g,b] of sorted) {
    const isDiff = picked.every(([pr,pg,pb]) =>
      Math.abs(r-pr)+Math.abs(g-pg)+Math.abs(b-pb) > 60
    );
    if (isDiff) picked.push([r,g,b]);
    if (picked.length >= 4) break;
  }

  while (picked.length < 4) {
    const [r,g,b] = picked[0];
    picked.push([Math.min(255,r+40), Math.min(255,g+20), Math.min(255,b+60)]);
  }

 
  return picked.map(([r,g,b]) => {

    const boost = (v) => {
  
      return Math.min(160, Math.max(v, 40));
    };
    const br = boost(r), bg2 = boost(g), bb = boost(b);

    const maxC = Math.max(br, bg2, bb);
    const scale = maxC > 0 ? Math.min(255 / maxC, 2.2) : 1;
    const fr = Math.min(255, Math.round(br * scale));
    const fg = Math.min(255, Math.round(bg2 * scale));
    const fb = Math.min(255, Math.round(bb * scale));
    return `#${fr.toString(16).padStart(2,'0')}${fg.toString(16).padStart(2,'0')}${fb.toString(16).padStart(2,'0')}`;
  });
}

function updateAmbientColors(cover) {
  if (!cover) {
    ambientColors = ['#1a1a2e', '#16213e', '#0f3460', '#111111'];
    ambientCanvas.classList.remove('active');
    return;
  }

  const img = new Image();
  if (cover.startsWith('http://') || cover.startsWith('https://')) {
    img.crossOrigin = 'anonymous';
  }

  img.onload = () => {
    try {
      const colors = extractColors(img);
      if (colors && colors.length >= 2) {
        ambientColors = colors;
        ambientCanvas.classList.add('active');
      }
    } catch (e) {
      ambientColors = ['#1a1a2e', '#16213e', '#0f3460', '#1a1a1a'];
      ambientCanvas.classList.add('active');
    }
  };

  img.onerror = () => {
    ambientColors = ['#1a1a1a', '#222222', '#1a1a1a', '#181818'];
  };

  img.src = cover;
}

drawAmbient();


let wasPlaying = false;
function playAudio(){
  if (rewindEnabled && wasPlaying && audio.currentTime > 5) {
    audio.currentTime = Math.max(0, audio.currentTime - 5);
  }
  wasPlaying = false;
  initAudioCtx();
  if(audioCtx.state==='suspended')audioCtx.resume();
  audio.play().then(()=>{isPlaying=true;updatePlayUI();}).catch(console.warn);
}
function pauseAudio(){audio.pause();isPlaying=false;updatePlayUI();}
function updatePlayUI(){
  iconPlay.style.display=isPlaying?'none':'block'; iconPause.style.display=isPlaying?'block':'none';
  coverArt.classList.toggle('is-playing',isPlaying);
  trackList.querySelectorAll('.track-item').forEach((item,idx)=>{item.classList.toggle('is-active',idx===currentIndex);item.classList.toggle('is-paused',idx===currentIndex&&!isPlaying);});
}
btnPlay.addEventListener('click',()=>{if(!filteredLib.length)return;if(currentIndex<0){loadTrack(0,true);return;}isPlaying?pauseAudio():playAudio();});


function playNext(){
  if(crossFadeActive)return;
  if(!filteredLib.length)return;
  if(isRepeatMode===2){audio.currentTime=0;playAudio();return;}
  if(playQueue.length>0){const next=playQueue.shift();renderQueueList();renderTrackList();const i=filteredLib.findIndex(t=>t.id===next.id);if(i>=0)loadTrack(i,true);return;}
  let nextIdx;
  if(isShuffleOn){do{nextIdx=Math.floor(Math.random()*filteredLib.length);}while(filteredLib.length>1&&nextIdx===currentIndex);}
  else{nextIdx=currentIndex+1;if(nextIdx>=filteredLib.length){if(isRepeatMode===1)nextIdx=0;else{pauseAudio();return;}}}
  loadTrack(nextIdx,true);
}
function playPrev(){if(!filteredLib.length)return;if(audio.currentTime>3){audio.currentTime=0;return;}const prev=isShuffleOn?Math.floor(Math.random()*filteredLib.length):Math.max(0,currentIndex-1);loadTrack(prev,true);}
btnNext.addEventListener('click',playNext);
btnPrev.addEventListener('click',playPrev);

btnShuffle.addEventListener('click',()=>{isShuffleOn=!isShuffleOn;btnShuffle.classList.toggle('is-on',isShuffleOn);});
btnRepeat .addEventListener('click',()=>{isRepeatMode=(isRepeatMode+1)%3;audio.loop=isRepeatMode===2;btnRepeat.classList.toggle('is-on',isRepeatMode>0);btnRepeat.title=['Repetir: off','Repetir: todo','Repetir: uno'][isRepeatMode];});

audio.addEventListener('timeupdate',()=>{if(!audio.duration)return;const pct=(audio.currentTime/audio.duration)*100;progressBar.value=pct;timeCurrent.textContent=formatTime(audio.currentTime);paintSlider(progressBar,pct);});
audio.addEventListener('loadedmetadata',()=>{timeTotal.textContent=formatTime(audio.duration);if(currentIndex>=0)badgeDuration.textContent=formatTime(audio.duration);});
audio.addEventListener('ended',playNext);
progressBar.addEventListener('input',()=>{if(!audio.duration)return;audio.currentTime=(progressBar.value/100)*audio.duration;paintSlider(progressBar,parseFloat(progressBar.value));});
volumeBar.addEventListener('input',()=>{const v=parseFloat(volumeBar.value);audio.volume=v;userVolume=v;volPct.textContent=`${Math.round(v*100)}%`;paintSlider(volumeBar,v*100);localStorage.setItem('wave-volume',v);});

clearLibBtn.addEventListener('click',async()=>{
  if(!confirm('¿Borrar toda la biblioteca?'))return;
  localStorage.removeItem(META_KEY); await clearHandleFromDB();
  library=[];filteredLib=[];currentIndex=-1;playQueue=[];folderHandle=null;
  audio.src='';isPlaying=false;updatePlayUI();
  trackTitle.textContent='Sin canción cargada';trackArtist.textContent='Elegí una carpeta de música';
  trackAlbum.textContent='';badgeIdx.textContent='—';badgeDuration.textContent='—:——';
  badgeYear.style.display='none';timeCurrent.textContent='0:00';timeTotal.textContent='0:00';
  progressBar.value=0;paintSlider(progressBar,0);
  applyFilterAndSort();updateTrackCount();renderQueueList();
});

document.addEventListener('keydown',e=>{
  if(document.activeElement===searchInput||document.activeElement===modalSearchInput||document.activeElement===playlistViewName)return;
  switch(e.code){
    case'Space':e.preventDefault();btnPlay.click();break;
    case'ArrowRight':e.preventDefault();playNext();break;
    case'ArrowLeft':e.preventDefault();playPrev();break;
    case'ArrowUp':e.preventDefault();volumeBar.value=Math.min(1,parseFloat(volumeBar.value)+.05);volumeBar.dispatchEvent(new Event('input'));break;
    case'ArrowDown':e.preventDefault();volumeBar.value=Math.max(0,parseFloat(volumeBar.value)-.05);volumeBar.dispatchEvent(new Event('input'));break;
  }
});


const settingsBtn       = document.getElementById('settingsBtn');
const settingsPanel     = document.getElementById('settingsPanel');
const settingsClose     = document.getElementById('settingsClose');
const crossfadeToggle   = document.getElementById('crossfadeToggle');
const crossfadeSubRow   = document.getElementById('crossfadeSubRow');
const crossfadeSlider   = document.getElementById('crossfadeSlider');
const crossfadeValLabel = document.getElementById('crossfadeValLabel');
const gaplessToggle     = document.getElementById('gaplessToggle');
const rewindToggle      = document.getElementById('rewindToggle');
const vizStyleOptions   = document.getElementById('vizStyleOptions');

const savedSettings = JSON.parse(localStorage.getItem('wave-settings') || '{}');
let crossfadeEnabled  = savedSettings.crossfadeEnabled  ?? false;
let crossfadeSecs     = savedSettings.crossfadeSecs     ?? 5;
let gaplessEnabled    = savedSettings.gaplessEnabled    ?? false;
let rewindEnabled     = savedSettings.rewindEnabled     ?? false;
let vizStyle          = savedSettings.vizStyle          ?? 'bars';

crossfadeToggle.checked  = crossfadeEnabled;
crossfadeSlider.value    = crossfadeSecs;
crossfadeValLabel.textContent = `${crossfadeSecs}s`;
gaplessToggle.checked    = gaplessEnabled;
rewindToggle.checked     = rewindEnabled;
crossfadeSubRow.style.display = crossfadeEnabled ? 'flex' : 'none';

vizStyleOptions.querySelectorAll('.viz-opt').forEach(btn => {
  btn.classList.toggle('is-active', btn.dataset.viz === vizStyle);
});

function paintSettingsRange(slider, val, min, max) {
  const pct = ((val - min) / (max - min)) * 100;
  slider.style.background = `linear-gradient(to right, rgba(255,255,255,.85) ${pct}%, rgba(255,255,255,.12) ${pct}%)`;
}
paintSettingsRange(crossfadeSlider, crossfadeSecs, 1, 12);

function saveSettings() {
  localStorage.setItem('wave-settings', JSON.stringify({ crossfadeEnabled, crossfadeSecs, gaplessEnabled, rewindEnabled, vizStyle }));
}

settingsBtn.addEventListener('click', () => {
  const open = settingsPanel.style.display === 'none' || settingsPanel.style.display === '';
  settingsPanel.style.display = open ? 'block' : 'none';
  settingsBtn.classList.toggle('is-open', open);
});
settingsClose.addEventListener('click', () => {
  settingsPanel.style.display = 'none';
  settingsBtn.classList.remove('is-open');
});

crossfadeToggle.addEventListener('change', () => {
  crossfadeEnabled = crossfadeToggle.checked;
  crossfadeSubRow.style.display = crossfadeEnabled ? 'flex' : 'none';
  saveSettings();
  if (crossfadeEnabled) showToast(`Crossfade activado: ${crossfadeSecs}s`);
  else showToast('Crossfade desactivado');
});

crossfadeSlider.addEventListener('input', () => {
  crossfadeSecs = parseInt(crossfadeSlider.value);
  crossfadeValLabel.textContent = `${crossfadeSecs}s`;
  paintSettingsRange(crossfadeSlider, crossfadeSecs, 1, 12);
  saveSettings();
});

gaplessToggle.addEventListener('change', () => {
  gaplessEnabled = gaplessToggle.checked;
  saveSettings();
  showToast(gaplessEnabled ? 'Reproducción sin pausa activada' : 'Reproducción sin pausa desactivada');
});

rewindToggle.addEventListener('change', () => {
  rewindEnabled = rewindToggle.checked;
  saveSettings();
  showToast(rewindEnabled ? 'Retroceder al reanudar activado' : 'Retroceder al reanudar desactivado');
});

vizStyleOptions.addEventListener('click', e => {
  const btn = e.target.closest('.viz-opt');
  if (!btn) return;
  vizStyle = btn.dataset.viz;
  vizStyleOptions.querySelectorAll('.viz-opt').forEach(b => b.classList.toggle('is-active', b.dataset.viz === vizStyle));
  saveSettings();
  showToast(`Visualizador: ${btn.textContent}`);
});


function peekNextIdx() {
  if (playQueue.length > 0) return filteredLib.findIndex(t => t.id === playQueue[0].id);
  if (isRepeatMode === 2) return currentIndex;
  let nextIdx;
  if (isShuffleOn) {
    do { nextIdx = Math.floor(Math.random() * filteredLib.length); }
    while (filteredLib.length > 1 && nextIdx === currentIndex);
  } else {
    nextIdx = currentIndex + 1;
    if (nextIdx >= filteredLib.length) {
      if (isRepeatMode === 1) nextIdx = 0;
      else return -1;
    }
  }
  return nextIdx;
}

function startCrossfade(nextIdx) {
  if (!filteredLib[nextIdx]) return;
  const nextTrack = filteredLib[nextIdx];
  if (!nextTrack.url) { loadTrack(nextIdx, true); return; }

  crossFadeActive = true;
  showCrossfadeBadge(crossfadeSecs);

  audioCross.src    = nextTrack.url;
  audioCross.volume = 0;
  audioCross.load();
  audioCross.play().catch(() => {});

  const steps     = 40;
  const tickMs    = (crossfadeSecs * 1000) / steps;
  const startVol  = userVolume;
  let   tick      = 0;

  clearInterval(crossFadeInterval);
  crossFadeInterval = setInterval(() => {
    tick++;
    const ratio = tick / steps;
    audio.volume      = Math.max(0, startVol * (1 - ratio));
    audioCross.volume = Math.min(startVol, startVol * ratio);

    if (tick >= steps) {
      clearInterval(crossFadeInterval);
      finishCrossfade(nextIdx, startVol);
    }
  }, tickMs);
}

function finishCrossfade(nextIdx, finalVol) {
  audio.volume = 0;
  audio.pause();

  const nextTrack    = filteredLib[nextIdx];
  const crossTime    = audioCross.currentTime;

  audioCross.pause();
  audioCross.src    = '';
  audioCross.volume = 0;

  crossFadeActive = false;

  currentIndex = nextIdx;
  audio.volume = finalVol;
  audio.src    = nextTrack.url;
  audio.load();
  audio.addEventListener('canplay', function onCanPlay() {
    audio.removeEventListener('canplay', onCanPlay);
    audio.currentTime = crossTime;
    audio.volume      = finalVol;
    audio.play().then(() => {
      isPlaying = true;
      updatePlayUI();
    }).catch(console.warn);
  }, { once: true });

  trackTitle.textContent  = nextTrack.title;
  trackArtist.textContent = nextTrack.artist;
  trackAlbum.textContent  = nextTrack.album || '';
  if (nextTrack.year) { badgeYear.textContent = nextTrack.year; badgeYear.style.display = 'inline-block'; }
  else badgeYear.style.display = 'none';
  badgeDuration.textContent = formatTime(nextTrack.duration);
  badgeIdx.textContent      = `${nextIdx + 1} / ${filteredLib.length}`;
  updateCoverArt(nextTrack.cover);
  progressBar.value = 0; timeCurrent.textContent = '0:00';
  timeTotal.textContent = formatTime(nextTrack.duration);
  paintSlider(progressBar, 0);
  renderTrackList(); renderQueueList();
  if (activePlaylistId) renderPlaylistView();
  scrollToActive(); updateQueueInfoDisplay();
  onTrackChangeLyrics(nextTrack);

  if (playQueue.length > 0 && playQueue[0].id === nextTrack.id) {
    playQueue.shift(); renderQueueList(); renderTrackList();
  }
}

function showCrossfadeBadge(secs) {
  let badge = document.getElementById('crossfadeBadge');
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'crossfadeBadge';
    badge.className = 'crossfade-badge';
    const vizWrap = document.querySelector('.viz-wrap');
    if (vizWrap) { vizWrap.style.position = 'relative'; vizWrap.appendChild(badge); }
    else document.querySelector('.progress-wrap').prepend(badge);
  }
  badge.textContent = `⇄ Crossfade ${secs}s`;
  clearTimeout(badge._t);
  badge._t = setTimeout(() => badge.remove(), (secs + 1) * 1000);
}

audio.addEventListener('timeupdate', () => {
  if (!crossfadeEnabled || crossFadeActive || !isPlaying) return;
  if (!audio.duration) return;
  if (audio.duration < crossfadeSecs * 2) return;
  const remaining = audio.duration - audio.currentTime;
  if (remaining > 0 && remaining <= crossfadeSecs) {
    const nextIdx = peekNextIdx();
    if (nextIdx >= 0 && filteredLib[nextIdx]?.url) {
      startCrossfade(nextIdx);
    }
  }
});

audio.addEventListener('pause', () => { if (!crossFadeActive) wasPlaying = true; });


const btnLyrics    = document.getElementById('btnLyrics');
const lyricsPanel  = document.getElementById('lyricsPanel');
const lyricsBody   = document.getElementById('lyricsBody');
const lyricsSource = document.getElementById('lyricsSource');
const lyricsCloseBtn = document.getElementById('lyricsCloseBtn');

let lyricsVisible  = false;
let lyricsLines    = [];
let lyricsSynced   = false;
let lyricsTrackId  = null;
let lyricActiveIdx = -1;

btnLyrics.addEventListener('click', () => {
  lyricsVisible = !lyricsVisible;
  lyricsPanel.style.display = lyricsVisible ? 'block' : 'none';
  btnLyrics.classList.toggle('is-on', lyricsVisible);

  if (lyricsVisible && currentIndex >= 0) {
    const track = filteredLib[currentIndex];
    if (track && lyricsTrackId !== track.id) {
      fetchLyrics(track.title, track.artist, track.id);
    }
  }
});

lyricsCloseBtn.addEventListener('click', () => {
  lyricsVisible = false;
  lyricsPanel.style.display = 'none';
  btnLyrics.classList.remove('is-on');
});

async function fetchLyrics(title, artist, trackId) {
  lyricsTrackId = trackId;
  lyricsLines   = [];
  lyricsSynced  = false;
  lyricActiveIdx = -1;
  showLyricsLoading();


  let cleanT = title.replace(/\[.*?\]/g,'').replace(/\(.*?\)/g,'').trim();
  let cleanA = artist.replace(/\[.*?\]/g,'').replace(/\(.*?\)/g,'').trim();

  if (cleanT.includes(' - ')) {
    const parts = cleanT.split(' - ');
    cleanT = parts.slice(1).join(' - ').trim();
    if (!cleanA || cleanA === 'Artista desconocido') cleanA = parts[0].trim();
  }


  const mainArtist = cleanA.split(',')[0].split('&')[0].trim();

  const data = await tryFetchLyrics(cleanT, mainArtist)
            || await tryFetchLyrics(cleanT, cleanA)
            || await trySearchLyrics(cleanT, mainArtist)
            || await trySearchLyrics(title.replace(/\[.*?\]/g,'').replace(/\(.*?\)/g,'').trim(), mainArtist);

  if (!data) { showLyricsNotFound(cleanT, cleanA); updateShareBtnVisibility(); return; }

  if (data.syncedLyrics) {
    lyricsLines  = parseLRC(data.syncedLyrics);
    lyricsSynced = true;
    lyricsSource.textContent = 'LRCLIB · sincronizado';
    renderSyncedLyricsWithSelection();
    updateShareBtnVisibility();
  } else if (data.plainLyrics) {
    lyricsSynced = false;
    lyricsSource.textContent = 'LRCLIB · sin sincronizar';
    renderPlainLyrics(data.plainLyrics);
    updateShareBtnVisibility();
  } else {
    showLyricsNotFound(cleanT, cleanA);
    updateShareBtnVisibility();
  }
}

async function tryFetchLyrics(title, artist) {
  try {
    const url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(title)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.syncedLyrics || data.plainLyrics) return data;
    return null;
  } catch { return null; }
}

async function trySearchLyrics(query, artist) {
  try {
    const q = artist ? `${artist} ${query}` : query;
    const url = `https://lrclib.net/api/search?q=${encodeURIComponent(q)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const results = await res.json();
    if (!results || !results.length) return null;
    const synced = results.find(r => r.syncedLyrics);
    const plain  = results.find(r => r.plainLyrics);
    return synced || plain || null;
  } catch { return null; }
}

function parseLRC(lrc) {
  const lines = [];
  const regex = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/g;
  let match;
  while ((match = regex.exec(lrc)) !== null) {
    const min  = parseInt(match[1]);
    const sec  = parseInt(match[2]);
    const ms   = parseInt(match[3].padEnd(3, '0'));
    const time = min * 60 + sec + ms / 1000;
    const text = match[4].trim();
    if (text) lines.push({ time, text });
  }
  return lines.sort((a, b) => a.time - b.time);
}

function renderSyncedLyrics() {
  lyricsBody.innerHTML = '';
  const ul = document.createElement('ul');
  ul.className = 'lyrics-lines';
  ul.id = 'lyricsList';
  lyricsLines.forEach((line, i) => {
    const li = document.createElement('li');
    li.className = 'lyric-line';
    li.dataset.idx = i;
    li.textContent = line.text;
    li.addEventListener('click', () => {
      if (audio.duration) { audio.currentTime = line.time; if (!isPlaying) playAudio(); }
    });
    ul.appendChild(li);
  });
  lyricsBody.appendChild(ul);
  lyricActiveIdx = -1;
}

function renderPlainLyrics(text) {
  lyricsBody.innerHTML = `<div class="lyrics-plain">${escapeHtml(text)}</div>`;
}

function showLyricsLoading() {
  lyricsBody.innerHTML = `<div class="lyrics-loading"><div class="lyrics-spinner"></div><span>Buscando letra…</span></div>`;
}

function showLyricsNotFound(title, artist) {
  lyricsBody.innerHTML = `<div class="lyrics-not-found"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="28" height="28"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><strong>Letra no encontrada</strong><span>${escapeHtml(title)} · ${escapeHtml(artist)}</span></div>`;
  lyricsSource.textContent = '';
}

function showLyricsError() {
  lyricsBody.innerHTML = `<div class="lyrics-not-found"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="28" height="28"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><strong>Sin conexión</strong><span>No se pudo consultar la API de letras</span></div>`;
  lyricsSource.textContent = '';
}

function syncLyricsToTime(currentTime) {
  if (!lyricsSynced || !lyricsLines.length) return;

  if (currentTime < lyricsLines[0].time) {
    if (lyricActiveIdx !== -1) {
      lyricActiveIdx = -1;
      const ul = document.getElementById('lyricsList');
      if (ul) ul.querySelectorAll('.lyric-line').forEach(el => {
        el.classList.remove('is-active', 'is-past');
      });
    }
    return;
  }

  let newIdx = -1;
  for (let i = 0; i < lyricsLines.length; i++) {
    if (lyricsLines[i].time <= currentTime) newIdx = i;
    else break;
  }

  if (newIdx === lyricActiveIdx) return;
  lyricActiveIdx = newIdx;

  const ul = document.getElementById('lyricsList');
  if (!ul) return;

  const items = ul.querySelectorAll('.lyric-line');
  items.forEach((el, i) => {
    el.classList.toggle('is-active', i === newIdx);
    el.classList.toggle('is-past',   i < newIdx);
  });

  if (newIdx >= 0) {
    const activeLi = items[newIdx];
    if (activeLi) {
      const bodyRect = lyricsBody.getBoundingClientRect();
      const liRect   = activeLi.getBoundingClientRect();
      const offset   = liRect.top - bodyRect.top - lyricsBody.clientHeight / 2 + liRect.height / 2;
      lyricsBody.scrollBy({ top: offset, behavior: 'smooth' });
    }
  }
}

audio.addEventListener('timeupdate', () => {
  if (lyricsVisible && lyricsSynced) syncLyricsToTime(audio.currentTime);
});

function onTrackChangeLyrics(track) {
  if (!track) return;
  lyricsLines    = [];
  lyricsSynced   = false;
  lyricActiveIdx = -1;
  selectedLyricLines = new Set();
  lyricsSource.textContent = '';
  updateShareBtnVisibility();

  if (lyricsVisible) {
    fetchLyrics(track.title, track.artist, track.id);
  } else {
    lyricsTrackId = null;
  }
}


const searchDropdown  = document.getElementById('searchDropdown');
const localSection    = document.getElementById('localSection');
const localResults    = document.getElementById('localResults');
const itunesSection   = document.getElementById('itunesSection');
const itunesResults   = document.getElementById('itunesResults');
const searchDivider   = document.getElementById('searchDivider');
const searchEmpty     = document.getElementById('searchEmpty');
const searchSpinner   = document.getElementById('searchSpinner');

const audioPreview    = new Audio();
let   previewBar      = null;
let   previewTrack    = null;
let   iTunesDebounce  = null;
let   lastQuery       = '';

function showDropdown() {
  const rect = searchInput.getBoundingClientRect();
  searchDropdown.style.display = 'block';
  searchDropdown.style.left    = rect.left + 'px';
  searchDropdown.style.top     = (rect.bottom + 6) + 'px';
  searchDropdown.style.width   = rect.width + 'px';
}
function hideDropdown() { searchDropdown.style.display = 'none'; }

searchInput.addEventListener('focus', () => {
  if (searchInput.value.trim()) showDropdown();
});
window.addEventListener('resize', () => {
  if (searchDropdown.style.display !== 'none') showDropdown();
});
document.addEventListener('click', e => {
  if (!e.target.closest('#searchBox') && !e.target.closest('#searchDropdown')) {
    hideDropdown();
  }
});

searchInput.addEventListener('input', () => {
  const q = searchInput.value.trim();
  applyFilterAndSort();
  if (!q) { hideDropdown(); return; }
  showDropdown();
  renderLocalResults(q);
  clearTimeout(iTunesDebounce);
  itunesSection.style.display = 'none';
  itunesResults.innerHTML = '';
  searchDivider.style.display = 'none';
  lastQuery = q;
  if (q.length >= 2) {
    searchSpinner.style.display = 'block';
    iTunesDebounce = setTimeout(() => fetchITunes(q), 500);
  } else {
    searchSpinner.style.display = 'none';
  }
});

function renderLocalResults(q) {
  localResults.innerHTML = '';
  const ql = q.toLowerCase();
  const matches = library.filter(t =>
    t.title.toLowerCase().includes(ql) ||
    t.artist.toLowerCase().includes(ql) ||
    (t.album && t.album.toLowerCase().includes(ql))
  ).slice(0, 5);

  if (matches.length) {
    localSection.style.display = 'flex';
    matches.forEach(track => {
      const li = buildLocalResultItem(track);
      localResults.appendChild(li);
    });
  } else {
    localSection.style.display = 'none';
  }
  checkEmpty();
}

function buildLocalResultItem(track) {
  const li = document.createElement('li');
  li.className = 'search-result-item';
  const coverHtml = track.cover
    ? `<img src="${track.cover}" alt="cover" />`
    : `<svg viewBox="0 0 38 38" fill="none"><rect width="38" height="38" fill="#222"/><rect x="10" y="14" width="3" height="10" rx="1.5" fill="#444"/><rect x="15" y="10" width="3" height="18" rx="1.5" fill="#555"/><rect x="20" y="12" width="3" height="14" rx="1.5" fill="#666"/><rect x="25" y="8" width="3" height="22" rx="1.5" fill="#777"/></svg>`;
  li.innerHTML = `
    <div class="search-result-cover">
      ${coverHtml}
      <div class="badge-downloaded" title="Descargada"><svg viewBox="0 0 8 8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1.5,4 3.5,6 6.5,2"/></svg></div>
    </div>
    <div class="search-result-info">
      <div class="search-result-title">${escapeHtml(track.title)}</div>
      <div class="search-result-artist">${escapeHtml(track.artist)}</div>
    </div>
    <div class="search-result-tags"><span class="tag-local">LOCAL</span></div>`;
  li.addEventListener('click', () => {
    stopPreview();
    hideDropdown();
    searchInput.value = '';
    applyFilterAndSort();
    const idx = filteredLib.findIndex(t => t.id === track.id);
    if (idx >= 0) { playContext = 'library'; loadTrack(idx, true); }
  });
  return li;
}

function fetchITunesJSONP(url) {
  return new Promise((resolve, reject) => {
    const callbackName = 'itunes_cb_' + Date.now() + '_' + Math.floor(Math.random() * 100000);
    const script = document.createElement('script');
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('JSONP timeout'));
    }, 5000);
    function cleanup() {
      clearTimeout(timer);
      if (script.parentNode) script.parentNode.removeChild(script);
      delete window[callbackName];
    }
    window[callbackName] = (data) => {
      cleanup();
      resolve(data);
    };
    script.src = `${url}&callback=${callbackName}`;
    script.onerror = () => {
      cleanup();
      reject(new Error('JSONP error'));
    };
    document.body.appendChild(script);
  });
}

async function fetchITunes(q) {
  try {
    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=music&limit=12&country=AR`;
    let data = null;

    // 1. Intento directo con CORS (iTunes soporta Access-Control-Allow-Origin: *)
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(itunesUrl, { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        data = await res.json();
      }
    } catch (e) {
      // Si falla fetch directo (bloqueador, etc.), probamos alternativas
    }

    // 2. Si no respondió, intento con JSONP (nunca falla por CORS)
    if (!data || !data.results) {
      try {
        data = await fetchITunesJSONP(itunesUrl);
      } catch (e) {}
    }

    // 3. Si sigue sin responder y estamos en entorno local, probar proxy local
    if ((!data || !data.results) && (location.protocol === 'http:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
      try {
        const localRes = await fetch(`http://localhost:3001/itunes?q=${encodeURIComponent(q)}`);
        if (localRes.ok) {
          data = await localRes.json();
        }
      } catch (e) {}
    }

    if (q !== lastQuery) return;
    if (data && Array.isArray(data.results)) {
      renderITunesResults(data.results);
    } else {
      renderITunesResults([]);
    }
  } catch (err) {
    if (q === lastQuery) {
      itunesSection.style.display = 'flex';
      searchDivider.style.display = 'block';
      itunesResults.innerHTML = `<li style="padding:12px 14px;font-size:.75rem;color:var(--text-dim)">No se encontraron resultados en iTunes.</li>`;
      checkEmpty();
    }
  } finally {
    searchSpinner.style.display = 'none';
  }
}

function renderITunesResults(results) {
  itunesResults.innerHTML = '';
  if (!results.length) { checkEmpty(); return; }
  const visible = results.filter(r => r.previewUrl);
  if (!visible.length) { checkEmpty(); return; }

  itunesSection.style.display = 'flex';
  searchDivider.style.display = 'block';

  visible.forEach(r => {
    const alreadyOwned = library.some(t =>
      t.title.toLowerCase().trim() === r.trackName.toLowerCase().trim() &&
      t.artist.toLowerCase().trim() === r.artistName.toLowerCase().trim()
    );
    const li = document.createElement('li');
    li.className = 'search-result-item';
    const cover = r.artworkUrl60 || r.artworkUrl30 || '';
  
const coverHtml = cover ? `<img src="${cover.replace('60x60', '80x80')}" alt="cover" loading="lazy" />` : `<svg viewBox="0 0 38 38" fill="none"><rect width="38" height="38" fill="#222"/></svg>`;
    const tagHtml = alreadyOwned ? `<span class="tag-local" title="Ya la tenés descargada">✓ LOCAL</span>` : `<span class="tag-preview">▶ 30s</span>`;
    li.innerHTML = `
      <div class="search-result-cover">${coverHtml}</div>
      <div class="search-result-info">
        <div class="search-result-title">${escapeHtml(r.trackName)}</div>
        <div class="search-result-artist">${escapeHtml(r.artistName)} · ${escapeHtml(r.collectionName || '')}</div>
      </div>
      <div class="search-result-tags">
        ${tagHtml}
        ${!alreadyOwned ? `<button class="search-download-btn" title="Descargar MP3"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button>` : ''}
      </div>`;
    li.addEventListener('click', e => {
      if (e.target.closest('.search-download-btn')) return;
      if (alreadyOwned) {
        const track = library.find(t => t.title.toLowerCase().trim() === r.trackName.toLowerCase().trim() && t.artist.toLowerCase().trim() === r.artistName.toLowerCase().trim());
        if (track) { stopPreview(); hideDropdown(); searchInput.value = ''; applyFilterAndSort(); const idx = filteredLib.findIndex(t => t.id === track.id); if (idx >= 0) { playContext = 'library'; loadTrack(idx, true); } }
        return;
      }
      playITunesPreview({ title: r.trackName, artist: r.artistName, cover: cover.replace('60x60','80x80'), previewUrl: r.previewUrl, trackUrl: r.trackViewUrl });
      hideDropdown();
    });
    if (!alreadyOwned) {
      li.querySelector('.search-download-btn')?.addEventListener('click', e => { e.stopPropagation(); startDownload(`${r.artistName} - ${r.trackName}`, li); });
    }
    itunesResults.appendChild(li);
  });
  checkEmpty();
}

function startDownload(query, resultItem) {
  async function refreshLibrarySilently(handle) {
  const files = [];
  for await (const entry of handle.values()) {
    if (entry.kind !== 'file') continue;
    if (!/\.(mp3|flac|wav|ogg|m4a|aac)$/i.test(entry.name)) continue;
    try { files.push(await entry.getFile()); } catch {}
  }
  if (!files.length) return;
  const existingNames = new Set(library.map(t => t.name));
  const newFiles = files.filter(f => !existingNames.has(f.name));
  if (!newFiles.length) return;
  for (const file of newFiles) {
    const url = URL.createObjectURL(file);
    const dur = await new Promise(r=>{const a=new Audio();a.addEventListener('loadedmetadata',()=>r(a.duration));a.addEventListener('error',()=>r(0));a.src=url;});
    const tags = await readID3Tags(file);
    const raw=file.name.replace(/\.[^/.]+$/,''), parts=raw.split(' - ');
    library.push({
      id: idCounter++, name: file.name,
      title:  cleanTitle(tags.title||(parts.length>=2?parts.slice(1).join(' - ').trim():raw.trim())),
      artist: tags.artist||(parts.length>=2?parts[0].trim():'Artista desconocido'),
      album:  tags.album||'', year: tags.year||'',
      cover:  tags.cover||null, duration: dur, url, addedAt: Date.now(), _file: file
    });
  }
 
  const q = searchInput.value.toLowerCase().trim();
  filteredLib = library.filter(t=>t.title.toLowerCase().includes(q)||t.artist.toLowerCase().includes(q)||t.name.toLowerCase().includes(q));
  updateTrackCount();
  saveMetadata();
}
  if (resultItem.dataset.downloading === '1') return;
  resultItem.dataset.downloading = '1';
  const btn = resultItem.querySelector('.search-download-btn');
  if (btn) btn.style.display = 'none';
  const progWrap = document.createElement('div');
  progWrap.className = 'dl-progress-wrap';
  progWrap.innerHTML = `<div class="dl-progress-label">Buscando...</div><div class="dl-progress-bar-bg"><div class="dl-progress-bar-fill" style="width:0%"></div></div>`;
  resultItem.querySelector('.search-result-tags').appendChild(progWrap);
  const label = progWrap.querySelector('.dl-progress-label');
  const fill  = progWrap.querySelector('.dl-progress-bar-fill');
  const url = `http://localhost:3001/download?q=${encodeURIComponent(query)}`;
  const es  = new EventSource(url);
  es.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    switch (msg.type) {
      case 'start': label.textContent = 'Conectando...'; break;
      case 'progress': fill.style.width = msg.pct + '%'; label.textContent = `${Math.round(msg.pct)}%`; break;
      case 'converting': fill.style.width = '100%'; label.textContent = 'Convirtiendo...'; break;
      case 'done':
        fill.style.width = '100%'; fill.style.background = '#1db954'; label.textContent = '✓ Descargado'; es.close();
        setTimeout(async () => {
          progWrap.remove(); if (btn) btn.style.display = ''; resultItem.dataset.downloading = '';
          const tagPreview = resultItem.querySelector('.tag-preview');
          if (tagPreview) { tagPreview.className = 'tag-local'; tagPreview.textContent = '✓ LOCAL'; }
          if (folderHandle) {
            try {
              
              const fileName = msg.file || null;
              let newFile = null;

              
              const allEntries = [];
              for await (const entry of folderHandle.values()) {
                if (entry.kind !== 'file') continue;
                if (!/\.(mp3|flac|wav|ogg|m4a|aac)$/i.test(entry.name)) continue;
                if (library.some(t => t.name === entry.name)) continue; // ya está en biblioteca
                allEntries.push(entry);
              }

              if (fileName) {
               
                newFile = allEntries.find(e => e.name === fileName) || null;
              }

              
              if (!newFile && allEntries.length > 0) {
                const withDates = await Promise.all(allEntries.map(async e => {
                  try { const f = await e.getFile(); return { entry: e, lastModified: f.lastModified }; }
                  catch { return null; }
                }));
                const valid = withDates.filter(Boolean);
                if (valid.length) {
                  valid.sort((a, b) => b.lastModified - a.lastModified);
                  newFile = valid[0].entry;
                }
              }

              let added = false;
              if (newFile) {
                const file = await newFile.getFile();
                const url = URL.createObjectURL(file);
                const dur = await new Promise(r => { const a = new Audio(); a.addEventListener('loadedmetadata', () => r(a.duration)); a.addEventListener('error', () => r(0)); a.src = url; });
                const tags = await readID3Tags(file);
                const raw = file.name.replace(/\.[^/.]+$/, ''), parts = raw.split(' - ');
                library.push({
                  id: idCounter++, name: file.name,
                  title: cleanTitle(tags.title || (parts.length >= 2 ? parts.slice(1).join(' - ').trim() : raw.trim())),
                  artist: tags.artist || (parts.length >= 2 ? parts[0].trim() : 'Artista desconocido'),
                  album: tags.album || '', year: tags.year || '',
                  cover: tags.cover || null, duration: dur, url, addedAt: Date.now(), _file: file
                });
                added = true;
              }

              if (added) {
                updateTrackCount(); saveMetadata();
                
                const currentTrackId = currentIndex >= 0 && filteredLib[currentIndex]
                  ? filteredLib[currentIndex].id : null;
                
                const sq = searchInput.value.toLowerCase().trim();
                filteredLib = library.filter(t =>
                  t.title.toLowerCase().includes(sq) ||
                  t.artist.toLowerCase().includes(sq) ||
                  (t.album && t.album.toLowerCase().includes(sq))
                );
                filteredLib.sort((a,b) => {
                  if(sortMode==='name') return a.title.localeCompare(b.title);
                  if(sortMode==='duration') return a.duration-b.duration;
                  return b.addedAt-a.addedAt;
                });
                
                if (currentTrackId !== null) {
                  const restoredIdx = filteredLib.findIndex(t => t.id === currentTrackId);
                  if (restoredIdx >= 0) currentIndex = restoredIdx;
                }
               const wasOpen = searchDropdown.style.display !== 'none';
const savedSearch = searchInput.value;
renderTrackList();
if (wasOpen) {
  searchDropdown.style.display = 'block';
  searchInput.value = savedSearch;
}
showToast(`✓ Descargado · agregado a la biblioteca`);
              } else {
                showToast(`✓ Descargado`);
              }
            } catch(e) { console.warn(e); showToast(`✓ ${msg.file || query} descargado`); }
          }
          else { showToast(`✓ ${msg.file || query} descargado`); }
        }, 1800);
        break;
      case 'error': fill.style.background = '#e53935'; label.textContent = '✗ Error'; es.close(); setTimeout(() => { progWrap.remove(); if (btn) btn.style.display = ''; resultItem.dataset.downloading = ''; }, 2500); showToast(`Error: ${msg.msg}`); break;
      case 'info': label.textContent = msg.line; break;
    }
  };
  es.onerror = () => { label.textContent = '✗ Sin conexión'; fill.style.background = '#e53935'; es.close(); setTimeout(() => { progWrap.remove(); if (btn) btn.style.display = ''; resultItem.dataset.downloading = ''; }, 2500); showToast('No se pudo conectar al proxy.'); };
}

function checkEmpty() {
  const hasLocal  = localResults.children.length > 0;
  const hasItunes = itunesResults.children.length > 0;
  searchEmpty.style.display = (!hasLocal && !hasItunes) ? 'flex' : 'none';
}

function playITunesPreview(track) {
  stopPreview();
  previewTrack = track;
  const wasMainPlaying = isPlaying;
  if (isPlaying) pauseAudio();
  audioPreview.src = track.previewUrl;
  audioPreview.volume = userVolume;
  audioPreview.play().catch(() => {});
  previewBar = document.createElement('div');
  previewBar.id = 'previewBar';
  previewBar.className = 'preview-bar';
  previewBar.innerHTML = `
    <div class="preview-bar-inner">
      <div class="preview-bar-cover">${track.cover ? `<img src="${track.cover}" />` : ''}</div>
      <div class="preview-bar-info">
        <div class="preview-bar-title">${escapeHtml(track.title)}</div>
        <div class="preview-bar-artist">${escapeHtml(track.artist)} · <span style="color:#fc3c44;font-size:.6rem;font-weight:700">PREVIEW 30s</span></div>
      </div>
      <span class="preview-bar-time" id="previewTime">0:30</span>
      <button class="preview-bar-dl" id="previewDl" title="Descargar MP3" style="width:26px;height:26px;border-radius:50%;background:none;border:1px solid var(--border-light);color:var(--text-dim);cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:color var(--t),border-color var(--t)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button>
      <button class="preview-bar-stop" id="previewStop" title="Detener">■</button>
    </div>
    <div class="preview-progress"><div class="preview-progress-fill" id="previewFill" style="width:0%"></div></div>`;
  const controlsWrap = document.querySelector('.controls-wrap');
  controlsWrap.parentNode.insertBefore(previewBar, controlsWrap);
  document.getElementById('previewStop').addEventListener('click', () => { stopPreview(); if (wasMainPlaying) playAudio(); });

  // Botón descargar desde la preview bar
  document.getElementById('previewDl').addEventListener('click', () => {
    const dlBtn = document.getElementById('previewDl');
    if (dlBtn) dlBtn.disabled = true;
    // Crear un item temporal para reutilizar startDownload
    const tempItem = document.createElement('li');
    tempItem.className = 'search-result-item';
    tempItem.innerHTML = `<div class="search-result-tags"><button class="search-download-btn" style="display:none"></button></div>`;
    // Mostrar toast de inicio y arrancar descarga
    showToast(`⬇ Descargando "${track.title}"…`);
    startDownload(`${track.artist} - ${track.title}`, tempItem);
    // Monitorear cuando termine para actualizar la preview bar
    const checkDone = setInterval(() => {
      const label = tempItem.querySelector('.dl-progress-label');
      if (!label) { clearInterval(checkDone); return; }
      const text = label.textContent;
      if (text.includes('✓')) {
        clearInterval(checkDone);
        const dlBtnNow = document.getElementById('previewDl');
        if (dlBtnNow) {
          dlBtnNow.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="#1db954" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><polyline points="20 6 9 17 4 12"/></svg>`;
          dlBtnNow.style.borderColor = '#1db954';
          dlBtnNow.title = 'Descargado';
        }
      } else if (text.includes('✗') || text.includes('Error')) {
        clearInterval(checkDone);
        const dlBtnNow = document.getElementById('previewDl');
        if (dlBtnNow) { dlBtnNow.disabled = false; }
      }
    }, 500);
  });

  audioPreview.addEventListener('timeupdate', updatePreviewBar);
  audioPreview.addEventListener('ended', () => { stopPreview(); if (wasMainPlaying) playAudio(); });
}

function updatePreviewBar() {
  const fill = document.getElementById('previewFill');
  const time = document.getElementById('previewTime');
  if (!fill || !time) return;
  const pct = (audioPreview.currentTime / 30) * 100;
  const rem = Math.max(0, 30 - Math.floor(audioPreview.currentTime));
  fill.style.width = `${Math.min(pct, 100)}%`;
  time.textContent = `0:${String(rem).padStart(2,'0')}`;
}

function stopPreview() {
  audioPreview.pause();
  audioPreview.src = '';
  audioPreview.removeEventListener('timeupdate', updatePreviewBar);
  previewTrack = null;
  const bar = document.getElementById('previewBar');
  if (bar) bar.remove();
  previewBar = null;
}

audio.addEventListener('play', () => { if (previewBar) stopPreview(); });


const lyricsShareBtn = document.getElementById('lyricsShareBtn');
let selectedLyricLines = new Set();

function renderSyncedLyricsWithSelection() {
  lyricsBody.innerHTML = '';
  const ul = document.createElement('ul');
  ul.className = 'lyrics-lines';
  ul.id = 'lyricsList';
  lyricsLines.forEach((line, i) => {
    const li = document.createElement('li');
    li.className = 'lyric-line';
    li.dataset.idx = i;
    li.textContent = line.text;
    ul.appendChild(li);
  });
  lyricsBody.appendChild(ul);
  lyricActiveIdx = -1;
  selectedLyricLines.clear();

  const hint = document.createElement('p');
  hint.className = 'lyrics-select-hint';
  hint.id = 'lyricsSelectHint';
  hint.textContent = 'Tocá hasta 4 líneas para compartirlas';
  lyricsBody.appendChild(hint);

  ul.querySelectorAll('.lyric-line').forEach((el, i) => {
    el.addEventListener('click', () => {
      if (audio.duration) audio.currentTime = lyricsLines[i].time;
      if (!isPlaying) playAudio();
      if (selectedLyricLines.has(i)) { selectedLyricLines.delete(i); el.classList.remove('is-selected'); }
      else {
        if (selectedLyricLines.size >= 4) { showToast('Máximo 4 líneas para compartir'); return; }
        selectedLyricLines.add(i); el.classList.add('is-selected');
      }
      const hint = document.getElementById('lyricsSelectHint');
      if (hint) hint.textContent = selectedLyricLines.size > 0 ? `${selectedLyricLines.size} línea${selectedLyricLines.size > 1 ? 's' : ''} seleccionada${selectedLyricLines.size > 1 ? 's' : ''} · tocá Compartir` : 'Tocá hasta 4 líneas para compartirlas';
    });
  });
}

lyricsShareBtn.addEventListener('click', () => {
  const track = filteredLib[currentIndex];
  if (!track) return;
  let linesToShare = [];
  if (selectedLyricLines.size > 0) {
    linesToShare = [...selectedLyricLines].sort((a,b)=>a-b).map(i=>lyricsLines[i]?.text).filter(Boolean);
  } else if (lyricsSynced && lyricActiveIdx >= 0) {
    linesToShare = [lyricsLines[lyricActiveIdx]?.text].filter(Boolean);
  }
  if (!linesToShare.length) { showToast('Esperá a que empiece la letra o seleccioná líneas'); return; }
  buildShareImage(linesToShare, track);
});

function buildShareImage(lines, track) {
  const W = 800, H = 800;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  const draw = (bgImg) => {
    if (bgImg) {
      ctx.filter = 'blur(40px) brightness(0.3)';
      ctx.drawImage(bgImg, -60, -60, W + 120, H + 120);
      ctx.filter = 'none';
    } else {
      ctx.fillStyle = '#0d0d0d';
      ctx.fillRect(0, 0, W, H);
    }
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, 'rgba(0,0,0,0.3)');
    grad.addColorStop(1, 'rgba(0,0,0,0.7)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    const coverSize = 160, coverX = (W - coverSize) / 2, coverY = 90;
    if (bgImg) {
      ctx.save();
      roundedRect(ctx, coverX, coverY, coverSize, coverSize, 16);
      ctx.clip();
      ctx.drawImage(bgImg, coverX, coverY, coverSize, coverSize);
      ctx.restore();
    }

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    const startY = bgImg ? coverY + coverSize + 64 : H / 2 - (lines.length * 56) / 2;
    const lineH = lines.length > 2 ? 52 : 62;
    const fontSize = lines.length > 2 ? 36 : 44;

    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = `700 72px "Figtree", sans-serif`;
    ctx.fillText('"', W / 2 - ctx.measureText(lines[0]).width / 2 - 36, startY - 12);
    ctx.fillStyle = '#ffffff';
    lines.forEach((line, i) => {
      wrapText(ctx, line, W / 2, startY + i * lineH, W - 120, lineH, 700, 'Figtree', fontSize);
    });
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '400 20px "Inter Tight", sans-serif';
    ctx.fillText(`${track.title} · ${track.artist}`, W / 2, H - 110);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.font = '700 16px "Figtree", sans-serif';
    ctx.fillText('WAVE', W / 2, H - 72);
    showShareModal(canvas, track, lines);
  };

  if (track.cover) {
    const img = new Image();
    img.onload = () => draw(img);
    img.onerror = () => draw(null);
    img.src = track.cover;
  } else { draw(null); }
}

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
}

function wrapText(ctx, text, x, y, maxW, lineH, weight, family, fontSize = 42) {
  ctx.font = `${weight} ${fontSize}px "${family}", sans-serif`;
  const words = text.split(' ');
  let line = '', lines = [];
  for (const word of words) {
    const test = line + (line ? ' ' : '') + word;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = word; }
    else { line = test; }
  }
  if (line) lines.push(line);
  if (lines.length > 3) {
    ctx.font = `${weight} ${Math.round(fontSize * 0.72)}px "${family}", sans-serif`;
    lines = []; line = '';
    for (const word of words) {
      const test = line + (line ? ' ' : '') + word;
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = word; }
      else { line = test; }
    }
    if (line) lines.push(line);
  }
  const totalH = lines.length * lineH;
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lineH - totalH / 2 + lineH / 2));
}

function showShareModal(canvas, track, lines) {
  document.getElementById('shareModalOverlay')?.remove();
  const linesArr = Array.isArray(lines) ? lines : [lines];
  const overlay = document.createElement('div');
  overlay.id = 'shareModalOverlay';
  overlay.className = 'share-modal-overlay';
  overlay.innerHTML = `
    <div class="share-modal">
      <div class="share-modal-title">Compartir letra</div>
      <div class="share-canvas-wrap"></div>
      <div style="font-size:.72rem;color:var(--text-dim);text-align:center;line-height:1.7">
        ${linesArr.map(l => `"${escapeHtml(l)}"`).join('<br>')}
        <br><span style="color:var(--text-mid)">${escapeHtml(track.title)} · ${escapeHtml(track.artist)}</span>
      </div>
      <div class="share-modal-actions">
        <button class="share-download-btn" id="shareDownload"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Descargar imagen</button>
        <button class="share-cancel-btn" id="shareCancel">Cerrar</button>
      </div>
    </div>`;
  const preview = document.createElement('canvas');
  preview.width = canvas.width; preview.height = canvas.height;
  preview.getContext('2d').drawImage(canvas, 0, 0);
  overlay.querySelector('.share-canvas-wrap').appendChild(preview);
  document.body.appendChild(overlay);
  overlay.querySelector('#shareDownload').addEventListener('click', () => {
    const a = document.createElement('a');
    a.download = `${track.title} - ${track.artist} · WAVE.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
    showToast('Imagen descargada');
  });
  const close = () => overlay.remove();
  overlay.querySelector('#shareCancel').addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
}

function updateShareBtnVisibility() {
  if (lyricsShareBtn) {
    lyricsShareBtn.style.display = (lyricsSynced && lyricsLines.length > 0) ? 'flex' : 'none';
  }
}


(async()=>{
  loadMetadata();
  loadPlaylists();
  renderQueueList();
  renderPlaylistSidebar();
  await tryRestoreFolder();
})();



const EQ_BANDS = [
  { freq: 60,   label: '60Hz',  type: 'lowshelf'  },
  { freq: 250,  label: '250Hz', type: 'peaking'   },
  { freq: 1000, label: '1kHz',  type: 'peaking'   },
  { freq: 4000, label: '4kHz',  type: 'peaking'   },
  { freq: 8000, label: '8kHz',  type: 'peaking'   },
  { freq: 16000,label: '16kHz', type: 'highshelf' },
];

const EQ_PRESETS = {
  flat:       [0,  0,  0,  0,  0,  0],
  bass:       [8,  4,  0,  0,  0,  0],
  vocal:      [-2, 0,  4,  4,  2,  0],
  treble:     [0,  0,  0,  2,  4,  6],
  electronic: [6,  4, -2,  2,  4,  4],
  acoustic:   [4,  2,  0,  2,  4,  2],
};


let eqFilters  = [];    
let eqGainNode = null; 
let eqActive   = true;
let eqGains    = [0, 0, 0, 0, 0, 0];
let eqPreampVal= 0;
let eqInitialized = false;


const eqBtn      = document.getElementById('eqBtn');
const eqPanel    = document.getElementById('eqPanel');
const eqClose    = document.getElementById('eqClose');
const eqEnabled  = document.getElementById('eqEnabled');
const eqReset    = document.getElementById('eqReset');
const eqPreamp   = document.getElementById('eqPreamp');
const eqPreampLabel = document.getElementById('eqPreampLabel');
const eqBandsEl  = document.getElementById('eqBands');


function initEQ() {
  if (eqInitialized || !audioCtx) return;
  eqInitialized = true;

  
  sourceNode.disconnect();

  
  eqGainNode = audioCtx.createGain();
  eqGainNode.gain.value = 1.0;

  
  eqFilters = EQ_BANDS.map(band => {
    const filter = audioCtx.createBiquadFilter();
    filter.type      = band.type;
    filter.frequency.value = band.freq;
    filter.gain.value = 0;
    filter.Q.value   = band.type === 'peaking' ? 1.2 : 0.7;
    return filter;
  });

  
  sourceNode.connect(eqGainNode);
  eqGainNode.connect(eqFilters[0]);
  for (let i = 0; i < eqFilters.length - 1; i++) {
    eqFilters[i].connect(eqFilters[i + 1]);
  }
  eqFilters[eqFilters.length - 1].connect(analyser);
 
  applyEQGains();
}


function applyEQGains() {
  if (!eqFilters.length) return;
  eqFilters.forEach((filter, i) => {
    filter.gain.value = eqActive ? eqGains[i] : 0;
  });
  if (eqGainNode) {
    const preampLinear = Math.pow(10, eqPreampVal / 20);
    eqGainNode.gain.value = eqActive ? preampLinear : 1.0;
  }
}


function buildEQBands() {
  eqBandsEl.innerHTML = '';
  EQ_BANDS.forEach((band, i) => {
    const div = document.createElement('div');
    div.className = 'eq-band';
    div.innerHTML = `
      <div class="eq-band-value" id="eqVal${i}">0 dB</div>
      <div class="eq-slider-wrap">
        <div class="eq-band-center-line"></div>
        <input type="range" class="eq-slider" id="eqSlider${i}"
          min="-12" max="12" value="0" step="0.5"
          orient="vertical" />
      </div>
      <div class="eq-band-label">${band.label}</div>`;
    eqBandsEl.appendChild(div);

    const slider = div.querySelector(`#eqSlider${i}`);
    const valEl  = div.querySelector(`#eqVal${i}`);

    slider.addEventListener('input', () => {
      const val = parseFloat(slider.value);
      eqGains[i] = val;
      updateBandDisplay(i, val, valEl);
      applyEQGains();
      saveEQSettings();
      
      document.querySelectorAll('.eq-preset-btn').forEach(b => b.classList.remove('is-active'));
    });
  });
}

function updateBandDisplay(i, val, valEl) {
  if (!valEl) valEl = document.getElementById(`eqVal${i}`);
  valEl.textContent = (val > 0 ? '+' : '') + val.toFixed(1) + ' dB';
  valEl.className = 'eq-band-value' + (val > 0.1 ? ' is-boosted' : val < -0.1 ? ' is-cut' : '');
}

function updateAllBandDisplays() {
  EQ_BANDS.forEach((_, i) => {
    const slider = document.getElementById(`eqSlider${i}`);
    const valEl  = document.getElementById(`eqVal${i}`);
    if (slider) {
      slider.value = eqGains[i];
      updateBandDisplay(i, eqGains[i], valEl);
    }
  });
}


document.querySelectorAll('.eq-preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const preset = btn.dataset.preset;
    const gains  = EQ_PRESETS[preset];
    if (!gains) return;
    eqGains = [...gains];
    updateAllBandDisplays();
    applyEQGains();
    saveEQSettings();
    document.querySelectorAll('.eq-preset-btn').forEach(b => b.classList.remove('is-active'));
    btn.classList.add('is-active');
  });
});


eqEnabled.addEventListener('change', () => {
  eqActive = eqEnabled.checked;
  applyEQGains();
  saveEQSettings();
  eqBtn.classList.toggle('is-active', eqActive && eqGains.some(g => g !== 0));
  showToast(eqActive ? 'Ecualizador activado' : 'EQ en bypass');
});


eqPreamp.addEventListener('input', () => {
  eqPreampVal = parseFloat(eqPreamp.value);
  eqPreampLabel.textContent = (eqPreampVal > 0 ? '+' : '') + eqPreampVal.toFixed(1) + ' dB';
  applyEQGains();
  saveEQSettings();
});


eqReset.addEventListener('click', () => {
  eqGains = [0, 0, 0, 0, 0, 0];
  eqPreampVal = 0;
  eqPreamp.value = 0;
  eqPreampLabel.textContent = '0 dB';
  updateAllBandDisplays();
  applyEQGains();
  saveEQSettings();
  document.querySelectorAll('.eq-preset-btn').forEach(b => b.classList.remove('is-active'));
  document.querySelector('.eq-preset-btn[data-preset="flat"]').classList.add('is-active');
  showToast('EQ reseteado');
});


eqBtn.addEventListener('click', () => {
  const open = eqPanel.style.display === 'none' || eqPanel.style.display === '';
  eqPanel.style.display = open ? 'block' : 'none';
  eqBtn.classList.toggle('is-open', open);
  if (open && !eqInitialized && audioCtx) {
    initEQ();
  }
});
eqClose.addEventListener('click', () => {
  eqPanel.style.display = 'none';
  eqBtn.classList.remove('is-open');
});


audio.addEventListener('play', () => {
  if (audioCtx && !eqInitialized) {
    buildEQBands();
    initEQ();
    loadEQSettings();
  }
}, { once: true });


function saveEQSettings() {
  localStorage.setItem('wave-eq', JSON.stringify({
    gains: eqGains,
    preamp: eqPreampVal,
    active: eqActive,
  }));

  const hasEffect = eqGains.some(g => Math.abs(g) > 0.1) || Math.abs(eqPreampVal) > 0.1;
  eqBtn.classList.toggle('is-active', eqActive && hasEffect);
}

function loadEQSettings() {
  const raw = localStorage.getItem('wave-eq');
  if (!raw) return;
  try {
    const s = JSON.parse(raw);
    if (s.gains) eqGains = s.gains;
    if (s.preamp !== undefined) {
      eqPreampVal = s.preamp;
      eqPreamp.value = s.preamp;
      eqPreampLabel.textContent = (s.preamp > 0 ? '+' : '') + s.preamp.toFixed(1) + ' dB';
    }
    if (s.active !== undefined) {
      eqActive = s.active;
      eqEnabled.checked = s.active;
    }
    updateAllBandDisplays();
    applyEQGains();
    const hasEffect = eqGains.some(g => Math.abs(g) > 0.1) || Math.abs(eqPreampVal) > 0.1;
    eqBtn.classList.toggle('is-active', eqActive && hasEffect);
  } catch {}
}


buildEQBands();
loadEQSettings();


let currentTheme = localStorage.getItem('wave-theme') || 'dark';

function applyTheme(theme) {
  currentTheme = theme;
  document.body.setAttribute('data-theme', theme);
  localStorage.setItem('wave-theme', theme);

  
  document.querySelectorAll('.theme-opt').forEach(opt => {
    opt.classList.toggle('is-active', opt.dataset.theme === theme);
  });
}


applyTheme(currentTheme);


document.getElementById('themeOptions')?.addEventListener('click', e => {
  const opt = e.target.closest('.theme-opt');
  if (!opt) return;
  applyTheme(opt.dataset.theme);
  showToast(`Tema: ${opt.querySelector('.theme-name').textContent}`);
});


const miniplayer       = document.getElementById('miniplayer');
const miniCover        = document.getElementById('miniCover');
const miniTitle        = document.getElementById('miniTitle');
const miniArtist       = document.getElementById('miniArtist');
const miniPlay         = document.getElementById('miniPlay');
const miniPrev         = document.getElementById('miniPrev');
const miniNext         = document.getElementById('miniNext');
const miniClose        = document.getElementById('miniClose');
const miniIconPlay     = document.getElementById('miniIconPlay');
const miniIconPause    = document.getElementById('miniIconPause');
const miniProgressFill = document.getElementById('miniProgressFill');

let miniVisible        = false;
let miniDismissed      = false; 


function updateMiniplayer() {
  if (currentIndex < 0 || !filteredLib[currentIndex]) return;
  const track = filteredLib[currentIndex];

 
  miniTitle.textContent  = track.title;
  miniArtist.textContent = track.artist;


  if (track.cover) {
    miniCover.innerHTML = `<img src="${track.cover}" alt="cover" />`;
  } else {
    miniCover.innerHTML = `<svg viewBox="0 0 42 42" fill="none"><rect width="42" height="42" fill="#1a1a1a"/><rect x="11" y="15" width="3" height="12" rx="1.5" fill="#333"/><rect x="16" y="11" width="3" height="20" rx="1.5" fill="#444"/><rect x="21" y="13" width="3" height="16" rx="1.5" fill="#555"/><rect x="26" y="9" width="3" height="24" rx="1.5" fill="#666"/></svg>`;
  }

  
  miniIconPlay.style.display  = isPlaying ? 'none' : 'block';
  miniIconPause.style.display = isPlaying ? 'block' : 'none';
}


function showMiniplayer() {
  if (miniVisible || miniDismissed) return;
  miniVisible = true;
  miniplayer.classList.add('is-visible');
}

function hideMiniplayer() {
  if (!miniVisible) return;
  miniVisible = false;
  miniplayer.classList.remove('is-visible');
}


const mainPanel = document.getElementById('mainPanel');
mainPanel.addEventListener('scroll', () => {
 
  if (mainPanel.scrollTop > 200 && currentIndex >= 0) {
    if (!miniDismissed) showMiniplayer();
  } else {
    hideMiniplayer();
  
    if (mainPanel.scrollTop < 50) miniDismissed = false;
  }
});


miniPlay.addEventListener('click', () => {
  isPlaying ? pauseAudio() : playAudio();
  miniIconPlay.style.display  = isPlaying ? 'none' : 'block';
  miniIconPause.style.display = isPlaying ? 'block' : 'none';
});

miniPrev.addEventListener('click', () => {
  playPrev();
  setTimeout(updateMiniplayer, 100);
});

miniNext.addEventListener('click', () => {
  playNext();
  setTimeout(updateMiniplayer, 100);
});

miniClose.addEventListener('click', () => {
  miniDismissed = true;
  hideMiniplayer();
});


audio.addEventListener('timeupdate', () => {
  if (!audio.duration) return;
  const pct = (audio.currentTime / audio.duration) * 100;
  miniProgressFill.style.width = pct + '%';
});


audio.addEventListener('play', () => {
  miniIconPlay.style.display  = 'none';
  miniIconPause.style.display = 'block';
});
audio.addEventListener('pause', () => {
  miniIconPlay.style.display  = 'block';
  miniIconPause.style.display = 'none';
});


audio.addEventListener('loadstart', () => {
  setTimeout(updateMiniplayer, 200);
});


updateMiniplayer();


const urlDownloadInput = document.getElementById('urlDownloadInput');
const urlDownloadBtn   = document.getElementById('urlDownloadBtn');
const urlDownloadProgress = document.getElementById('urlDownloadProgress');
const urlDownloadLabel = document.getElementById('urlDownloadLabel');
const urlDownloadFill  = document.getElementById('urlDownloadFill');

let urlDownloading = false;

function isYouTubeUrl(str) {
  return /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+/.test(str.trim());
}

urlDownloadInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') startUrlDownload();
});

urlDownloadBtn.addEventListener('click', () => startUrlDownload());

urlDownloadInput.addEventListener('paste', (e) => {
  setTimeout(() => {
    const val = urlDownloadInput.value.trim();
    if (isYouTubeUrl(val)) startUrlDownload();
  }, 50);
});

function startUrlDownload() {
  if (urlDownloading) return;
  const rawUrl = urlDownloadInput.value.trim();
  if (!rawUrl) { showToast('Pegá una URL de YouTube'); return; }
  if (!isYouTubeUrl(rawUrl)) { showToast('URL inválida — usá un link de YouTube'); return; }

  urlDownloading = true;
  urlDownloadProgress.style.display = 'block';
  urlDownloadLabel.textContent = 'Conectando...';
  urlDownloadFill.style.width = '0%';
  urlDownloadFill.style.background = '';
  urlDownloadBtn.disabled = true;

  const apiUrl = `http://localhost:3001/download?q=${encodeURIComponent(rawUrl)}`;
  const es = new EventSource(apiUrl);

  es.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    switch (msg.type) {
      case 'start':
        urlDownloadLabel.textContent = 'Buscando...';
        break;
      case 'progress':
        urlDownloadFill.style.width = msg.pct + '%';
        urlDownloadLabel.textContent = `${Math.round(msg.pct)}%`;
        break;
      case 'converting':
        urlDownloadFill.style.width = '100%';
        urlDownloadLabel.textContent = 'Convirtiendo a MP3...';
        break;
      case 'done':
        urlDownloadFill.style.width = '100%';
        urlDownloadFill.style.background = '#1db954';
        urlDownloadLabel.textContent = '✓ Descargado';
        es.close();
        urlDownloadInput.value = '';
        urlDownloadBtn.disabled = false;
        urlDownloading = false;
        setTimeout(async () => {
          urlDownloadProgress.style.display = 'none';
          if (folderHandle) {
            try {
              const wasOpen = searchDropdown.style.display !== 'none';
              const savedSearch = searchInput.value;
              library = []; idCounter = 0;
              await loadFilesFromFolder(folderHandle);
              searchInput.value = savedSearch;
              if (wasOpen && savedSearch) { showDropdown(); searchInput.dispatchEvent(new Event('input')); }
              showToast(`✓ Descargado y agregado a la biblioteca`);
            } catch { showToast(`✓ Descargado`); }
          } else {
            showToast(`✓ Descargado`);
          }
        }, 2000);
        break;
      case 'error':
        urlDownloadFill.style.background = '#e53935';
        urlDownloadLabel.textContent = '✗ Error al descargar';
        es.close();
        urlDownloadBtn.disabled = false;
        urlDownloading = false;
        showToast(`Error: ${msg.msg}`);
        setTimeout(() => { urlDownloadProgress.style.display = 'none'; }, 3000);
        break;
    }
  };

  es.onerror = () => {
    urlDownloadLabel.textContent = '✗ Sin conexión con el proxy';
    urlDownloadFill.style.background = '#e53935';
    es.close();
    urlDownloadBtn.disabled = false;
    urlDownloading = false;
    showToast('No se pudo conectar al proxy.');
    setTimeout(() => { urlDownloadProgress.style.display = 'none'; }, 3000);
  };
}
