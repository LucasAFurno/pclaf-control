import { mkdir, readFile, rm, writeFile, copyFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const dist = path.join(root, 'dist')
const serverDir = path.join(dist, 'server')
const hostingDir = path.join(dist, '.openai')

const clientJs = await readFile(path.join(root, 'site', 'client.js'), 'utf8')
const dataStoreJs = await readFile(path.join(root, 'site', 'data-store.js'), 'utf8')
const cloudSyncJs = await readFile(path.join(root, 'site', 'cloud-sync.js'), 'utf8')
const cloudAuthJs = await readFile(path.join(root, 'site', 'cloud-auth.js'), 'utf8')
const stylesCss = await readFile(path.join(root, 'site', 'styles.css'), 'utf8')
const cloudConfigJson = await readFile(path.join(root, 'site', 'cloud-config.json'), 'utf8')
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
    <style>
      #boot-status {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
        background: linear-gradient(180deg, #050505 0%, #0b0b0b 100%);
        color: #f3f4f6;
        font-family: Arial, sans-serif;
      }
      .boot-card {
        width: min(560px, 100%);
        padding: 28px;
        border-radius: 24px;
        border: 1px solid rgba(255,255,255,0.08);
        background: rgba(17, 17, 17, 0.96);
        box-shadow: 0 20px 60px rgba(0,0,0,0.35);
      }
      .boot-card strong {
        display: block;
        margin-bottom: 10px;
        font-size: 28px;
      }
      .boot-card p {
        margin: 0;
        color: #9ca3af;
        line-height: 1.5;
      }
      .boot-card p + p {
        margin-top: 10px;
      }
      .boot-card.is-error strong {
        color: #ff5a4f;
      }
    </style>
  </head>
  <body>
    <div id="app"></div>
    <div id="boot-status">
      <div class="boot-card">
        <strong>PCLAF Control</strong>
        <p>Cargando sistema...</p>
      </div>
    </div>
    <script>
      window.__pclafBooted = false;
      window.__pclafBootError = null;
      window.addEventListener('error', function (event) {
        window.__pclafBootError = event && event.message ? event.message : 'Error inesperado al iniciar la aplicacion.';
      });
      window.addEventListener('unhandledrejection', function (event) {
        var reason = event && event.reason;
        window.__pclafBootError = reason && reason.message ? reason.message : 'Fallo una promesa al iniciar la aplicacion.';
      });
      window.setTimeout(function () {
        if (window.__pclafBooted) return;
        var shell = document.getElementById('boot-status');
        if (!shell) return;
        var message = window.__pclafBootError || 'La aplicacion no termino de cargar. Proba recargar con Ctrl + F5.';
        shell.innerHTML = '<div class="boot-card is-error"><strong>No se pudo iniciar</strong><p>' + message + '</p><p>Si sigue igual, avisame y reviso el error puntual.</p></div>';
      }, 4000);
    </script>
    <script type="module" src="/app.js"></script>
  </body>
</html>
`

const serverCode = `const html = ${JSON.stringify(html)};
const css = ${JSON.stringify(stylesCss)};
const js = ${JSON.stringify(clientJs)};
const dataStore = ${JSON.stringify(dataStoreJs)};
const cloudSync = ${JSON.stringify(cloudSyncJs)};
const cloudAuth = ${JSON.stringify(cloudAuthJs)};
const cloudConfig = ${JSON.stringify(cloudConfigJson)};
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
    if (url.pathname === '/data-store.js') return asset(dataStore, 'application/javascript; charset=utf-8');
    if (url.pathname === '/cloud-sync.js') return asset(cloudSync, 'application/javascript; charset=utf-8');
    if (url.pathname === '/cloud-auth.js') return asset(cloudAuth, 'application/javascript; charset=utf-8');
    if (url.pathname === '/cloud-config.json') return asset(cloudConfig, 'application/json; charset=utf-8');
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
await writeFile(path.join(dist, 'data-store.js'), dataStoreJs)
await writeFile(path.join(dist, 'cloud-sync.js'), cloudSyncJs)
await writeFile(path.join(dist, 'cloud-auth.js'), cloudAuthJs)
await writeFile(path.join(dist, 'cloud-config.json'), cloudConfigJson)
await writeFile(path.join(serverDir, 'index.js'), serverCode)
await writeFile(path.join(hostingDir, 'hosting.json'), hostingJson)
await copyFile(path.join(root, 'public', 'favicon.svg'), path.join(dist, 'favicon.svg'))
await copyFile(path.join(root, 'public', 'pclaf-logo.png'), path.join(dist, 'pclaf-logo.png'))

// Keep the repository root deployable as a plain static site for Sites source deployments.
await writeFile(path.join(root, 'index.html'), html)
await writeFile(path.join(root, 'app.css'), stylesCss)
await writeFile(path.join(root, 'app.js'), clientJs)
await writeFile(path.join(root, 'data-store.js'), dataStoreJs)
await writeFile(path.join(root, 'cloud-sync.js'), cloudSyncJs)
await writeFile(path.join(root, 'cloud-auth.js'), cloudAuthJs)
await writeFile(path.join(root, 'cloud-config.json'), cloudConfigJson)
await copyFile(path.join(root, 'public', 'favicon.svg'), path.join(root, 'favicon.svg'))
await copyFile(path.join(root, 'public', 'pclaf-logo.png'), path.join(root, 'pclaf-logo.png'))
