# Auditoria tecnica PCLAF Control

Fecha: 2026-07-19

## Estado real hoy

La base cloud ya opera con:

- Supabase Postgres
- RLS en tablas core
- login cloud con `pin_hash`
- sesiones propias por `control_user_sessions`
- dominio productivo y mail transaccional funcionando

La version local ahora guarda PIN con hash y salt, no en texto plano.

## Lo que ya quedo endurecido

- La sesion web propia se guarda en `sessionStorage`, no en `localStorage`.
- El frontend publica CSP, `Permissions-Policy`, `referrer-policy` y bloqueo de `frame-ancestors`.
- La version local migra PIN legacy a hash automaticamente.
- SQLite local ya persiste `pin_hash`, `pin_salt` y `pin_hash_version`.
- El login cloud valida contra `pin_hash` en Supabase.

## Riesgos que siguen abiertos

### 1. RPC publicas con `security definer`

Hoy la app usa varias RPC publicas ejecutables por `anon`:

- `app_setup_instance`
- `app_public_sign_in`
- `app_public_restore_session`
- `app_public_session_context`
- `app_public_upsert_user`
- `app_public_upsert_customer`
- varias de ventas, caja, compras y documentos

Esto funciona porque la web entra con publishable key + token de sesion propio.

No es un agujero automatico, pero si alguien encuentra un fallo en una RPC con `security definer`, el impacto puede ser alto.

### 2. Falta separar permisos finos por modulo/accion

Hoy hay roles base, pero todavia conviene bajar a permisos mas precisos:

- ver
- crear
- editar
- eliminar
- exportar
- administrar usuarios

### 3. Falta flujo fuerte para produccion multi-cliente

Antes de venderlo en serio conviene cerrar:

- pack por comercio
- trial con vencimiento
- bloqueo por suscripcion vencida
- alta de empleados con permisos parciales
- importacion masiva validada

### 4. Falta cobertura automatizada

Hoy no hay una suite fuerte de pruebas end-to-end ni de regresion para:

- login
- crear comercio
- ventas
- caja
- comprobantes
- permisos

## Veredicto

### Se puede mostrar a clientes?

Si.

### Se puede probar con clientes reales?

Si, con comercios piloto chicos y controlados.

### Lo largaria como producto abierto y escalable ya mismo?

Todavia no.

## Para dejarlo listo de verdad

1. Mover la capa critica a permisos mas finos por accion.
2. Revisar una por una las RPC `security definer` y dejar solo las indispensables.
3. Agregar trials, estado de suscripcion y bloqueo comercial.
4. Crear importador Excel/CSV con preview y validaciones.
5. Agregar pruebas end-to-end minimas de acceso, alta, venta, caja y comprobantes.
