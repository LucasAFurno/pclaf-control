# Notificaciones de PCLAF Control

Los webhooks, tokens y credenciales se configuran exclusivamente en procesos server-side o GitHub Actions. No se exponen al navegador ni se escriben en logs.

## Eventos y procesos activos

- **Deploys:** inicio, exito, fallo y rollback mediante `npm run notify:deploy` y el workflow de Cloud Run.
- **Resumen:** metricas disponibles de Supabase mediante `npm run notify:summary` y **Notify Daily Summary**, a las 12:15 UTC. Telegram recibe el mismo resumen solo cuando esta habilitado.
- **Seguridad:** reemplazo de certificado fiscal sin certificado, clave, token ni CUIT completo.

## Backups

**Backups externos pendientes hasta contratar Supabase Pro.**

No hay cron, workflow ni almacenamiento externo de backups habilitados. No se deben configurar `BACKUP_DATABASE_URL`, `BACKUP_GCS_BUCKET`, `BACKUP_GCS_PREFIX` ni `BACKUP_RETENTION_DAYS` por ahora. `fiscal-server/scripts/backup-postgres.mjs` y `tools/setup-backup-gcs.ps1` se conservan únicamente como herramientas futuras y no se ejecutan automáticamente.

El resumen diario omite el estado del ultimo backup mientras no haya un bucket configurado.

## Ejecucion manual de notificaciones

```powershell
npm run notify:deploy -- success --environment=production --version=v1.2.3 --commit=abc123
npm run notify:summary
```

Para lanzar el resumen desde GitHub: **Actions -> Notify Daily Summary -> Run workflow**.
