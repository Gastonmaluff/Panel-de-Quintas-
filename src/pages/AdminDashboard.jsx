import { Link } from "react-router-dom";
import { adminReservationsMock } from "../data/adminData.js";
import { formatGuaranies } from "../utils/pricing.js";

function getCurrentMonthReservations() {
  return adminReservationsMock.filter((reservation) => reservation.status !== "bloqueada");
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
              <p>Vista rápida para seguimiento comercial y operativo.</p>
            </div>
            <Link to="/admin/calendario">Abrir calendario</Link>
          </div>
          <div className="admin-list">
            {reservations.slice(0, 4).map((reservation) => (
              <div key={reservation.id}>
                <strong>{reservation.eventDate.slice(5)}</strong>
                <span>{reservation.eventType}</span>
                <em>{reservation.status}</em>
              </div>
            ))}
          </div>
        </article>

        <article className="admin-table-card">
          <div className="admin-section-heading">
            <div>
              <h2>Contenido público</h2>
              <p>Editá textos, galería, amenities y CTA sin tocar código.</p>
            </div>
            <Link to="/admin/contenido">Editar contenido</Link>
          </div>
          <p>
            Los formularios trabajan con mock local en esta etapa, con estructura
            lista para persistir en Firestore.
          </p>
        </article>
      </div>
    </section>
  );
}
