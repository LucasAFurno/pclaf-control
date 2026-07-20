# Auditoria tecnica PCLAF Control

Fecha: 2026-07-20

## Estado general

- Frontend web productivo con HTML, CSS y JavaScript vanilla compilado a `app.js`.
- Backend real en Supabase con tablas core, sesiones propias, RLS activa y RPC publicas.
- Dominio web productivo separado.
- `Mi admin` ya funciona como consola PCLAF separada del admin operativo del comercio.

## Lo que esta bien

- Todas las tablas del schema `public` tienen RLS activa.
- La web publica no depende de `localStorage` para guardar operacion del comercio.
- El panel operativo usa base real de Supabase para clientes, ventas, caja, productos, compras, tickets y comprobantes.
- `Mi admin` tiene seguimiento por comercio con:
  - pack
  - estado
  - estado de cobro
  - alta publica
  - responsable PCLAF
  - seguimiento
  - etiqueta interna
  - nota comercial
  - nota de cobro
- Las RPC de plataforma quedaron endurecidas para que no esten expuestas tambien al rol `authenticated`.

## Riesgos reales hoy

### 1. Seguridad de RPC publicas

El mayor punto delicado hoy es la arquitectura basada en RPC `SECURITY DEFINER` publicas.

Aunque cada RPC valida `session_token` y contexto interno, Supabase sigue marcando como advertencia que muchas funciones pueden ejecutarse desde `anon`.

Esto no significa automaticamente que esten rotas, pero si significa que:

- la seguridad depende mucho de la validacion interna de cada funcion
- cualquier error de validacion dentro de una RPC puede abrir una via seria
- todavia no es una arquitectura tan robusta como una capa backend privada intermedia

### 2. Password security

- Supabase informa que la proteccion contra contrasenas filtradas esta desactivada.
- Conviene activarla antes de abrir mas cuentas reales.

### 3. Performance de base

Hay muchas foreign keys sin indice de cobertura.

No es el problema numero uno para seguridad, pero si para escalar:

- ventas
- caja
- movimientos
- comprobantes
- stock
- auditoria

Cuando empiecen a usarlo varios comercios al mismo tiempo, esto puede sentirse.

### 4. Permisos finos aun no terminados

El modelo actual ya separa bastante por rol y comercio, pero todavia falta cerrar mejor:

- permisos por accion dentro de cada modulo
- permisos por usuario empleado tipo "solo caja", "solo ventas", "solo productos"
- limites comerciales por pack a nivel plataforma

## Apto para vender hoy

### Si

Es viable para:

- demo real con clientes
- pilotos controlados
- comercios chicos o medianos en etapa de prueba
- preventa o beta paga con soporte cercano

### Todavia no como version final blindada

No lo venderia todavia como:

- sistema totalmente endurecido
- solucion enterprise
- producto cerrado sin supervision

## Prioridad recomendada

### Prioridad alta

1. Revisar una por una las RPC `SECURITY DEFINER` publicas y dejar documentado:
   - cuales deben seguir en `anon`
   - cuales deben pasar a otra capa
   - cuales se pueden cerrar mas
2. Activar leaked password protection.
3. Completar permisos finos por modulo y accion para empleados.
4. Terminar de unificar layout roto en modulos grandes.

### Prioridad media

1. Indexar foreign keys criticas.
2. Agregar auditoria visible de acciones sensibles:
   - alta y baja de usuarios
   - cambios de pack
   - bloqueo de comercios
   - edicion de comprobantes
3. Importacion masiva de productos por Excel/CSV con preview y validacion.

## Conclusion

PCLAF Control ya esta en una etapa util y real, no en maqueta.

Hoy esta bien para trabajar demos, pruebas y primeras implementaciones cuidadas.

Para venderlo como producto serio y dormir tranquilo, todavia falta una ronda mas de endurecimiento sobre:

- RPC publicas
- permisos finos
- performance de base
- auditoria operativa
