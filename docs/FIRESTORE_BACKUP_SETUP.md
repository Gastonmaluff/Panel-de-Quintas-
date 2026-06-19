# Backup nativo de Firestore - Paraíso Escondido

Proyecto Firebase: `panel-de-quintas`

Base de datos: `(default)`

Aplicación: Paraíso Escondido

## Alcance

Los backups nativos de Firestore son administrados por Firebase / Google Cloud. No dependen del panel web y se restauran desde herramientas administrativas de Google Cloud.

El módulo web muestra el estado real solo si existe metadata verificada en `settings/backupAutomatic.nativeFirestore`. No debe marcarse como activo manualmente sin haber confirmado la configuración.

Además del backup nativo, este proyecto incluye una Cloud Function programada:

- Función: `createAutomaticBackup`
- Frecuencia: todos los días a las 03:00
- Zona horaria: `America/Asuncion`
- Salida: JSON en Firebase Storage bajo `backups/paraiso-escondido/automatic/`
- Metadata: colección `backups`
- Estado operativo: documento `settings/backupAutomatic`
- Retención: últimos 30 backups automáticos

Esta función exporta datos Firestore y referencias a archivos. No copia físicamente comprobantes, imágenes ni PDFs de Firebase Storage.

## Requisitos

- Proyecto con facturación habilitada si Google Cloud lo requiere.
- Permisos IAM suficientes para administrar schedules/backups de Firestore.
- Firebase CLI o Google Cloud CLI autenticado contra `panel-de-quintas`.
- No ejecutar comandos destructivos desde el panel web.

## Configuración sugerida

Frecuencia: diaria

Retención: 30 días

Base de datos: `(default)`

Ubicación: la misma región configurada para Firestore en el proyecto.

## Verificar proyecto activo

```bash
gcloud config set project panel-de-quintas
gcloud config get-value project
```

## Consultar base de datos

```bash
gcloud firestore databases describe --database="(default)"
```

## Listar schedules/backups

La disponibilidad exacta de comandos depende de la versión de Google Cloud CLI y de la API habilitada en el proyecto. Usar la documentación actual de Firestore Scheduled Backups para el comando vigente.

```bash
gcloud firestore backups schedules list --database="(default)"
gcloud firestore backups list --database="(default)"
```

## Crear schedule diario

Ejemplo orientativo. Validar contra la documentación vigente antes de ejecutar:

```bash
gcloud firestore backups schedules create \
  --database="(default)" \
  --recurrence=daily \
  --retention=30d
```

## Restauración nativa

La restauración nativa se realiza desde Google Cloud. Antes de restaurar:

1. Confirmar fecha y base de datos del backup.
2. Exportar un backup JSON desde el panel si el sistema sigue operativo.
3. Validar impacto sobre datos productivos.
4. Ejecutar restauración desde la herramienta administrativa correspondiente.

## Metadata para mostrar en el panel

Después de verificar la configuración real, un administrador puede guardar metadata en:

`settings/backupAutomatic.nativeFirestore`

Campos sugeridos:

```json
{
  "status": "active",
  "frequency": "Diaria",
  "retention": "30 días",
  "database": "(default)",
  "lastBackupAt": "timestamp o ISO",
  "nextBackupEstimate": "Diaria según schedule nativo"
}
```

No guardar credenciales, tokens, claves de servicio ni secretos en Firestore.

## Deploy de la función automática JSON

Validar primero el proyecto activo:

```bash
firebase use
```

Deploy recomendado:

```bash
firebase deploy --only functions:createAutomaticBackup,firestore:rules,storage
```

Si el proyecto no tiene permisos o facturación suficiente para Cloud Scheduler / Functions, el panel debe mostrar el backup automático como no configurado o con error, según la metadata real.
