import { Link } from "react-router-dom";
import {
  CalendarCheck,
  CalendarDays,
  Clock3,
  MessageCircle,
  PiggyBank,
  TrendingUp,
} from "lucide-react";
import { useAdminData } from "../admin/AdminDataProvider.jsx";
import { formatGuaranies } from "../utils/pricing.js";
import { venues } from "../data/venues.js";

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

const occupancyStatuses = new Set(["confirmada", "seña pendiente", "pre-reserva", "bloqueada"]);

function formatShortEventDate(dateValue) {
  return new Intl.DateTimeFormat("es-PY", {
    day: "2-digit",
    month: "long",
  }).format(new Date(`${dateValue}T12:00:00`));
}

export default function AdminDashboard() {
  const { reservations } = useAdminData();
  const activeReservations = reservations.filter((reservation) => reservation.status !== "bloqueada");
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const todayISO = today.toISOString().slice(0, 10);
  const currentMonthReservations = activeReservations.filter((reservation) => {
    const date = new Date(`${reservation.eventDate}T12:00:00`);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });
  const upcomingReservations = activeReservations
    .filter((reservation) => reservation.eventDate >= todayISO)
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  const estimatedIncome = currentMonthReservations.reduce(
    (total, reservation) => total + reservation.totalPrice,
    0,
  );
  const pendingDeposits = currentMonthReservations.filter(
    (reservation) => reservation.status === "seña pendiente",
  ).length;
  const pendingQueries = currentMonthReservations.filter(
    (reservation) =>
      reservation.status === "consulta" || reservation.status === "cotización enviada",
  ).length;
  const occupiedDates = reservations.filter((reservation) => {
    const date = new Date(`${reservation.eventDate}T12:00:00`);
    return (
      occupancyStatuses.has(reservation.status) &&
      date.getMonth() === currentMonth &&
      date.getFullYear() === currentYear
    );
  });
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const occupancyPercent = Math.round((occupiedDates.length / daysInMonth) * 100);
  const monthLabel = new Intl.DateTimeFormat("es-PY", {
    month: "long",
  }).format(today);

  const metrics = [
    { label: "Reservas del mes", value: currentMonthReservations.length, icon: CalendarCheck },
    { label: "Ingresos estimados", value: formatGuaranies(estimatedIncome), icon: TrendingUp },
    { label: "Señas pendientes", value: pendingDeposits, icon: PiggyBank },
    { label: "Fechas ocupadas", value: occupiedDates.length, icon: CalendarDays },
    { label: "Consultas pendientes", value: pendingQueries, icon: MessageCircle },
    { label: "Próximos eventos", value: upcomingReservations.slice(0, 3).length, icon: Clock3 },
  ];

  return (
    <section className="admin-section admin-dashboard">
      <div className="admin-dashboard-hero admin-dashboard-hero--compact">
        <p className="eyebrow">Resumen general</p>
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
            {upcomingReservations.slice(0, 4).map((reservation) => (
              <article key={reservation.id}>
                <div className="admin-event-list__date admin-event-list__date--text">
                  <strong>{formatShortEventDate(reservation.eventDate)}</strong>
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
