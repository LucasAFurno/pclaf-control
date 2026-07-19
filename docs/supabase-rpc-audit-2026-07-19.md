# Auditoria RPC publicas - 2026-07-19

## Estado actual

La web publica ya opera contra Supabase con RPC de acceso comercial. El riesgo principal no esta en que las funciones existan, sino en que algunas quedaron demasiado abiertas para `anon` o `authenticated`.

## RPC revisadas

- `app_get_setup_status`
  - Uso: validar si una instancia/comercio ya fue creada.
  - Exposicion aceptable para onboarding.

- `app_setup_instance`
  - Uso: alta autonoma del comercio inicial.
  - Debe seguir publica, pero con validaciones estrictas y rate-limit desde Auth/SMTP.

- `app_public_sign_in`
  - Uso: login comercial por correo o identificador.
  - Debe seguir publica.

- `app_public_restore_session`
  - Uso: restaurar sesion cloud desde token de sesion propio.
  - Debe seguir publica mientras exista el flujo de sesion actual.

- `app_public_sign_out`
  - Uso: invalidar token de sesion comercial.
  - Debe seguir publica.

- `app_public_request_password_reset`
  - Uso: iniciar recuperacion de acceso.
  - Debe seguir publica.

- `app_public_export_snapshot`
  - Uso: leer snapshot cloud.
  - Sigue siendo una deuda tecnica porque expone la arquitectura legacy de snapshot. Conviene migrar por completo a tablas core y luego retirarla.

- `app_public_save_snapshot`
  - Uso: escribir snapshot cloud.
  - Misma deuda tecnica que export snapshot.

- `app_public_session_context`
  - Uso: helper interno para otras RPC `security definer`.
  - No deberia estar expuesta para ejecucion directa.
  - Se agrega migracion para revocar `execute` a `anon` y `authenticated`.

- `app_public_update_commerce_profile`
  - Uso: editar perfil del comercio.
  - Correcta si valida sesion y propietario.

- `app_public_upsert_customer`
  - Uso: alta y edicion de clientes.
  - Correcta si valida sesion y alcance de comercio.

- `app_public_upsert_user`
  - Uso: alta y edicion de usuarios internos.
  - Debe quedar reservada a administrador o propietario.

- `app_public_toggle_user_active`
  - Uso: activar y desactivar usuarios internos.
  - Debe quedar reservada a administrador o propietario.

- `app_public_upsert_product`
  - Uso: alta y edicion de productos.
  - Correcta si valida sesion y comercio.

- `app_public_open_cash_session`
  - Uso: apertura de caja.
  - Debe validar rol/caja/asignacion.

- `app_public_close_cash_session`
  - Uso: cierre de caja.
  - Debe validar rol/caja/asignacion.

- `app_public_create_cash_movement`
  - Uso: movimientos manuales de caja.
  - Debe validar rol y caja abierta.

- `app_public_create_sale`
  - Uso: registrar venta.
  - Debe validar stock, caja y alcance del usuario.

- `app_public_upsert_branch`
  - Uso: crear y editar sucursales.
  - Debe quedar para administrador o propietario.

- `app_public_upsert_register`
  - Uso: crear y editar cajas.
  - Debe quedar para administrador o propietario.

- `app_public_upsert_supplier`
  - Uso: crear y editar proveedores.
  - Correcta si valida sesion y comercio.

- `app_public_upsert_purchase_receipt`
  - Uso: compras y recepcion de stock.
  - Debe validar rol y alcance.

- `app_public_upsert_document`
  - Uso: comprobantes comerciales.
  - Debe validar rol y sucursal.

## Cambio preparado

Archivo SQL:

- `supabase/2026-07-19-rpc-hardening-audit.sql`

Accion:

- revoca `execute` directo sobre `app_public_session_context(text)` para `anon` y `authenticated`

## Siguiente endurecimiento recomendado

1. Retirar snapshot cloud publico cuando la web quede 100% sobre tablas core.
2. Mover permisos por accion a backend, no solo al front.
3. Agregar rate-limit y trazabilidad a login, recovery y signup.
4. Registrar intentos fallidos y bloqueo temporal por abuso.
