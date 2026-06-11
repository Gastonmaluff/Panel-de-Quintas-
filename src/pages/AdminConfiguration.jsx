import { useState } from "react";
import AdminContent from "./AdminContent.jsx";
import AdminPricing from "./AdminPricing.jsx";
import { useAdminData } from "../admin/AdminDataProvider.jsx";
import { venues } from "../data/venues.js";

function ConfigPanel({ title, description, children, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

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
  const [venue, setVenue] = useState(venues[0]);
  const { activityLog, reservations, expenses, clients } = useAdminData();

  const updateVenue = (key, value) => {
    setVenue((current) => ({ ...current, [key]: value }));
  };

  const exportJson = (type) => {
    const payload = {
      reservas: reservations,
      clientes: clients,
      gastos: expenses,
      finanzas: {
        ingresos: reservations.reduce((total, reservation) => total + reservation.totalPaid, 0),
        gastos: expenses.reduce((total, expense) => total + expense.amount, 0),
      },
    };
    const blob = new Blob([JSON.stringify(type === "todo" ? payload : payload[type], null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `paraiso-escondido-${type}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="admin-section admin-configuration-section">
      <div className="admin-section-heading">
        <div>
          <h2>Configuración</h2>
          <p>Ajustes del sistema interno y contenido público.</p>
        </div>
      </div>

      <ConfigPanel
        title="Contenido público"
        description="Editar textos, imágenes y secciones visibles de la página pública."
        defaultOpen
      >
        <AdminContent embedded />
      </ConfigPanel>

      <ConfigPanel
        title="Datos generales del sistema"
        description="Información base de la quinta y contacto."
      >
        <form className="config-form">
          <label>Nombre<input value={venue.name} onChange={(event) => updateVenue("name", event.target.value)} /></label>
          <label>WhatsApp<input value={venue.whatsappNumber} onChange={(event) => updateVenue("whatsappNumber", event.target.value)} /></label>
          <label>Ubicación<input value={venue.location} onChange={(event) => updateVenue("location", event.target.value)} /></label>
          <label>Descripción<textarea value={venue.description} onChange={(event) => updateVenue("description", event.target.value)} /></label>
        </form>
      </ConfigPanel>

      <ConfigPanel title="Usuarios y permisos" description="Roles preparados para dueño y funcionario.">
        <div className="admin-permission-grid">
          <article><strong>Admin / Dueño</strong><p>Acceso total a Control, Reservas, Calendario, Gastos, Finanzas, Clientes y Configuración.</p></article>
          <article><strong>Funcionario</strong><p>Acceso preparado para Reservas, Calendario y Gastos. Sin acceso a Finanzas ni Configuración.</p></article>
        </div>
      </ConfigPanel>

      <ConfigPanel title="Historial de movimientos" description="Registro de acciones importantes del sistema.">
        <div className="admin-activity-list">
          {activityLog.length ? activityLog.map((item) => (
            <article key={item.id}>
              <strong>{item.action}</strong>
              <span>{new Date(item.date).toLocaleString("es-PY")} · {item.user}</span>
              <p>{item.detail}</p>
            </article>
          )) : <p className="admin-empty-note">Todavía no hay movimientos registrados en esta sesión.</p>}
        </div>
      </ConfigPanel>

      <ConfigPanel title="Backup de seguridad" description="Exportar información crítica en JSON.">
        <div className="admin-backup-actions">
          <button type="button" onClick={() => exportJson("todo")}>Exportar todo</button>
          <button type="button" onClick={() => exportJson("reservas")}>Exportar reservas</button>
          <button type="button" onClick={() => exportJson("clientes")}>Exportar clientes</button>
          <button type="button" onClick={() => exportJson("gastos")}>Exportar gastos</button>
          <button type="button" onClick={() => exportJson("finanzas")}>Exportar finanzas</button>
        </div>
      </ConfigPanel>

      <ConfigPanel title="Precios y cotizador público" description="Configuración conservada para la página pública.">
        <AdminPricing embedded />
      </ConfigPanel>
    </section>
  );
}
