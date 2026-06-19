import {
  Timestamp,
  GeoPoint,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "../config/firebase.js";

export const BACKUP_VERSION = "1.0";
export const BACKUP_APPLICATION = "Paraíso Escondido";
export const BACKUP_VENUE_ID = "paraiso-escondido";

export const backupRootCollections = [
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
const batchLimit = 450;
const replaceProtectedCollections = new Set(["users"]);
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

const safeTimestamp = (date = new Date()) => date.toISOString().replace(/[:.]/g, "-");

const backupTypeFolder = {
  manual: "manual",
  automatic: "automatic",
  pre_restore: "pre-restore",
};

export const buildBackupFileName = (type, createdAt = new Date().toISOString()) => {
  const label = type === "automatic" ? "automatico" : type === "pre_restore" ? "pre-restauracion" : "manual";
  return `paraiso-escondido-${label}-${safeTimestamp(new Date(createdAt))}.json`;
};

export const formatBytes = (bytes = 0) => new Intl.NumberFormat("es-PY").format(Number(bytes || 0));

export const serializeFirestoreValue = (value) => {
  if (value === undefined) return null;
  if (value === null) return null;
  if (value instanceof Timestamp) {
    return {
      __type: "timestamp",
      seconds: value.seconds,
      nanoseconds: value.nanoseconds,
      iso: value.toDate().toISOString(),
    };
  }
  if (value instanceof Date) {
    return { __type: "date", iso: value.toISOString() };
  }
  if (value instanceof GeoPoint) {
    return { __type: "geoPoint", latitude: value.latitude, longitude: value.longitude };
  }
  if (typeof value === "object" && value?.path && value?.firestore) {
    return { __type: "documentReference", path: value.path };
  }
  if (Array.isArray(value)) return value.map(serializeFirestoreValue);
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !sensitiveKeys.has(String(key).trim()))
        .map(([key, entry]) => [key, serializeFirestoreValue(entry)]),
    );
  }
  return value;
};

export const restoreFirestoreValue = (value) => {
  if (Array.isArray(value)) return value.map(restoreFirestoreValue);
  if (!value || typeof value !== "object") return value;
  if (value.__type === "timestamp") return new Timestamp(Number(value.seconds || 0), Number(value.nanoseconds || 0));
  if (value.__type === "date") return value.iso || null;
  if (value.__type === "geoPoint") return new GeoPoint(Number(value.latitude), Number(value.longitude));
  if (value.__type === "documentReference" && value.path) return doc(db, value.path);
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, restoreFirestoreValue(entry)]));
};

const readCollection = async (collectionPath) => {
  const snapshot = await getDocs(collection(db, collectionPath));
  return snapshot.docs.map((documentSnapshot) => ({
    id: documentSnapshot.id,
    path: documentSnapshot.ref.path,
    data: serializeFirestoreValue(documentSnapshot.data()),
  }));
};

export const getBackupCollectionPaths = async () => {
  const paths = [...backupRootCollections];
  const venuesSnapshot = await getDocs(collection(db, "venues"));
  venuesSnapshot.docs.forEach((venueDoc) => {
    venueSubcollections.forEach((subcollection) => {
      paths.push(`venues/${venueDoc.id}/${subcollection}`);
    });
  });
  return [...new Set(paths)];
};

export const buildBackupJson = async ({ type = "manual", actor = {}, environment = "production" } = {}) => {
  const createdAt = new Date().toISOString();
  const collections = {};
  const errors = {};
  let documentCount = 0;
  const paths = await getBackupCollectionPaths();

  await Promise.all(
    paths.map(async (collectionPath) => {
      try {
        const documents = await readCollection(collectionPath);
        collections[collectionPath] = documents;
        documentCount += documents.length;
      } catch (error) {
        errors[collectionPath] = error?.message || "No se pudo leer la colección.";
        collections[collectionPath] = [];
      }
    }),
  );

  return {
    backupVersion: BACKUP_VERSION,
    application: BACKUP_APPLICATION,
    venueId: BACKUP_VENUE_ID,
    type,
    createdAt,
    createdBy: {
      uid: actor.uid || "",
      name: actor.name || actor.email || "Sistema",
      email: actor.email || "",
    },
    environment,
    documentCount,
    collections,
    errors,
    storageScope:
      "Los backups JSON incluyen datos y referencias de archivos. Los comprobantes permanecen almacenados en Firebase Storage.",
  };
};

const blobFromBackup = (backup) => new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });

