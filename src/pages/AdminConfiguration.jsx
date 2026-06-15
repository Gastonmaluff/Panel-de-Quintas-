import { useState } from "react";
import { useAdminData } from "../admin/AdminDataProvider.jsx";
import { ROLE_LABELS, ROLES } from "../auth/permissions.js";

const emptyUserDraft = {
  name: "",
  email: "",
  password: "",
  uid: "",
  role: ROLES.manager,
  active: true,
};

function ConfigPanel({ title, description = "", children }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <details
      className="admin-editor-card admin-collapsible-card"
      open={isOpen}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
    >
      <summary>
        <span>
          <strong>{title}</strong>
          {description ? <small>{description}</small> : null}
        </span>
      </summary>
      <div className="admin-collapsible-card__content">{children}</div>
    </details>
  );
}

function getUserId(item) {
  return item.uid || item.id || "";
}

function accessSummary(role) {
  return role === ROLES.admin ? "Acceso completo" : "Reservas, Calendario y Gastos";
}

function buildAccessLink(role) {
  const route = role === ROLES.admin ? "admin" : "encargado";
  const basePath = import.meta.env.BASE_URL || "/";
  const normalizedBase = basePath.endsWith("/") ? basePath : `${basePath}/`;
  return `${window.location.origin}${normalizedBase}${route}`;
}

