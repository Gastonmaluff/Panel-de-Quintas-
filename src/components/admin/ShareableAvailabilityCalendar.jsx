import logoStacked from "../../assets/branding/logo-official-stacked.png";
import { getMonthMatrix } from "../../utils/date.js";
import { getDateAvailability } from "../../utils/availability.js";

const weekdays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const statusText = {
  available: "Disponible",
  partial: "Parcial",
  reserved: "Reservado",
  preReserved: "Reservado",
  blocked: "Reservado",
  past: "Pasado",
  invalid: "No disponible",
};

const legendItems = [
  ["available", "Disponible"],
  ["partial", "Parcial"],
  ["reserved", "Reservado"],
  ["past", "Pasado"],
];

function getMonthTitle(year, month) {
  const date = new Date(year, month, 1);
  return new Intl.DateTimeFormat("es-PY", {
    month: "long",
    year: "numeric",
  }).format(date);
}

export default function ShareableAvailabilityCalendar({ availability, month, exportKey = "" }) {
  const cells = getMonthMatrix(month.year, month.month);
  const monthTitle = getMonthTitle(month.year, month.month);

  return (
    <article className="shareable-calendar" aria-label="Imagen de disponibilidad" data-export-key={exportKey}>
      <header className="shareable-calendar__header">
        <img src={logoStacked} alt="El Paraíso Escondido" loading="eager" decoding="sync" />
        <p>Disponibilidad</p>
        <h2>{monthTitle}</h2>
      </header>

      <div className="shareable-calendar__weekdays">
        {weekdays.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="shareable-calendar__grid">
        {cells.map((cell) => {
          const availabilityState = getDateAvailability(cell.iso, availability);
          const normalizedStatus = ["available", "partial", "past"].includes(availabilityState.status)
            ? availabilityState.status
            : "reserved";
          const status = cell.isCurrentMonth ? normalizedStatus : "outside";

          return (
            <div
              className={`shareable-calendar__day shareable-calendar__day--${status}`}
              key={cell.iso}
            >
              <strong>{cell.day}</strong>
              {cell.isCurrentMonth ? <span>{statusText[availabilityState.status]}</span> : null}
            </div>
          );
        })}
      </div>

      <footer className="shareable-calendar__footer">
        <div className="shareable-calendar__legend">
          {legendItems.map(([status, label]) => (
            <span key={status}>
              <i className={`shareable-calendar__dot shareable-calendar__dot--${status}`} />
              {label}
            </span>
          ))}
        </div>
        <p>Consultas y reservas por WhatsApp</p>
      </footer>
    </article>
  );
}