export const saveBackupToStorage = async (backup) => {
  const fileName = buildBackupFileName(backup.type, backup.createdAt);
  const blob = blobFromBackup(backup);
  const storagePath = `backups/paraiso-escondido/${backupTypeFolder[backup.type] || "manual"}/${fileName}`;
  await uploadBytes(ref(storage, storagePath), blob, { contentType: "application/json" });
  const downloadUrl = await getDownloadURL(ref(storage, storagePath));
  const metadataRef = doc(collection(db, "backups"));
  const metadata = {
    id: metadataRef.id,
    type: backup.type,
    status: backup.documentCount > 0 && Object.keys(backup.errors || {}).length === 0 ? "success" : "failed",
    createdAt: Timestamp.fromDate(new Date(backup.createdAt)),
    createdBy: backup.createdBy.uid,
    createdByName: backup.createdBy.name,
    createdByEmail: backup.createdBy.email,
    fileName,
    storagePath,
    downloadUrl,
    documentCount: backup.documentCount,
    sizeBytes: blob.size,
    backupVersion: backup.backupVersion,
    application: backup.application,
    venueId: backup.venueId,
    collections: Object.fromEntries(Object.entries(backup.collections).map(([key, docs]) => [key, docs.length])),
    errorMessage: Object.keys(backup.errors || {}).length ? JSON.stringify(backup.errors) : "",
  };
  await setDoc(metadataRef, metadata);
  return { metadata, blob, fileName };
};

export const createBackup = async ({ type = "manual", actor, logActivity } = {}) => {
  const backup = await buildBackupJson({ type, actor });
  const saved = await saveBackupToStorage(backup);
  await logActivity?.(
    type === "pre_restore" ? "Backup preventivo creado" : type === "automatic" ? "Backup automático creado" : "Backup manual creado",
    `${saved.metadata.documentCount} documentos · ${saved.metadata.fileName}`,
  );
  return { backup, ...saved };
};

export const subscribeBackups = (onNext, onError) =>
  onSnapshot(
    query(collection(db, "backups"), orderBy("createdAt", "desc"), limit(60)),
    (snapshot) => onNext(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))),
    (error) => onError(error?.message || "No se pudieron cargar los backups."),
  );

export const subscribeAutomaticBackupConfig = (onNext, onError) =>
  onSnapshot(
    doc(db, "settings", "backupAutomatic"),
    (snapshot) => onNext(snapshot.exists() ? snapshot.data() : null),
    (error) => onError(error?.message || "No se pudo consultar el backup automático."),
  );

export const getBackupDownloadUrl = async (backup) => {
  if (backup.downloadUrl) return backup.downloadUrl;
  if (!backup.storagePath) throw new Error("Este backup no tiene archivo asociado.");
  return getDownloadURL(ref(storage, backup.storagePath));
};

export const validateBackupJson = (value) => {
  if (!value || typeof value !== "object") throw new Error("El archivo no es un JSON válido.");
  if (value.backupVersion !== BACKUP_VERSION) throw new Error("Versión de backup no soportada.");
  if (value.application !== BACKUP_APPLICATION) throw new Error("El backup no corresponde a Paraíso Escondido.");
  if (!value.collections || typeof value.collections !== "object") throw new Error("El backup no contiene colecciones.");
  return value;
};

const writeBatchSafely = async (operations) => {
  for (let index = 0; index < operations.length; index += batchLimit) {
    const batch = writeBatch(db);
    operations.slice(index, index + batchLimit).forEach((operation) => operation(batch));
    await batch.commit();
  }
};

export const restoreBackupJson = async ({ backup, mode = "merge", actor, logActivity } = {}) => {
  const validated = validateBackupJson(backup);
  const preRestore = await createBackup({ type: "pre_restore", actor, logActivity });
  if (!preRestore?.metadata?.storagePath) throw new Error("No se pudo crear el backup preventivo.");

  const entries = Object.entries(validated.collections);
  const deleteOperations = [];
  const writeOperations = [];
  const failed = [];

  for (const [collectionPath, documents] of entries) {
    if (!Array.isArray(documents)) continue;
    if (mode === "replace" && !replaceProtectedCollections.has(collectionPath)) {
      try {
        const currentSnapshot = await getDocs(collection(db, collectionPath));
        currentSnapshot.docs.forEach((item) => deleteOperations.push((batch) => batch.delete(item.ref)));
      } catch (error) {
        failed.push({ collectionPath, error: error?.message || "No se pudo preparar reemplazo." });
      }
    }
    documents.forEach((item) => {
      const targetPath = item.path || `${collectionPath}/${item.id}`;
      writeOperations.push((batch) => batch.set(doc(db, targetPath), restoreFirestoreValue(item.data), { merge: mode === "merge" }));
    });
  }

  if (mode === "replace") await writeBatchSafely(deleteOperations);
  await writeBatchSafely(writeOperations);

  await logActivity?.(
    "Backup restaurado",
    `${validated.createdAt || "sin fecha"} · ${writeOperations.length} documentos · modo ${mode}`,
  );

  return {
    created: writeOperations.length,
    updated: writeOperations.length,
    failed,
    preRestoreBackup: preRestore.metadata,
  };
};
