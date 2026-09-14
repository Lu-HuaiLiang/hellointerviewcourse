import {createServer} from 'node:http';
import {readFile, watch} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root = new URL('../', import.meta.url);
const port = Number(process.env.PORT || 5173);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('PORT must be an integer between 1 and 65535.');
  process.exit(1);
}

function build() {
  const result = spawnSync(process.execPath, ['scripts/build.mjs'], {
    cwd: fileURLToPath(root), stdio: 'inherit',
  });
  if (result.error) console.error(result.error.message);
  return result.status === 0;
}
if (!build()) process.exit(1);

const server = createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, {Allow: 'GET, HEAD'});
    res.end();
    return;
  }
  const path = req.url.split('?')[0];
  if (path !== '/' && path !== '/index.html') {
    res.writeHead(404);
    res.end();
    return;
  }
  readFile(new URL('index.html', root), (error, html) => {
    if (error) {
      res.writeHead(500, {'Content-Type': 'text/plain; charset=utf-8'});
      res.end('Unable to read index.html. Check the build output.');
      return;
    }
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Length': html.length,
      'Cache-Control': 'no-store',
    });
    res.end(req.method === 'HEAD' ? undefined : html);
  });
});

let watcher, rebuildTimer;
server.on('error', error => {
  console.error(error.code === 'EADDRINUSE'
    ? `Port ${port} is in use. Try PORT=${port + 1} pnpm dev.`
    : error.message);
  watcher?.close();
  clearTimeout(rebuildTimer);
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => {
  console.log(`\nCourse: http://127.0.0.1:${port}\nWatching src/; refresh your browser after changes.\n`);
  watcher = watch(new URL('src/', root), {recursive: true}, () => {
    clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(() => {
      if (build()) console.log('Rebuilt. Refresh your browser to see the changes.');
      else console.error('Build failed. Fix the source and save again.');
    }, 150);
  });
  watcher.on('error', error => {
    console.error('Source watcher failed:', error.message);
    clearTimeout(rebuildTimer);
    watcher.close();
    server.close();
    process.exitCode = 1;
  });
});
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    clearTimeout(rebuildTimer);
    watcher?.close();
    server.close();
  });
}
