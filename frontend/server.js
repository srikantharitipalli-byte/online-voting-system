const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.PORT || 3000;
const publicDir = path.join(__dirname, '.');

const mime = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.ico': 'image/x-icon'
};

const requestHandler = (req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';
  const filePath = path.join(publicDir, decodeURIComponent(reqPath));

  if (!filePath.startsWith(publicDir)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.statusCode = 404;
      res.end('Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mime[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
};

function tryListen(startPort, maxRetries = 10) {
  const attemptListen = (p, remaining) => {
    const srv = http.createServer(requestHandler);
    srv.on('error', (err) => {
      if (err && err.code === 'EADDRINUSE' && remaining > 0) {
        console.warn(`Port ${p} in use — trying ${p + 1}...`);
        attemptListen(p + 1, remaining - 1);
      } else {
        console.error('Server error:', err);
        process.exit(1);
      }
    });
    srv.listen(p, () => {
      console.log(`Frontend static server running at http://localhost:${p}`);
    });
  };

  attemptListen(startPort, maxRetries);
}

tryListen(port, 20);

