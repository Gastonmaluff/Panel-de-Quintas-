import { Link } from "react-router-dom";
import { adminReservationsMock } from "../data/adminData.js";
import { formatGuaranies } from "../utils/pricing.js";
import { venues } from "../data/venues.js";

function getCurrentMonthReservations() {
  return adminReservationsMock.filter((reservation) => reservation.status !== "bloqueada");
}

function buildClientWhatsappUrl(reservation) {
  const venue = venues[0];
  const phone = reservation.customerPhone.replace(/\D/g, "") || venue.whatsappNumber;
  const message = `Hola ${reservation.customerName}, te escribo por tu reserva en ${venue.name} para el ${reservation.eventDate}.`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function getStatusClass(status) {
  return status
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll(" ", "-");
}

export default function AdminDashboard() {
  const reservations = getCurrentMonthReservations();
  const estimatedIncome = reservations.reduce(
    (total, reservation) => total + reservation.totalPrice,
    0,
  );
  const pendingDeposits = reservations.filter(
    (reservation) => reservation.status === "seña pendiente",
  ).length;
  const pendingQueries = reservations.filter(
    (reservation) =>
      reservation.status === "consulta" || reservation.status === "cotización enviada",
  ).length;

  const metrics = [
    ["Reservas del mes", reservations.length],
    ["Ingresos estimados", formatGuaranies(estimatedIncome)],
    ["Señas pendientes", pendingDeposits],
    ["Fechas ocupadas", adminReservationsMock.length],
    ["Consultas pendientes", pendingQueries],
    ["Próximos eventos", reservations.slice(0, 3).length],
  ];

  return (
    <section className="admin-section">
      <div className="admin-grid">
        {metrics.map(([label, value]) => (
          <article className="admin-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>

      <div className="admin-dashboard-columns">
        <article className="admin-table-card">
          <div className="admin-section-heading">
            <div>
              <h2>Próximos eventos</h2>
              <p>Fechas cercanas con los datos clave para hacer seguimiento.</p>
            </div>
            <Link to="/admin/calendario">Abrir calendario</Link>
          </div>
          <div className="admin-event-list">
            {reservations.slice(0, 4).map((reservation) => (
              <article key={reservation.id}>
                <div className="admin-event-list__date">
                  <strong>{reservation.eventDate.slice(8, 10)}</strong>
                  <span>{reservation.eventDate.slice(5, 7)}</span>
                </div>
                <div className="admin-event-list__body">
                  <div>
                    <h3>{reservation.customerName}</h3>
                    <span className={`admin-status-pill admin-status-pill--${getStatusClass(reservation.status)}`}>
                      {reservation.status}
                    </span>
                  </div>
                  <p>
                    {reservation.eventType} · {reservation.timeSlot} · {reservation.guestCount || "Sin"} personas
                  </p>
                  <small>{reservation.customerPhone || "Sin teléfono cargado"}</small>
                </div>
                <div className="admin-event-list__amount">
                  <strong>{formatGuaranies(reservation.totalPrice)}</strong>
                  <a href={buildClientWhatsappUrl(reservation)} target="_blank" rel="noreferrer">
                    WhatsApp
                  </a>
                </div>
              </article>
            ))}
          </div>
        </article>

        <article className="admin-table-card">
          <div className="admin-section-heading">
            <div>
              <h2>Contenido público</h2>
              <p>Editá los textos, imágenes y secciones que aparecen en tu página pública.</p>
            </div>
            <Link to="/admin/contenido">Editar contenido</Link>
          </div>
          <p>
            Desde acá podés actualizar la portada, la galería, los servicios, el llamado final
            y los datos de contacto de Paraíso Escondido.
          </p>
        </article>
      </div>
    </section>
  );
}
