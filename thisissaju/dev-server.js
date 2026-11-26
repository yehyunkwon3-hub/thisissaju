// 로컬 실행용 서버: node dev-server.js → http://localhost:3000
// (배포는 Vercel이 public/ 과 api/ 를 그대로 사용해요)
const http = require('http'), fs = require('fs'), path = require('path');
try { for (const l of fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split('\n')) { const m = /^\s*([A-Z_]+)\s*=\s*(.*)\s*$/.exec(l); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); } } catch (e) {}
const PORT = process.env.PORT || 3000;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  res.status = c => { res.statusCode = c; return res; };
  res.json = o => { res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(o)); };
  if (url.pathname.startsWith('/api/')) {
    const file = path.join(__dirname, 'api', path.basename(url.pathname) + '.js');
    if (!fs.existsSync(file)) return res.status(404).json({ message: 'not found' });
    let body = ''; for await (const c of req) body += c;
    try { req.body = body ? JSON.parse(body) : {}; } catch (e) { req.body = {}; }
    try { return await require(file)(req, res); } catch (e) { console.error(e); return res.status(500).json({ message: e.message }); }
  }
  let p = path.normalize(path.join(__dirname, 'public', url.pathname === '/' ? 'index.html' : url.pathname));
  if (!p.startsWith(path.join(__dirname, 'public')) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.statusCode = 404; return res.end('Not found'); }
  res.setHeader('Content-Type', TYPES[path.extname(p)] || 'application/octet-stream');
  fs.createReadStream(p).pipe(res);
}).listen(PORT, () => console.log(`이것이 사주다 → http://localhost:${PORT}`));
