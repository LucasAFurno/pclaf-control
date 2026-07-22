# PCLAF Control: estado local de SEO y salida web

Fecha: 2026-07-21

## Resuelto localmente

- Separacion entre web publica y sistema:
  - `/` queda para marketing y SEO.
  - `/app/` queda para login y aplicacion.
- HTML visible sin depender de JavaScript en toda la web publica.
- Titulo SEO corto y especifico en portada:
  - `Sistema de ventas y stock | PCLAF Control`
- H1 comercial visible desde el HTML inicial.
- Metadescripciones por pagina.
- Canonicals por URL.
- `robots.txt` con bloqueo de `/app/`.
- `sitemap.xml` con portada, secciones, rubros, legales y blog.
- Paginas creadas para intencion de busqueda:
  - `/sistema-de-ventas/`
  - `/control-de-stock/`
  - `/sistema-de-caja/`
  - `/software-para-kioscos/`
  - `/software-para-tiendas/`
  - `/software-para-servicio-tecnico/`
  - `/gestion-de-clientes/`
  - `/multi-sucursal/`
  - `/funciones/`
  - `/precios/`
  - `/preguntas-frecuentes/`
- Paginas legales:
  - `/privacidad/`
  - `/terminos/`
- Blog inicial:
  - `blog/como-controlar-stock/`
  - `blog/cierre-de-caja-correcto/`
  - `blog/importar-productos-desde-excel/`
- CTA comerciales claros:
  - probar gratis
  - iniciar sesion
  - ver demo
  - WhatsApp
- Comparativa contra Excel/cuaderno en portada.
- Capturas descriptivas para compartir y reforzar contenido.
- Datos estructurados:
  - `WebApplication`
  - `Organization`
  - `FAQPage` donde corresponde
  - `BreadcrumbList` en subpaginas
  - `BlogPosting` en articulos
- Oferta sin precio falso en schema.
- Landing publica sin cargar el codigo completo de la app.
- Modulo descargable de plantilla para importacion:
  - `/plantilla-productos-pclaf-control.csv`
- Eventos listos para GA4 si se define `PCLAF_GA4_ID`:
  - header login
  - header signup
  - hero trial
  - hero demo
  - WhatsApp
  - footer CTA
  - solicitud de demo
  - descarga de plantilla

## Pendiente fuera del codigo

- Configurar Google Search Console y enviar sitemap.
- Configurar GA4 real con `PCLAF_GA4_ID`.
- Medir Core Web Vitals reales en produccion.
- Definir redireccion canonica final si se usa `www` como unica version.
- Preparar `app.pclafcontrol.com.ar` si mas adelante se quiere separar por subdominio en vez de `/app/`.
- Agregar testimonios reales y casos de exito reales.
- Subir videos/demo reales.
- Conseguir enlaces externos legitimos.

## Riesgos o puntos a vigilar

- GitHub Pages sirve para la web publica, pero si despues se necesita mas control de redirects, headers o subdominios de app, puede convenir Cloudflare Pages o un reverse proxy delante.
- La parte SEO/comercial ya puede salir bien desde HTML estatico, pero conversiones y posicionamiento reales dependen de Search Console, Analytics, velocidad real y contenido vivo.
- No conviene prometer funcionalidades publicas que aun no esten estables dentro de la aplicacion.

## Recomendacion de salida

1. Publicar la nueva portada estatica.
2. Verificar en Search Console:
   - portada
   - funciones
   - precios
   - sistema-de-ventas
   - control-de-stock
3. Activar GA4.
4. Medir clics reales en:
   - Probar gratis
   - Iniciar sesion
   - WhatsApp
   - Solicitar demo
5. Recien despues ajustar copy segun datos reales.
