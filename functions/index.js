const admin = require("firebase-admin");
const { onSchedule } = require("firebase-functions/v2/scheduler");

admin.initializeApp();

const db = admin.firestore();
const bucket = admin.storage().bucket();

const BACKUP_VERSION = "1.0";
const APPLICATION = "Paraíso Escondido";
const VENUE_ID = "paraiso-escondido";
const ENVIRONMENT = "production";
const RETENTION_COUNT = 30;

const rootCollections = [
  "reservations",
  "expenses",
  "tasks",
  "clients",
  "users",
  "activityLog",
  "settings",
  "venues",
  "blockedDates",
  "pricingRules",
];

const venueSubcollections = ["sections", "publicContent", "tasks"];
const sensitiveKeys = new Set([
  "password",
  "pass",
  "contraseña",
  "contrasena",
  "secret",
  "token",
  "cookie",
  "session",
  "apiKey",
  "privateKey",
  "serviceAccount",
]);

function safeIsoFilePart(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function buildFileName(type, date = new Date()) {
  const suffix = type === "automatic" ? "automatico" : type;
  return `paraiso-escondido-${suffix}-${safeIsoFilePart(date)}.json`;
}

function storageFolder(type) {
  if (type === "automatic") return "automatic";
  if (type === "pre_restore") return "pre-restore";
  return "manual";
}

function serializeValue(value) {
  if (value === undefined) return null;
  if (value === null) return null;
  if (value instanceof admin.firestore.Timestamp) {
    return { __type: "timestamp", value: value.toDate().toISOString() };
  }
  if (value instanceof admin.firestore.DocumentReference) {
    return { __type: "documentReference", path: value.path };
  }
  if (value instanceof admin.firestore.GeoPoint) {
    return { __type: "geoPoint", latitude: value.latitude, longitude: value.longitude };
  }
  if (value instanceof Date) {
    return { __type: "date", value: value.toISOString() };
  }
  if (Array.isArray(value)) return value.map(serializeValue);
  if (typeof value === "object") {
    return Object.entries(value).reduce((acc, [key, item]) => {
      if (sensitiveKeys.has(String(key).trim())) return acc;
      acc[key] = serializeValue(item);
      return acc;
    }, {});
  }
  return value;
}

async function getCollectionPaths() {
  const paths = [...rootCollections];
  const venuesSnapshot = await db.collection("venues").get();

  venuesSnapshot.docs.forEach((venueDoc) => {
    venueSubcollections.forEach((subcollection) => {
      paths.push(`venues/${venueDoc.id}/${subcollection}`);
    });
  });

  return paths;
}

async function exportCollection(path) {
  const snapshot = await db.collection(path).get();
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    path: doc.ref.path,
    data: serializeValue(doc.data()),
  }));
}

async function createBackup(type = "automatic") {
  const startedAt = new Date();
  const nextRunAt = new Date(startedAt);
  nextRunAt.setDate(nextRunAt.getDate() + 1);
  nextRunAt.setHours(3, 0, 0, 0);
  const fileName = buildFileName(type, startedAt);
  const storagePath = `backups/${VENUE_ID}/${storageFolder(type)}/${fileName}`;
  const collections = {};
  let documentCount = 0;
  const errors = [];

  const paths = await getCollectionPaths();

  for (const path of paths) {
    try {
      const documents = await exportCollection(path);
      collections[path] = documents;
      documentCount += documents.length;
    } catch (error) {
      errors.push({ collection: path, message: error.message });
      collections[path] = [];
    }
  }

  const backup = {
    backupVersion: BACKUP_VERSION,
    application: APPLICATION,
    venueId: VENUE_ID,
    createdAt: startedAt.toISOString(),
    createdBy: {
      uid: "system",
      name: "Backup automático",
      email: "",
    },
    environment: ENVIRONMENT,
    type,
    status: errors.length ? "failed" : "success",
    documentCount,
    collections,
    errors,
    storageScope:
      "Incluye datos Firestore y referencias a archivos. No incluye físicamente comprobantes, imágenes ni PDFs de Storage.",
  };

  const content = Buffer.from(JSON.stringify(backup, null, 2), "utf8");
  await bucket.file(storagePath).save(content, {
    contentType: "application/json; charset=utf-8",
    metadata: {
      cacheControl: "private, max-age=0, no-store",
    },
  });

  const metadataRef = db.collection("backups").doc();
  await metadataRef.set({
    id: metadataRef.id,
    type,
    status: backup.status,
    createdAt: admin.firestore.Timestamp.fromDate(startedAt),
    createdBy: "system",
    createdByUid: "system",
    createdByName: "Backup automático",
    createdByEmail: "",
    fileName,
    storagePath,
    downloadUrl: "",
    documentCount,
    sizeBytes: content.byteLength,
    backupVersion: BACKUP_VERSION,
    application: APPLICATION,
    venueId: VENUE_ID,
    collections: Object.fromEntries(Object.entries(collections).map(([key, docs]) => [key, docs.length])),
    errorMessage: errors.length ? JSON.stringify(errors) : "",
  });

  await db.collection("activityLog").add({
    action: errors.length ? "Backup automático fallido" : "Backup automático creado",
    detail: errors.length
      ? `No se completó el backup automático diario. Errores: ${errors.length}.`
      : `Se completó el backup automático diario con ${documentCount} documentos.`,
    date: startedAt.toISOString(),
    user: "system",
    userName: "Sistema",
    userRole: "admin",
    createdAt: admin.firestore.Timestamp.fromDate(startedAt),
  });

  await db.collection("settings").doc("backupAutomatic").set(
    {
      status: errors.length ? "error" : "active",
      enabled: !errors.length,
      frequency: "Diaria",
      retentionDays: 30,
      retentionCount: RETENTION_COUNT,
      lastRunAt: admin.firestore.Timestamp.fromDate(startedAt),
      lastSuccessAt: errors.length ? null : admin.firestore.Timestamp.fromDate(startedAt),
      lastStatus: backup.status,
      lastBackupId: metadataRef.id,
      lastDocumentCount: documentCount,
      nextRunEstimate: "Diaria según Cloud Scheduler",
      nextRunAt: admin.firestore.Timestamp.fromDate(nextRunAt),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await applyAutomaticRetention();

  return { id: metadataRef.id, documentCount, sizeBytes: content.byteLength, status: backup.status };
}

async function applyAutomaticRetention() {
  const snapshot = await db
    .collection("backups")
    .where("type", "==", "automatic")
    .orderBy("createdAt", "desc")
    .get();

  const oldBackups = snapshot.docs.slice(RETENTION_COUNT);
  await Promise.all(
    oldBackups.map(async (doc) => {
      const backup = doc.data();
      if (backup.storagePath) {
        await bucket.file(backup.storagePath).delete({ ignoreNotFound: true });
      }
      await doc.ref.delete();
      await db.collection("activityLog").add({
        action: "Backup automático eliminado",
        detail: `Se eliminó por retención automática: ${backup.fileName || doc.id}.`,
        date: new Date().toISOString(),
        user: "system",
        userName: "Sistema",
        userRole: "admin",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }),
  );
}

exports.createAutomaticBackup = onSchedule(
  {
    schedule: "every day 03:00",
    timeZone: "America/Asuncion",
    region: "us-central1",
  },
  async () => createBackup("automatic"),
);
