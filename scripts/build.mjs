import { mkdir, readFile, rm, writeFile, copyFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const dist = path.join(root, 'dist')
const serverDir = path.join(dist, 'server')
const hostingDir = path.join(dist, '.openai')

const clientJs = await readFile(path.join(root, 'site', 'client.js'), 'utf8')
const stylesCss = await readFile(path.join(root, 'site', 'styles.css'), 'utf8')
const hostingJson = await readFile(path.join(root, '.openai', 'hosting.json'), 'utf8')
const faviconSvg = await readFile(path.join(root, 'public', 'favicon.svg'), 'utf8')
const pclafLogo = await readFile(path.join(root, 'public', 'pclaf-logo.png'))

const html = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Sistema web para comercio con ventas, proveedores, stock y facturacion." />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="stylesheet" href="/app.css" />
    <title>Comercio 360</title>
  </head>
  <body>
    <div id="app"></div>
    <script src="/app.js"></script>
  </body>
</html>
`

const serverCode = `const html = ${JSON.stringify(html)};
const css = ${JSON.stringify(stylesCss)};
const js = ${JSON.stringify(clientJs)};
const favicon = ${JSON.stringify(faviconSvg)};
const logo = ${JSON.stringify([...pclafLogo])};

const asset = (body, contentType) =>
  new Response(body, {
    headers: {
      'content-type': contentType,
      'cache-control': 'public, max-age=300',
    },
  });

const page = () =>
  new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    },
  });

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === '/app.css') return asset(css, 'text/css; charset=utf-8');
    if (url.pathname === '/app.js') return asset(js, 'application/javascript; charset=utf-8');
    if (url.pathname === '/favicon.svg') return asset(favicon, 'image/svg+xml');
    if (url.pathname === '/pclaf-logo.png') return asset(Uint8Array.from(logo), 'image/png');
    if (url.pathname === '/' || url.pathname.startsWith('/#')) return page();

    return page();
  },
};
`

await rm(dist, { recursive: true, force: true })
await mkdir(serverDir, { recursive: true })
await mkdir(hostingDir, { recursive: true })

await writeFile(path.join(dist, 'index.html'), html)
await writeFile(path.join(dist, 'app.css'), stylesCss)
await writeFile(path.join(dist, 'app.js'), clientJs)
await writeFile(path.join(serverDir, 'index.js'), serverCode)
await writeFile(path.join(hostingDir, 'hosting.json'), hostingJson)
await copyFile(path.join(root, 'public', 'favicon.svg'), path.join(dist, 'favicon.svg'))
await copyFile(path.join(root, 'public', 'pclaf-logo.png'), path.join(dist, 'pclaf-logo.png'))
