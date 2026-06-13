import { Link } from "react-router-dom";
import { CalendarCheck, CalendarDays, PiggyBank, WalletCards } from "lucide-react";
import { useAdminData } from "../admin/AdminDataProvider.jsx";
import { formatGuaranies } from "../utils/pricing.js";
import { getDayAvailabilityStatus } from "../utils/booking.js";

function isCurrentMonth(dateValue, currentMonth, currentYear) {
  const date = new Date(`${dateValue}T12:00:00`);
  return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
}

export default function AdminDashboard() {
  const { reservations, activeReservations, getReservationDates } = useAdminData();
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const monthReservations = activeReservations.filter((reservation) =>
    getReservationDates(reservation).some((date) => isCurrentMonth(date, currentMonth, currentYear)),
  );
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
  const pendingDeposits = reservations.filter((reservation) => reservation.paymentStatus === "Sin pago").length;

  const metrics = [
    { label: "Reservas del mes", value: monthReservations.length, icon: CalendarCheck },
    { label: "Ingresos cobrados", value: formatGuaranies(paidThisMonth), icon: WalletCards, compactValue: true },
    { label: "Señas pendientes", value: pendingDeposits, icon: PiggyBank },
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
    </section>
  );
}
