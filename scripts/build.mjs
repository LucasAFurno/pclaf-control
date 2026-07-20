import { mkdir, readFile, rm, writeFile, copyFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const dist = path.join(root, 'dist')
const serverDir = path.join(dist, 'server')
const buildTarget = (process.argv[2] || process.env.PCLAF_ENV || 'prod').toLowerCase()
const isDevBuild = buildTarget === 'dev'
const selectedCloudConfigFile = isDevBuild ? 'cloud-config.dev.json' : 'cloud-config.prod.json'
const assetVersion = '20260720f'

const clientJs = await readFile(path.join(root, 'site', 'client.js'), 'utf8')
const dataStoreJs = await readFile(path.join(root, 'site', 'data-store.js'), 'utf8')
const cloudSyncJs = await readFile(path.join(root, 'site', 'cloud-sync.js'), 'utf8')
const cloudAuthJs = await readFile(path.join(root, 'site', 'cloud-auth.js'), 'utf8')
const cloudCoreJs = await readFile(path.join(root, 'site', 'cloud-core.js'), 'utf8')
const stylesCss = await readFile(path.join(root, 'site', 'styles.css'), 'utf8')
const cloudConfigJson = await readFile(path.join(root, 'site', selectedCloudConfigFile), 'utf8')
const faviconSvg = await readFile(path.join(root, 'public', 'favicon.svg'), 'utf8')
const pclafLogo = await readFile(path.join(root, 'public', 'pclaf-logo.png'))
const cnameFile = await readFile(path.join(root, 'public', 'CNAME'), 'utf8')

const html = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="PCLAF Control es un sistema de ventas, caja, stock, clientes, productos, compras y facturacion para kioscos, tiendas, locales y comercios que quieren trabajar desde la web." />
    <meta name="keywords" content="sistema de ventas, software para comercios, control de stock, caja, facturacion, punto de venta web, sistema para kioscos, sistema para tiendas, software comercial, PCLAF Control" />
    <meta name="robots" content="index,follow" />
    <meta name="referrer" content="strict-origin-when-cross-origin" />
    <meta http-equiv="Permissions-Policy" content="camera=(), microphone=(), geolocation=(), interest-cohort=()" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' https://esm.sh; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://rfwsnqmjkclxhbmidbkm.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none';" />
    <meta property="og:title" content="PCLAF Control | Sistema de ventas, caja y stock para comercios" />
    <meta property="og:description" content="Sistema comercial web para vender, cobrar, controlar stock, clientes, compras y comprobantes desde PC o celular." />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://www.pclafcontrol.com.ar/" />
    <meta property="og:image" content="/pclaf-logo.png" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="PCLAF Control | Sistema comercial web" />
    <meta name="twitter:description" content="Ventas, caja, stock, clientes, compras y comprobantes desde una sola web para comercios." />
    <link rel="canonical" href="https://www.pclafcontrol.com.ar/" />
    <link rel="icon" type="image/png" href="/pclaf-logo.png" />
    <link rel="shortcut icon" href="/pclaf-logo.png" />
    <link rel="apple-touch-icon" href="/pclaf-logo.png" />
    <link rel="stylesheet" href="/app.css" />
    <title>PCLAF Control | Sistema de ventas, caja y stock para comercios</title>
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "PCLAF Control",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Web",
        "url": "https://www.pclafcontrol.com.ar/",
        "image": "https://www.pclafcontrol.com.ar/pclaf-logo.png",
        "description": "Sistema comercial web para ventas, caja, stock, clientes, compras, tickets y comprobantes para comercios.",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "ARS"
        }
      }
    </script>
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
    <script type="module" src="/app.js?v=${assetVersion}"></script>
  </body>
</html>
`

const serverCode = `const html = ${JSON.stringify(html)};
const css = ${JSON.stringify(stylesCss)};
const js = ${JSON.stringify(clientJs)};
const dataStore = ${JSON.stringify(dataStoreJs)};
const cloudSync = ${JSON.stringify(cloudSyncJs)};
const cloudAuth = ${JSON.stringify(cloudAuthJs)};
const cloudCore = ${JSON.stringify(cloudCoreJs)};
const cloudConfig = ${JSON.stringify(cloudConfigJson)};
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
    if (url.pathname === '/cloud-core.js') return asset(cloudCore, 'application/javascript; charset=utf-8');
    if (url.pathname === '/cloud-config.json') return asset(cloudConfig, 'application/json; charset=utf-8');
    if (url.pathname === '/favicon.svg') return asset(Uint8Array.from(logo), 'image/png');
    if (url.pathname === '/pclaf-logo.png') return asset(Uint8Array.from(logo), 'image/png');
    if (url.pathname === '/' || url.pathname.startsWith('/#')) return page();

    return page();
  },
};
`

await rm(dist, { recursive: true, force: true })
await mkdir(serverDir, { recursive: true })

await writeFile(path.join(dist, 'index.html'), html)
await writeFile(path.join(dist, 'app.css'), stylesCss)
await writeFile(path.join(dist, 'app.js'), clientJs)
await writeFile(path.join(dist, 'data-store.js'), dataStoreJs)
await writeFile(path.join(dist, 'cloud-sync.js'), cloudSyncJs)
await writeFile(path.join(dist, 'cloud-auth.js'), cloudAuthJs)
await writeFile(path.join(dist, 'cloud-core.js'), cloudCoreJs)
await writeFile(path.join(dist, 'cloud-config.json'), cloudConfigJson)
await writeFile(path.join(serverDir, 'index.js'), serverCode)
await copyFile(path.join(root, 'public', 'favicon.svg'), path.join(dist, 'favicon.svg'))
await copyFile(path.join(root, 'public', 'pclaf-logo.png'), path.join(dist, 'pclaf-logo.png'))
if (!isDevBuild) {
  await writeFile(path.join(dist, 'CNAME'), cnameFile)
}

// Keep the repository root deployable as a plain static site only for production deployments.
if (!isDevBuild) {
  await writeFile(path.join(root, 'index.html'), html)
  await writeFile(path.join(root, 'app.css'), stylesCss)
  await writeFile(path.join(root, 'app.js'), clientJs)
  await writeFile(path.join(root, 'data-store.js'), dataStoreJs)
  await writeFile(path.join(root, 'cloud-sync.js'), cloudSyncJs)
  await writeFile(path.join(root, 'cloud-auth.js'), cloudAuthJs)
  await writeFile(path.join(root, 'cloud-core.js'), cloudCoreJs)
  await writeFile(path.join(root, 'cloud-config.json'), cloudConfigJson)
  await copyFile(path.join(root, 'public', 'favicon.svg'), path.join(root, 'favicon.svg'))
  await copyFile(path.join(root, 'public', 'pclaf-logo.png'), path.join(root, 'pclaf-logo.png'))
  await writeFile(path.join(root, 'CNAME'), cnameFile)
}
