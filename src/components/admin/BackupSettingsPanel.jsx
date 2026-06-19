import { useEffect, useMemo, useRef, useState } from "react";
import {
  createBackup,
  formatBytes,
  getBackupCollectionPaths,
  getBackupDownloadUrl,
  restoreBackupJson,
  subscribeAutomaticBackupConfig,
  subscribeBackups,
  validateBackupJson,
} from "../../services/backupService.js";
import { useAuth } from "../../auth/AuthProvider.jsx";
import { ROLES } from "../../auth/permissions.js";

const statusLabel = {
  success: "Correcto",
  failed: "Error",
  error: "Error",
  running: "En proceso",
};

function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateTime(value) {
  const date = toDate(value);
  return date ? date.toLocaleString("es-PY") : "Sin dato";
}

function formatDateTimeOrText(value) {
  const date = toDate(value);
  if (date) return date.toLocaleString("es-PY");
  return typeof value === "string" && value.trim() ? value : "Sin dato";
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

async function downloadBackup(backup, logActivity) {
  const url = await getBackupDownloadUrl(backup);
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("No se pudo descargar el archivo.");
    downloadBlob(await response.blob(), backup.fileName || "paraiso-escondido-backup.json");
  } catch (error) {
    console.error("Backup download fallback", error);
    window.open(url, "_blank", "noopener,noreferrer");
  }
  await logActivity?.("Backup JSON descargado", backup.fileName || backup.id);
}

function getConfigDate(config, keys) {
  return keys.map((key) => config?.[key]).find(Boolean) || null;
}

function BackupSubsection({ children, isOpen, onToggle, title, summary }) {
  return (
    <section className="backup-subsection">
      <button className="backup-subsection__header" onClick={onToggle} type="button" aria-expanded={isOpen}>
        <span>
          <strong>{title}</strong>
          {summary ? <small>{summary}</small> : null}
        </span>
        <i aria-hidden="true" />
      </button>
      {isOpen ? <div className="backup-subsection__body">{children}</div> : null}
    </section>
  );
}

