/* Fork: the routes that publish the OpenAPI document.
 *
 *   GET /api/openapi.json    the 3.2 document (what Orval reads; also api/openapi.json on disk)
 *   GET /api/docs            Swagger UI over it
 *   GET /api/docs/{file}     Swagger UI's own files
 *
 * Swagger UI is served from the api (swagger-ui-dist), not a CDN: the web container's
 * Content-Security-Policy allows scripts from 'self' only, inline ones included, and a LAN-only
 * instance may have no internet at all. So the page loads nothing inline and nothing from outside.
 * Public, like the document upstream published on its website: it describes the api, not anyone's
 * data.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { native, type ApiContext } from '../http-app.ts';
import { openApiDocument } from './document.ts';

const require = createRequire(import.meta.url);
const DIST = path.dirname(require.resolve('swagger-ui-dist/package.json'));

const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>openGym API</title>
<link rel="stylesheet" href="/api/docs/swagger-ui.css">
<link rel="icon" type="image/png" href="/api/docs/favicon-32x32.png">
</head>
<body>
<div id="swagger-ui"></div>
<script src="/api/docs/swagger-ui-bundle.js"></script>
<script src="/api/docs/init.js"></script>
</body>
</html>
`;

const INIT = `window.ui = SwaggerUIBundle({ url: '/api/openapi.json', dom_id: '#swagger-ui', deepLinking: true, withCredentials: true });\n`;

const FILES: Record<string, { type: string; body: () => string | Buffer }> = {
  'swagger-ui.css': { type: 'text/css; charset=utf-8', body: () => fs.readFileSync(path.join(DIST, 'swagger-ui.css')) },
  'swagger-ui-bundle.js': { type: 'text/javascript; charset=utf-8', body: () => fs.readFileSync(path.join(DIST, 'swagger-ui-bundle.js')) },
  'favicon-32x32.png': { type: 'image/png', body: () => fs.readFileSync(path.join(DIST, 'favicon-32x32.png')) },
  'init.js': { type: 'text/javascript; charset=utf-8', body: () => INIT }
};
const cache = new Map<string, string | Buffer>();

/** The file pattern the router allows for {file} (http-app.ts PARAMS). */
export const DOC_FILE_RE = '[a-z0-9-]+\\.(?:css|js|png)';

export const docsRoutes = {
  'GET /api/openapi.json': native(c => c.json(openApiDocument(), 200, { 'Cache-Control': 'no-cache' })),
  'GET /api/docs': native(c => c.html(PAGE, 200, { 'Cache-Control': 'no-cache' })),
  'GET /api/docs/{file}': native((c: ApiContext) => {
    const name = c.env.incoming.docFile as string;
    const f = FILES[name];
    if (!f) return c.json({ error: 'not found' }, 404);
    if (!cache.has(name)) cache.set(name, f.body());
    const body = cache.get(name)!;
    return c.body(typeof body === 'string' ? body : new Uint8Array(body), 200, { 'Content-Type': f.type, 'Cache-Control': 'public, max-age=86400' });
  })
};
