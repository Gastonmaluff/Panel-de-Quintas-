import { useState } from "react";
import { useAdminData } from "../admin/AdminDataProvider.jsx";
import { useAuth } from "../auth/AuthProvider.jsx";
import { ROLE_LABELS, ROLES } from "../auth/permissions.js";

function ConfigPanel({ title, description, children }) {
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
          <small>{description}</small>
        </span>
      </summary>
      <div className="admin-collapsible-card__content">{children}</div>
    </details>
  );
}

export default function AdminConfiguration() {
  const { profile, user } = useAuth();
  const {
    activityLog,
    reservations,
    activeReservations,
    cancelledReservations,
    expenses,
    clients,
    users,
    saveUserProfile,
    logActivity,
  } = useAdminData();
  const [userDraft, setUserDraft] = useState({
    name: "",
    email: "",
    uid: "",
    role: ROLES.manager,
    active: true,
  });
  const [isSavingUser, setIsSavingUser] = useState(false);

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

  const saveUser = async (event) => {
    event.preventDefault();
    if (!userDraft.email || isSavingUser) return;
    setIsSavingUser(true);
    try {
      await saveUserProfile(userDraft);
      setUserDraft({ name: "", email: "", uid: "", role: ROLES.manager, active: true });
    } finally {
      setIsSavingUser(false);
    }
  };

  return (
    <section className="admin-section admin-configuration-section">
      <div className="admin-section-heading">
        <div>
          <h2>Configuración</h2>
          <p>Ajustes internos del sistema operativo de Paraíso Escondido.</p>
        </div>
      </div>

      <ConfigPanel title="Usuarios y permisos" description="Crear perfiles para Dueño/Admin y Encargado.">
        <div className="admin-permission-grid">
          <article>
            <strong>Dueño / Admin</strong>
            <p>Acceso total a Control, Reservas, Calendario, Gastos, Finanzas, Clientes, Configuración, Historial y Backup.</p>
          </article>
          <article>
            <strong>Encargado</strong>
            <p>Acceso solamente a Reservas, Calendario y Gastos. Sin Finanzas, Clientes, Configuración, Usuarios, Backup ni Historial completo.</p>
          </article>
        </div>

        <form className="admin-user-role-form" onSubmit={saveUser}>
          <label>Nombre<input value={userDraft.name} onChange={(event) => setUserDraft((current) => ({ ...current, name: event.target.value }))} /></label>
          <label>Email<input type="email" value={userDraft.email} onChange={(event) => setUserDraft((current) => ({ ...current, email: event.target.value }))} required /></label>
          <label>UID de Firebase Auth opcional<input value={userDraft.uid} onChange={(event) => setUserDraft((current) => ({ ...current, uid: event.target.value }))} /></label>
          <label>Rol<select value={userDraft.role} onChange={(event) => setUserDraft((current) => ({ ...current, role: event.target.value }))}>
            <option value={ROLES.admin}>Dueño / Admin</option>
            <option value={ROLES.manager}>Encargado</option>
          </select></label>
          <label className="reservation-switch-field">
            <input type="checkbox" checked={userDraft.active} onChange={(event) => setUserDraft((current) => ({ ...current, active: event.target.checked }))} />
            <span>
              <strong>Usuario activo</strong>
              <small>Si se desactiva, no podrá operar el panel.</small>
            </span>
          </label>
          <button type="submit" className="admin-primary-button" disabled={isSavingUser}>{isSavingUser ? "Guardando..." : "Guardar usuario"}</button>
        </form>

        <div className="admin-user-role-list">
          {users.length ? users.map((item) => (
            <article key={item.id || item.email}>
              <div>
                <strong>{item.name || item.email}</strong>
                <span>{item.email}</span>
              </div>
              <em>{ROLE_LABELS[item.role] || item.role}</em>
              <small>{item.active === false ? "Inactivo" : "Activo"}</small>
              <p>{item.role === ROLES.admin ? "Todos los accesos" : "Reservas, Calendario y Gastos"}</p>
            </article>
          )) : <p className="admin-empty-note">Todavía no hay perfiles guardados en Firestore.</p>}
        </div>

        <p className="admin-empty-note">
          Sesión actual: {user?.email || "Sin usuario"} · {ROLE_LABELS[profile?.role] || profile?.role || "Sin rol"}.
          Para usuarios nuevos, creá primero la cuenta en Firebase Authentication y luego guardá su perfil de rol aquí.
        </p>
      </ConfigPanel>

      <ConfigPanel title="Historial de actividad" description="Registro de acciones importantes del sistema.">
        <div className="admin-activity-list">
          {activityLog.length ? activityLog.map((item) => (
            <article key={item.id}>
              <strong>{item.action}</strong>
              <span>{new Date(item.date).toLocaleString("es-PY")} · {item.userName || item.user} · {ROLE_LABELS[item.userRole] || item.userRole || "Sin rol"}</span>
              <p>{item.detail}</p>
            </article>
          )) : <p className="admin-empty-note">Todavía no hay movimientos registrados.</p>}
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
    </section>
  );
}