function BackupList({ backups, logActivity }) {
  if (!backups.length) return <p className="admin-empty-note">Todavía no hay backups para mostrar.</p>;
  return (
    <div className="backup-list">
      {backups.map((backup) => (
        <article className="backup-card" key={backup.id}>
          <div>
            <small>{formatDateTime(backup.createdAt)}</small>
            <strong>{backup.fileName || "Backup sin archivo"}</strong>
            <p>
              Usuario: {backup.createdByName || backup.createdByEmail || "Sistema"} · Documentos:{" "}
              {backup.documentCount || 0} · Tamaño: {formatBytes(backup.sizeBytes)} bytes
            </p>
          </div>
          <div className="backup-card__actions">
            <span className={`backup-status backup-status--${backup.status || "failed"}`}>
              {statusLabel[backup.status] || backup.status || "Sin estado"}
            </span>
            {backup.storagePath || backup.downloadUrl ? (
              <button type="button" onClick={() => downloadBackup(backup, logActivity)}>
                Descargar JSON
              </button>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}

function RestoreSummary({ backup }) {
  const collections = Object.entries(backup.collections || {});
  return (
    <div className="restore-summary">
      <h4>Resumen previo</h4>
      <p>Fecha del backup: {backup.createdAt || "Sin dato"}</p>
      <p>Usuario: {backup.createdBy?.name || backup.createdBy?.email || "Sin dato"}</p>
      <div className="backup-summary-grid">
        <span><small>Documentos</small><strong>{backup.documentCount || 0}</strong></span>
        <span><small>Colecciones</small><strong>{collections.length}</strong></span>
        <span><small>Versión</small><strong>{backup.backupVersion}</strong></span>
      </div>
      <div className="restore-collections">
        {collections.map(([name, docs]) => (
          <span key={name}>{name}: {Array.isArray(docs) ? docs.length : 0}</span>
        ))}
      </div>
    </div>
  );
}

export default function BackupSettingsPanel({ logActivity }) {
  const { profile, user, role } = useAuth();
  const fileInputRef = useRef(null);
  const canManageBackups = role === ROLES.admin;
  const [isOpen, setIsOpen] = useState(false);
  const [openSections, setOpenSections] = useState({ automatic: false, manual: true, restore: false });
  const [backups, setBackups] = useState([]);
  const [backupError, setBackupError] = useState("");
  const [automaticConfig, setAutomaticConfig] = useState(null);
  const [automaticError, setAutomaticError] = useState("");
  const [message, setMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [restoreBackup, setRestoreBackup] = useState(null);
  const [restoreMode, setRestoreMode] = useState("merge");
  const [restoreConfirmText, setRestoreConfirmText] = useState("");
  const [isRestoreConfirmOpen, setIsRestoreConfirmOpen] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [collectionPaths, setCollectionPaths] = useState([]);

  const actor = useMemo(
    () => ({
      uid: user?.uid || "",
      email: user?.email || "",
      name: profile?.name || user?.email || "Usuario",
    }),
    [profile?.name, user?.email, user?.uid],
  );

  useEffect(() => {
    if (!canManageBackups) return undefined;
    const unsubscribeBackups = subscribeBackups(setBackups, setBackupError);
    const unsubscribeAutomatic = subscribeAutomaticBackupConfig(setAutomaticConfig, setAutomaticError);
    getBackupCollectionPaths().then(setCollectionPaths).catch(() => setCollectionPaths([]));
    return () => {
      unsubscribeBackups();
      unsubscribeAutomatic();
    };
  }, [canManageBackups]);

  const manualBackups = backups.filter((backup) => backup.type === "manual" || backup.type === "pre_restore");
  const automaticBackups = backups.filter((backup) => backup.type === "automatic");
  const lastBackup = backups.find((backup) => backup.status === "success");
  const lastManual = manualBackups.find((backup) => backup.status === "success");
  const automaticEnabled = Boolean(automaticConfig?.enabled || automaticConfig?.status === "active");
  const automaticStatusLabel = automaticConfig?.status === "error" ? "Error" : automaticEnabled ? "Activo" : "No configurado";
  const automaticRetention = automaticConfig?.retentionDays || automaticConfig?.retentionCount;
  const automaticLastRun = getConfigDate(automaticConfig, ["lastSuccessAt", "lastRunAt"]);
  const automaticNextRun = getConfigDate(automaticConfig, ["nextRunAt", "nextRunEstimate"]);

  const toggleSection = (key) => setOpenSections((current) => ({ ...current, [key]: !current[key] }));

  const handleCreateManual = async () => {
    if (!canManageBackups || isGenerating) return;
    setIsGenerating(true);
    setMessage("Preparando backup...");
    try {
      const result = await createBackup({ type: "manual", actor, logActivity });
      downloadBlob(result.blob, result.fileName);
      setMessage(`Backup creado correctamente. ${result.metadata.documentCount} documentos.`);
    } catch (error) {
      console.error(error);
      setMessage("No se pudo crear el backup.");
      await logActivity?.("Backup fallido", error?.message || "Error en backup manual");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileSelected = async (event) => {
    const file = event.target.files?.[0];
    setMessage("");
    setRestoreBackup(null);
    setRestoreConfirmText("");
    setIsRestoreConfirmOpen(false);
    if (!file) return;
    setMessage("Validando archivo...");
    try {
      const parsed = JSON.parse(await file.text());
      setRestoreBackup(validateBackupJson(parsed));
      setMessage("Archivo validado. Revisá el resumen antes de restaurar.");
    } catch (error) {
      console.error(error);
      setMessage(error?.message || "No se pudo validar el JSON.");
    } finally {
      event.target.value = "";
    }
  };

  const handleRestore = async () => {
    if (!restoreBackup || restoreConfirmText !== "RESTAURAR" || !canManageBackups || isRestoring) return;
    setIsRestoring(true);
    setIsRestoreConfirmOpen(false);
    setMessage("Creando backup preventivo...");
    try {
      const result = await restoreBackupJson({ backup: restoreBackup, mode: restoreMode, actor, logActivity });
      setMessage(`Restauración completada. Documentos procesados: ${result.updated}.`);
      setRestoreBackup(null);
      setRestoreConfirmText("");
      setIsRestoreConfirmOpen(false);
    } catch (error) {
      console.error(error);
      setMessage(error?.message || "No se pudo restaurar el backup.");
      await logActivity?.("Restauración fallida", error?.message || "Error al restaurar JSON");
    } finally {
      setIsRestoring(false);
    }
  };

  if (!canManageBackups) {
    return null;
  }

  return (
    <details className="admin-editor-card admin-collapsible-card admin-backup-panel" open={isOpen} onToggle={(event) => setIsOpen(event.currentTarget.open)}>
      <summary>
        <span>
          <strong>Backup de seguridad</strong>
          <small>Copias de respaldo y restauración de datos del sistema.</small>
        </span>
        <em>{backups.length} backups · {lastBackup ? `Último: ${formatDateTime(lastBackup.createdAt)}` : "0 backups"}</em>
      </summary>

      <div className="admin-collapsible-card__content backup-panel-body">
        {backupError ? <p className="admin-form-message admin-form-message--warning">No se pudieron cargar backups.</p> : null}
        {message ? <p className="admin-form-message">{message}</p> : null}

        <BackupSubsection
          isOpen={openSections.manual}
          onToggle={() => toggleSection("manual")}
          title="Backup manual"
          summary={lastManual ? `Último manual: ${formatDateTime(lastManual.createdAt)}` : "Sin backups manuales todavía"}
        >
          <div className="backup-action-row">
            <div>
              <h3>Crear respaldo ahora</h3>
              <p>Exporta reservas, pagos, gastos, tareas, clientes, usuarios, configuración, actividad y contenido público.</p>
              <p>Los JSON incluyen datos y referencias de archivos; los comprobantes permanecen en Firebase Storage.</p>
            </div>
            <button className="admin-primary-button" disabled={isGenerating} onClick={handleCreateManual} type="button">
              {isGenerating ? "Preparando backup..." : "Crear backup ahora"}
            </button>
          </div>
          <BackupList backups={manualBackups} logActivity={logActivity} />
        </BackupSubsection>

        <BackupSubsection
          isOpen={openSections.automatic}
          onToggle={() => toggleSection("automatic")}
          title="Backup automático"
          summary={automaticConfig?.status === "error" ? "Error detectado" : automaticEnabled ? "Configuración detectada" : "No configurado"}
        >
          <div className="backup-summary-grid">
            <span><small>Estado</small><strong>{automaticStatusLabel}</strong></span>
            <span><small>Frecuencia</small><strong>{automaticConfig?.frequency || "No configurado"}</strong></span>
            <span><small>Retención</small><strong>{automaticRetention ? `${automaticRetention} días/backups` : "No configurado"}</strong></span>
            <span><small>Último automático</small><strong>{automaticLastRun ? formatDateTime(automaticLastRun) : "Sin dato"}</strong></span>
            <span><small>Próximo estimado</small><strong>{formatDateTimeOrText(automaticNextRun)}</strong></span>
            <span><small>Backups conservados</small><strong>{automaticBackups.length}</strong></span>
          </div>
          {automaticError ? <p className="admin-form-message admin-form-message--warning">No se pudo consultar el estado automático.</p> : null}
          <div className="backup-native-card">
            <div>
              <h3>Backup nativo de Firestore</h3>
              <p>Administrado por Firebase / Google Cloud.</p>
            </div>
            <span className={`backup-status backup-status--${automaticConfig?.nativeFirestore?.status === "active" ? "success" : "failed"}`}>
              {automaticConfig?.nativeFirestore?.status === "active" ? "Activo" : "No configurado"}
            </span>
            <div className="backup-summary-grid">
              <span><small>Frecuencia</small><strong>{automaticConfig?.nativeFirestore?.frequency || "No configurado"}</strong></span>
              <span><small>Retención</small><strong>{automaticConfig?.nativeFirestore?.retention || "No configurado"}</strong></span>
              <span><small>Base de datos</small><strong>{automaticConfig?.nativeFirestore?.database || "(default)"}</strong></span>
            </div>
            <p>La restauración nativa se realiza desde Firebase o Google Cloud. No se exponen credenciales administrativas en el navegador.</p>
          </div>
          <BackupList backups={automaticBackups} logActivity={logActivity} />
        </BackupSubsection>

        <BackupSubsection
          isOpen={openSections.restore}
          onToggle={() => toggleSection("restore")}
          title="Restaurar desde JSON"
          summary="Acción crítica con backup preventivo obligatorio"
        >
          <div className="backup-action-row">
            <div>
              <h3>Seleccionar archivo JSON</h3>
              <p>Solo se aceptan backups generados por Paraíso Escondido. Antes de restaurar se crea un backup preventivo.</p>
            </div>
            <button className="admin-secondary-button" onClick={() => fileInputRef.current?.click()} type="button">
              Seleccionar archivo JSON
            </button>
            <input ref={fileInputRef} hidden accept="application/json,.json" onChange={handleFileSelected} type="file" />
          </div>
          {restoreBackup ? <RestoreSummary backup={restoreBackup} /> : null}
          {restoreBackup ? (
            <div className="restore-confirm-card">
              <label>
                Modo de restauración
                <select value={restoreMode} onChange={(event) => setRestoreMode(event.target.value)}>
                  <option value="merge">Fusionar con datos actuales</option>
                  <option value="replace">Restauración completa / reemplazar colecciones incluidas</option>
                </select>
              </label>
              <p>Escribí RESTAURAR para confirmar. Esta acción modificará información del sistema.</p>
              <p>Por seguridad, los perfiles de usuario se fusionan y no se borran durante una restauración completa.</p>
              <input value={restoreConfirmText} onChange={(event) => setRestoreConfirmText(event.target.value)} placeholder="RESTAURAR" />
              <button
                className="admin-danger-button"
                disabled={restoreConfirmText !== "RESTAURAR" || isRestoring}
                onClick={() => setIsRestoreConfirmOpen(true)}
                type="button"
              >
                {isRestoring ? "Restaurando..." : "Revisar y restaurar"}
              </button>
            </div>
          ) : null}
          <p className="admin-empty-note">Colecciones configuradas: {collectionPaths.join(", ") || "cargando..."}</p>
        </BackupSubsection>
      </div>
      {isRestoreConfirmOpen && restoreBackup ? (
        <div className="admin-modal-backdrop" role="presentation">
          <div className="admin-modal admin-modal--confirm" role="dialog" aria-modal="true">
            <div className="admin-modal__header">
              <div>
                <h3>Restaurar backup</h3>
                <p>Esta acción modificará información del sistema. Antes de continuar se creará un backup preventivo.</p>
              </div>
            </div>
            <RestoreSummary backup={restoreBackup} />
            <div className="admin-modal__actions">
              <button type="button" className="admin-secondary-button" onClick={() => setIsRestoreConfirmOpen(false)}>
                Cancelar
              </button>
              <button type="button" className="admin-danger-button" onClick={handleRestore} disabled={isRestoring}>
                {isRestoring ? "Restaurando..." : "Restaurar backup"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </details>
  );
}
