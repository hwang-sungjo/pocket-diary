import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';

const outputRoot = resolve(process.cwd(), 'dist');
const requestedPort = Number(process.env.POCKET_DIARY_PREVIEW_PORT ?? '4173');

if (!Number.isInteger(requestedPort) || requestedPort < 1 || requestedPort > 65535) {
  throw new Error('POCKET_DIARY_PREVIEW_PORT는 1~65535 정수여야 합니다.');
}

const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp'],
]);

const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(
      new URL(request.url ?? '/', 'http://127.0.0.1').pathname,
    );
    const filePath = await resolveExportedFile(pathname);

    if (!filePath) {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Not found');
      return;
    }

    response.writeHead(200, {
      'cache-control': 'no-store',
      'content-type': contentTypes.get(extname(filePath)) ?? 'application/octet-stream',
    });

    if (request.method === 'HEAD') {
      response.end();
      return;
    }

    createReadStream(filePath).pipe(response);
  } catch (error) {
    response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    response.end(error instanceof Error ? error.message : 'Preview server error');
  }
});

server.listen(requestedPort, '127.0.0.1', () => {
  console.log(`Pocket Diary Web preview: http://127.0.0.1:${requestedPort}`);
});

async function resolveExportedFile(pathname) {
  const trimmedPath = pathname.replace(/\/+$/, '') || '/';
  const candidates =
    trimmedPath === '/'
      ? ['/index.html']
      : [trimmedPath, `${trimmedPath}.html`, `${trimmedPath}/index.html`];

  for (const candidate of candidates) {
    const filePath = resolve(outputRoot, `.${candidate}`);
    if (!filePath.startsWith(`${outputRoot}${sep}`)) {
      continue;
    }

    try {
      if ((await stat(filePath)).isFile()) {
        return filePath;
      }
    } catch {
      // 다음 정적 라우트 후보를 확인한다.
    }
  }

  return null;
}
