import { Link } from "react-router-dom";
import { CalendarCheck, CalendarDays, Clock3, PiggyBank, WalletCards } from "lucide-react";
import { useAdminData } from "../admin/AdminDataProvider.jsx";
import { formatGuaranies } from "../utils/pricing.js";
import { getDayAvailabilityStatus } from "../utils/booking.js";

function formatShortDate(dateValue) {
  if (!dateValue) return "Sin fecha";
  return new Intl.DateTimeFormat("es-PY", {
    day: "2-digit",
    month: "long",
  }).format(new Date(`${dateValue}T12:00:00`));
}

function isCurrentMonth(dateValue, currentMonth, currentYear) {
  const date = new Date(`${dateValue}T12:00:00`);
  return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
}

export default function AdminDashboard() {
  const { reservations, activeReservations, getReservationDates } = useAdminData();
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const todayISO = today.toISOString().slice(0, 10);
  const monthReservations = activeReservations.filter((reservation) =>
    getReservationDates(reservation).some((date) => isCurrentMonth(date, currentMonth, currentYear)),
  );
  const upcomingReservations = activeReservations
    .filter((reservation) => reservation.startDate >= todayISO && reservation.status !== "cancelada")
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .slice(0, 4);
  const occupiedDateSet = new Set();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  Array.from({ length: daysInMonth }, (_, index) => {
    const date = new Date(currentYear, currentMonth, index + 1);
    const iso = date.toISOString().slice(0, 10);
    const status = getDayAvailabilityStatus(iso, activeReservations);
    if (["reserved", "preReserved", "blocked"].includes(status)) occupiedDateSet.add(iso);
  });
  const occupancyPercentage = Math.round((occupiedDateSet.size / daysInMonth) * 100);
  const paidThisMonth = monthReservations.reduce((total, reservation) => total + reservation.totalPaid, 0);
  const pendingBalance = reservations.reduce((total, reservation) => total + reservation.balance, 0);
  const pendingDeposits = reservations.filter((reservation) => reservation.paymentStatus === "Sin pago").length;

  const metrics = [
    { label: "Reservas del mes", value: monthReservations.length, icon: CalendarCheck },
    { label: "Ingresos cobrados", value: formatGuaranies(paidThisMonth), icon: WalletCards, compactValue: true },
    { label: "Señas pendientes", value: pendingDeposits, icon: PiggyBank },
    { label: "Saldos pendientes", value: formatGuaranies(pendingBalance), icon: PiggyBank, compactValue: true },
    { label: "Fechas ocupadas", value: occupiedDateSet.size, icon: CalendarDays },
    { label: "Próximos eventos", value: upcomingReservations.length, icon: Clock3 },
  ];

  return (
    <section className="admin-section admin-dashboard">
      <div className="admin-dashboard-hero admin-dashboard-hero--compact">
        <p className="eyebrow">Control</p>
        <Link to="/admin/reservas">Nueva reserva</Link>
      </div>

      <div className="admin-grid">
        <article className="admin-card admin-card--occupancy">
          <i><CalendarDays size={20} strokeWidth={1.8} aria-hidden="true" /></i>
          <span>Ocupación mensual</span>
          <strong>{occupancyPercentage}%</strong>
          <small>{occupiedDateSet.size} de {daysInMonth} días ocupados en {new Intl.DateTimeFormat("es-PY", { month: "long" }).format(today)}</small>
        </article>
        {metrics.map(({ label, value, icon: Icon, compactValue }) => (
          <article className={`admin-card${compactValue ? " admin-card--compact-value" : ""}`} key={label}>
            <i><Icon size={18} strokeWidth={1.8} aria-hidden="true" /></i>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>

      <article className="admin-table-card admin-table-card--large admin-events-card">
        <div className="admin-section-heading">
          <div>
            <h2>Próximos eventos</h2>
            <p>Reservas próximas con saldo, pago y datos de contacto.</p>
          </div>
          <Link to="/admin/calendario">Abrir calendario</Link>
        </div>
        <div className="admin-event-list">
          {upcomingReservations.map((reservation) => (
            <article key={reservation.id}>
              <div className="admin-event-list__date admin-event-list__date--text">
                <strong>{formatShortDate(reservation.startDate)}</strong>
              </div>
              <div className="admin-event-list__body">
                <div>
                  <h3>{reservation.clientName}</h3>
                  <span className="admin-status-pill">{reservation.paymentStatus}</span>
                </div>
                <p>{reservation.eventType} · {reservation.guests || "No aplica"} personas</p>
                <small>Ingreso: {formatShortDate(reservation.startDate)}, {reservation.startTime}</small>
                <small>Salida: {formatShortDate(reservation.endDate)}, {reservation.endTime}</small>
                <small>{reservation.clientPhone || "Sin teléfono cargado"}</small>
              </div>
              <div className="admin-event-list__amount">
                <span>Saldo pendiente</span>
                <strong>{formatGuaranies(reservation.balance)}</strong>
                <Link to="/admin/reservas">Gestionar</Link>
              </div>
            </article>
          ))}
        </div>
      </article>
    </section>
  );
}
