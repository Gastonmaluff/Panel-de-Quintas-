import { useState } from "react";
import { useAdminData } from "../admin/AdminDataProvider.jsx";
import { useAuth } from "../auth/AuthProvider.jsx";

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
  const { user } = useAuth();
  const { activityLog, reservations, activeReservations, cancelledReservations, expenses, clients, logActivity } = useAdminData();

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

  return (
    <section className="admin-section admin-configuration-section">
      <div className="admin-section-heading">
        <div>
          <h2>Configuración</h2>
          <p>Ajustes internos del sistema operativo de Paraíso Escondido.</p>
        </div>
      </div>

      <ConfigPanel title="Usuarios y permisos" description="Roles preparados para dueño y funcionario.">
        <div className="admin-permission-grid">
          <article>
            <strong>Admin / Dueño</strong>
            <p>Acceso total a Control, Reservas, Calendario, Gastos, Finanzas, Clientes, Configuración, Historial y Backup.</p>
          </article>
          <article>
            <strong>Funcionario</strong>
            <p>Acceso preparado solamente a Reservas, Calendario y Gastos. Sin acceso a Finanzas, Clientes, Configuración, Usuarios, Backup ni Historial.</p>
          </article>
        </div>
        <p className="admin-empty-note">Sesión actual: {user?.email || "Sin usuario"}. La UI de roles queda preparada para conectarse a claims o perfiles de usuario.</p>
      </ConfigPanel>

      <ConfigPanel title="Historial de actividad" description="Registro de acciones importantes del sistema.">
        <div className="admin-activity-list">
          {activityLog.length ? activityLog.map((item) => (
            <article key={item.id}>
              <strong>{item.action}</strong>
              <span>{new Date(item.date).toLocaleString("es-PY")} · {item.user}</span>
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
