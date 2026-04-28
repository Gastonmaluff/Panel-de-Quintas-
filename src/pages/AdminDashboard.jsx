import { Link } from "react-router-dom";
import {
  CalendarCheck,
  CalendarDays,
  Clock3,
  MessageCircle,
  PiggyBank,
  TrendingUp,
} from "lucide-react";
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

const occupancyStatuses = new Set(["confirmada", "seña pendiente", "pre-reserva"]);

function getDashboardMonth(reservations) {
  const current = new Date();
  const currentMonthReservations = reservations.filter((reservation) => {
    const date = new Date(`${reservation.eventDate}T12:00:00`);
    return date.getMonth() === current.getMonth() && date.getFullYear() === current.getFullYear();
  });

  if (currentMonthReservations.length) {
    return { year: current.getFullYear(), month: current.getMonth() };
  }

  const nextReservation = reservations
    .map((reservation) => new Date(`${reservation.eventDate}T12:00:00`))
    .sort((a, b) => a - b)[0];

  return {
    year: nextReservation?.getFullYear() || current.getFullYear(),
    month: nextReservation?.getMonth() ?? current.getMonth(),
  };
}

export default function AdminDashboard() {
  const reservations = getCurrentMonthReservations();
  const dashboardMonth = getDashboardMonth(reservations);
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
  const occupiedDates = reservations.filter((reservation) => {
    const date = new Date(`${reservation.eventDate}T12:00:00`);
    return (
      occupancyStatuses.has(reservation.status) &&
      date.getMonth() === dashboardMonth.month &&
      date.getFullYear() === dashboardMonth.year
    );
  });
  const daysInMonth = new Date(dashboardMonth.year, dashboardMonth.month + 1, 0).getDate();
  const occupancyPercent = Math.round((occupiedDates.length / daysInMonth) * 100);
  const monthLabel = new Intl.DateTimeFormat("es-PY", {
    month: "long",
  }).format(new Date(dashboardMonth.year, dashboardMonth.month, 1));

  const metrics = [
    { label: "Reservas del mes", value: reservations.length, icon: CalendarCheck },
    { label: "Ingresos estimados", value: formatGuaranies(estimatedIncome), icon: TrendingUp },
    { label: "Señas pendientes", value: pendingDeposits, icon: PiggyBank },
    { label: "Fechas ocupadas", value: adminReservationsMock.length, icon: CalendarDays },
    { label: "Consultas pendientes", value: pendingQueries, icon: MessageCircle },
    { label: "Próximos eventos", value: reservations.slice(0, 3).length, icon: Clock3 },
  ];

  return (
    <section className="admin-section admin-dashboard">
      <div className="admin-dashboard-hero">
        <div>
          <p className="eyebrow">Resumen general</p>
          <h1>Todo lo importante de la quinta, en un solo lugar.</h1>
          <span>Seguimiento de reservas, cobros, fechas comprometidas y contenido público.</span>
        </div>
        <Link to="/admin/reservas">Nueva reserva</Link>
      </div>

      <div className="admin-grid">
        {metrics.map(({ label, value, icon: Icon }) => (
          <article className="admin-card" key={label}>
            <i>
              <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
            </i>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
        <article className="admin-card admin-card--occupancy">
          <div>
            <span>Ocupación</span>
            <strong>{occupancyPercent}%</strong>
          </div>
          <div className="admin-occupancy-bar" aria-hidden="true">
            <span style={{ width: `${occupancyPercent}%` }} />
          </div>
          <small>
            {occupiedDates.length} de {daysInMonth} días comprometidos en {monthLabel}
          </small>
        </article>
      </div>

      <div className="admin-dashboard-columns">
        <article className="admin-table-card admin-table-card--large">
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

        <article className="admin-table-card admin-public-content-card">
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