export default function AdminConfiguration() {
  const {
    activityLog,
    reservations,
    activeReservations,
    cancelledReservations,
    expenses,
    clients,
    users,
    saveUserProfile,
    updateUserActiveState,
    deleteUserProfile,
    logActivity,
  } = useAdminData();
  const [userDraft, setUserDraft] = useState(emptyUserDraft);
  const [editingUserId, setEditingUserId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [userMessage, setUserMessage] = useState("");
  const isEditingUser = Boolean(editingUserId);

  const exportJson = async (type) => {
    const payload = {
      exportedAt: new Date().toISOString(),
      reservas: reservations,
      reservasActivas: activeReservations,
      reservasCanceladas: cancelledReservations,
      clientes: clients,
      gastos: expenses,
      pagos: reservations.flatMap((reservation) =>
        reservation.payments.map((payment) => ({
          ...payment,
          reservationId: reservation.id,
          clientName: reservation.clientName,
        })),
      ),
      resumenFinanciero: {
        ingresos: reservations.reduce((total, reservation) => total + reservation.totalPaid, 0),
        gastos: expenses.reduce((total, expense) => total + expense.amount, 0),
        saldosPendientes: activeReservations.reduce((total, reservation) => total + reservation.balance, 0),
      },
    };
    const selectedPayload = type === "todo" ? payload : payload[type];
    const blob = new Blob([JSON.stringify(selectedPayload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `paraiso-escondido-${type}-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    await logActivity("Backup exportado", type === "todo" ? "Backup completo JSON" : `Backup ${type}`);
  };

  const resetUserForm = () => {
    setUserDraft(emptyUserDraft);
    setEditingUserId("");
  };

  const saveUser = async (event) => {
    event.preventDefault();
    if (isSavingUser) return;

    if (
      !userDraft.name.trim() ||
      !userDraft.email.trim() ||
      !userDraft.uid.trim() ||
      !userDraft.role ||
      (!isEditingUser && !userDraft.password.trim())
    ) {
      setUserMessage("Completá nombre, email, contraseña, UID de Firebase y rol.");
      return;
    }

    setIsSavingUser(true);
    setUserMessage("");
    try {
      await saveUserProfile({
        id: editingUserId,
        uid: userDraft.uid,
        name: userDraft.name,
        email: userDraft.email,
        role: userDraft.role,
        active: userDraft.active,
      });
      setUserMessage(isEditingUser ? "Usuario editado." : "Usuario creado.");
      resetUserForm();
    } catch (error) {
      setUserMessage(error.message || "No se pudo guardar el usuario.");
    } finally {
      setIsSavingUser(false);
    }
  };

  const startEditUser = (item) => {
    setEditingUserId(getUserId(item));
    setUserDraft({
      name: item.name || "",
      email: item.email || "",
      password: "",
      uid: getUserId(item),
      role: item.role || ROLES.manager,
      active: item.active !== false,
    });
    setUserMessage("");
  };

  const toggleUser = async (item) => {
    try {
      const nextActive = item.active === false;
      await updateUserActiveState(getUserId(item), nextActive);
      setUserMessage(nextActive ? "Usuario activado." : "Usuario desactivado.");
    } catch (error) {
      setUserMessage(error.message || "No se pudo actualizar el usuario.");
    }
  };

  const confirmDeleteUser = async () => {
    if (!deleteTarget) return;

    try {
      await deleteUserProfile(getUserId(deleteTarget));
      setUserMessage("Usuario eliminado.");
      setDeleteTarget(null);
      if (editingUserId === getUserId(deleteTarget)) resetUserForm();
    } catch (error) {
      setUserMessage(error.message || "No se pudo eliminar el usuario.");
    }
  };

  const copyAccessLink = async (item) => {
    const link = buildAccessLink(item.role);
    await navigator.clipboard?.writeText(link);
    await logActivity("Link copiado", `${item.email || getUserId(item)} - ${item.role}`);
    setUserMessage("Link copiado.");
  };

  return (
    <section className="admin-section admin-configuration-section">
      <div className="admin-section-heading">
        <div>
          <h2>Configuración</h2>
        </div>
      </div>

      <ConfigPanel title="Usuarios y permisos">
        <form className="admin-user-role-form" onSubmit={saveUser}>
          <label>
            Nombre
            <input
              value={userDraft.name}
              onChange={(event) => setUserDraft((current) => ({ ...current, name: event.target.value }))}
              required
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={userDraft.email}
              onChange={(event) => setUserDraft((current) => ({ ...current, email: event.target.value }))}
              required
            />
          </label>
          <label>
            Contraseña
            <input
              type="password"
              value={userDraft.password}
              onChange={(event) => setUserDraft((current) => ({ ...current, password: event.target.value }))}
              required={!isEditingUser}
              placeholder={isEditingUser ? "Nueva contraseña si aplica" : ""}
            />
          </label>
          <label>
            UID de Firebase
            <input
              value={userDraft.uid}
              onChange={(event) => setUserDraft((current) => ({ ...current, uid: event.target.value }))}
              readOnly={isEditingUser}
              required
            />
          </label>
          <label>
            Rol
            <select
              value={userDraft.role}
              onChange={(event) => setUserDraft((current) => ({ ...current, role: event.target.value }))}
              required
            >
              <option value={ROLES.admin}>Dueño / Admin</option>
              <option value={ROLES.manager}>Encargado</option>
            </select>
          </label>
          <label className="reservation-switch-field">
            <input
              type="checkbox"
              checked={userDraft.active}
              onChange={(event) => setUserDraft((current) => ({ ...current, active: event.target.checked }))}
            />
            <span>
              <strong>Usuario activo</strong>
            </span>
          </label>
          <div className="admin-user-role-form__actions">
            {isEditingUser ? (
              <button type="button" className="admin-secondary-button" onClick={resetUserForm}>
                Cancelar edición
              </button>
            ) : null}
            <button type="submit" className="admin-primary-button" disabled={isSavingUser}>
              {isSavingUser ? "Guardando..." : isEditingUser ? "Guardar cambios" : "Guardar usuario"}
            </button>
          </div>
        </form>

        {userMessage ? <p className="admin-form-message">{userMessage}</p> : null}

        <div className="admin-user-role-list">
          {users.length ? (
            users.map((item) => (
              <article className="admin-user-card" key={getUserId(item) || item.email}>
                <header>
                  <div>
                    <strong>{item.name || item.email}</strong>
                    <span>{item.email}</span>
                  </div>
                  <em>{ROLE_LABELS[item.role] || item.role}</em>
                </header>
                <dl>
                  <div>
                    <dt>UID de Firebase</dt>
                    <dd>{getUserId(item) || "Sin UID"}</dd>
                  </div>
                  <div>
                    <dt>Estado</dt>
                    <dd>{item.active === false ? "Inactivo" : "Activo"}</dd>
                  </div>
                  <div>
                    <dt>Accesos</dt>
                    <dd>{accessSummary(item.role)}</dd>
                  </div>
                </dl>
                <div className="admin-user-card__actions">
                  <button type="button" onClick={() => copyAccessLink(item)}>Copiar link</button>
                  <button type="button" onClick={() => startEditUser(item)}>Editar</button>
                  <button type="button" onClick={() => toggleUser(item)}>
                    {item.active === false ? "Activar" : "Desactivar"}
                  </button>
                  <button type="button" className="admin-danger-button" onClick={() => setDeleteTarget(item)}>
                    Eliminar
                  </button>
                </div>
              </article>
            ))
          ) : (
            <p className="admin-empty-note">Todavía no hay perfiles guardados en Firestore.</p>
          )}
        </div>
      </ConfigPanel>

      <ConfigPanel title="Historial de actividad">
        <div className="admin-activity-list">
          {activityLog.length ? (
            activityLog.map((item) => (
              <article key={item.id}>
                <strong>{item.action}</strong>
                <span>
                  {new Date(item.date).toLocaleString("es-PY")} · {item.userName || item.user} ·{" "}
                  {ROLE_LABELS[item.userRole] || item.userRole || "Sin rol"}
                </span>
                <p>{item.detail}</p>
              </article>
            ))
          ) : (
            <p className="admin-empty-note">Todavía no hay movimientos registrados.</p>
          )}
        </div>
      </ConfigPanel>

      <ConfigPanel title="Backup de seguridad" description="Exportar información crítica en JSON.">
        <div className="admin-backup-actions">
          <button type="button" onClick={() => exportJson("todo")}>Exportar backup JSON</button>
          <button type="button" onClick={() => exportJson("reservas")}>Exportar reservas</button>
          <button type="button" onClick={() => exportJson("clientes")}>Exportar clientes</button>
          <button type="button" onClick={() => exportJson("gastos")}>Exportar gastos</button>
          <button type="button" onClick={() => exportJson("resumenFinanciero")}>Exportar resumen financiero</button>
        </div>
      </ConfigPanel>

      {deleteTarget ? (
        <div className="admin-modal-backdrop" role="presentation">
          <div className="admin-modal admin-modal--confirm" role="dialog" aria-modal="true">
            <div className="admin-modal__header">
              <div>
                <h3>Eliminar usuario</h3>
                <p>¿Seguro que querés eliminar este usuario?</p>
              </div>
            </div>
            <div className="admin-modal__actions">
              <button type="button" className="admin-secondary-button" onClick={() => setDeleteTarget(null)}>
                Cancelar
              </button>
              <button type="button" className="admin-danger-button" onClick={confirmDeleteUser}>
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
