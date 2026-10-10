
const http    = require('http');
const https   = require('https');
const zlib    = require('zlib');
const { spawn } = require('child_process');
const path    = require('path');
const os      = require('os');
const fs      = require('fs');

const PORT = 3001;


const MUSIC_DIR = 'D:\\usuarios\\Desktop\\musica';


if (!fs.existsSync(MUSIC_DIR)) {
  try { fs.mkdirSync(MUSIC_DIR, { recursive: true }); } catch {}
}


function getYtDlpCmd() {

  const local = path.join(__dirname, 'yt-dlp.exe');
  if (fs.existsSync(local)) return local;
  const localUnix = path.join(__dirname, 'yt-dlp');
  if (fs.existsSync(localUnix)) return localUnix;

  return process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
}

const YTDLP = getYtDlpCmd();



http.createServer((req, res) => {

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = new URL(req.url, `http://localhost:${PORT}`);


  if (url.pathname === '/download-dir') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ dir: MUSIC_DIR }));
    return;
  }


  if (url.pathname === '/yt-search') {
    const q = url.searchParams.get('q') || '';
    if (!q.trim()) { res.writeHead(400); res.end('Missing q'); return; }

    const proc = spawn(YTDLP, [
      '--dump-json',
      '--flat-playlist',
      '--default-search', 'ytsearch10',
      '--cookies', path.join(__dirname, 'cookies.txt'),
      '--no-warnings',
      q
    ]);

    const results = [];
    let buffer = '';

    proc.stdout.on('data', chunk => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const item = JSON.parse(line);
          results.push({
            title: item.title,
            videoId: item.id,
            author: item.uploader || item.channel || 'YouTube',
            lengthSeconds: item.duration || 0,
            videoThumbnails: [{ quality: 'default', url: `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg` }]
          });
        } catch(e) {}
      }
    });

    proc.on('close', () => {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(results));
    });

    proc.on('error', () => {
      res.writeHead(500);
      res.end('[]');
    });
    return;
  }

  if (url.pathname === '/itunes') {
    const q = url.searchParams.get('q') || '';
    if (!q.trim()) { res.writeHead(400); res.end('Missing q param'); return; }

    const itunesUrl =
      `https://itunes.apple.com/search?term=${encodeURIComponent(q)}` +
      `&media=music&limit=12&country=US`;

    const options = {
      headers: {
        'User-Agent':      'Mozilla/5.0',
        'Accept':          'application/json',
        'Accept-Encoding': 'gzip, deflate',
      }
    };

    https.get(itunesUrl, options, (itunesRes) => {
      const encoding = itunesRes.headers['content-encoding'] || '';
      const chunks   = [];

      itunesRes.on('data', chunk => chunks.push(chunk));
      itunesRes.on('end', () => {
        const raw = Buffer.concat(chunks);
        const decode = (buf) => buf.toString('utf8').replace(/^\uFEFF/, '').trim();

        if (encoding === 'gzip') {
          zlib.gunzip(raw, (err, decoded) => {
            if (err) { res.writeHead(500); res.end('Decompress error'); return; }
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(decode(decoded));
          });
        } else if (encoding === 'deflate') {
          zlib.inflate(raw, (err, decoded) => {
            if (err) { res.writeHead(500); res.end('Decompress error'); return; }
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(decode(decoded));
          });
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(decode(raw));
        }
      });
    }).on('error', (err) => {
      console.error('Error al contactar iTunes:', err.message);
      res.writeHead(502); res.end('iTunes unreachable');
    });
    return;
  }

  
  if (url.pathname === '/download') {
    const q = url.searchParams.get('q') || '';
    if (!q.trim()) { res.writeHead(400); res.end('Missing q param'); return; }


    res.writeHead(200, {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
    });

    const send = (type, payload) => {
      res.write(`data: ${JSON.stringify({ type, ...payload })}\n\n`);
    };

    send('start', { q, dir: MUSIC_DIR });
    console.log(`\n⬇  Descargando: ${q}`);
    console.log(`   Destino: ${MUSIC_DIR}`);

    const args = [
      '-x',
      '--audio-format', 'mp3',
      '--audio-quality', '0',
      '--embed-thumbnail',
      '--add-metadata',
      '--cookies', path.join(__dirname, 'cookies.txt'),
      '--js-runtimes', 'node',
      '--ffmpeg-location', __dirname,
      '--output', path.join(MUSIC_DIR, '%(title)s.%(ext)s'),
      '--newline',
      /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//.test(q) ? q : `ytsearch1:${q}`,
    ];

    const proc = spawn(YTDLP, args, { cwd: MUSIC_DIR });

    let lastFile = '';
    let finalMp3  = '';

    proc.stdout.on('data', (data) => {
      const lines = data.toString().split('\n').filter(Boolean);
      for (const line of lines) {
        console.log('  >', line);


        const pctMatch = line.match(/\[download\]\s+([\d.]+)%/);
        if (pctMatch) {
          send('progress', { pct: parseFloat(pctMatch[1]), line });
          continue;
        }

       
        const extractMatch = line.match(/\[ExtractAudio\].*?Destination:\s+(.+\.mp3)/i);
        if (extractMatch) {
          finalMp3 = path.basename(extractMatch[1].trim());
          send('converting', { line });
          continue;
        }

  
        const destMatch = line.match(/Destination:\s+(.+)/);
        if (destMatch) {
          lastFile = path.basename(destMatch[1].trim());
          if (lastFile.endsWith('.mp3')) finalMp3 = lastFile;
          send('file', { file: lastFile });
          continue;
        }

        if (line.includes('has already been downloaded')) {
          send('info', { line: 'Ya estaba descargada' });
          continue;
        }

        if (line.includes('[ExtractAudio]') || line.includes('Converting')) {
          send('converting', { line });
          continue;
        }

        send('log', { line });
      }
    });

    proc.stderr.on('data', (data) => {
      const line = data.toString().trim();
      if (line) {
        console.warn('  ⚠', line);
        send('warn', { line });
      }
    });

    proc.on('close', (code) => {
        if (code === 0 || code === null) {
        const doneFile = finalMp3 || lastFile;
        send('done', { file: doneFile });
        console.log(`  ✅ Listo: ${doneFile || q}\n`);
      } else {
        send('error', { msg: `yt-dlp salió con código ${code}` });
        console.error(`  ❌ Error código ${code}\n`);
      }
      res.end();
    });

    proc.on('error', (err) => {
      send('error', { msg: `No se pudo ejecutar yt-dlp: ${err.message}. Verificá que esté instalado.` });
      console.error('  ❌ Error al ejecutar yt-dlp:', err.message);
      res.end();
    });

    req.on('close', () => {
      proc.kill();
    }); 

    return;
  }



  const staticBase = __dirname;
  let filePath = url.pathname === '/' ? '/index.html' : url.pathname;
  filePath = path.join(staticBase, filePath);

  // Block sensitive files
  const blocked = ['.txt', '.exe', '.log'];
  const fileExt = path.extname(filePath).toLowerCase();
  if (blocked.includes(fileExt)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const mime = {
    '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon',
    '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff',
  }[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });

}).listen(PORT, () => {
  console.log(`\n✅  WAVE proxy corriendo en http://localhost:${PORT}`);
  console.log(`   Carpeta de música: ${MUSIC_DIR}`);
  console.log(`   yt-dlp: ${YTDLP}`);
  console.log(`   Dejá esta ventana abierta mientras usás el player.\n`);
});
