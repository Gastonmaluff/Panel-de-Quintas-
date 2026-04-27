import { useMemo, useState } from "react";
import { getMonthMatrix } from "../../utils/date.js";

const statusLabels = {
  available: "Disponible",
  reserved: "Reservado",
  preReserved: "Pre-reservado",
  blocked: "Bloqueado",
};

export default function AvailabilityCalendar({ availability }) {
  const today = new Date(2026, 4, 1);
  const [visibleMonth, setVisibleMonth] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  });

  const statusByDate = useMemo(
    () =>
      availability.reduce((accumulator, item) => {
        accumulator[item.date] = item;
        return accumulator;
      }, {}),
    [availability],
  );

  const cells = getMonthMatrix(visibleMonth.year, visibleMonth.month);
  const monthLabel = new Intl.DateTimeFormat("es-PY", {
    month: "long",
    year: "numeric",
  }).format(new Date(visibleMonth.year, visibleMonth.month, 1));

  const moveMonth = (direction) => {
    setVisibleMonth((current) => {
      const next = new Date(current.year, current.month + direction, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  };

  return (
    <section className="section-shell availability-section" id="disponibilidad">
      <div className="availability-section__intro">
        <p className="eyebrow">Disponibilidad</p>
        <h2>Calendario público</h2>
        <p>
          Datos mockeados en esta etapa, con estructura preparada para leer
          reservas y bloqueos desde Firestore por venue.
        </p>
      </div>

      <div className="calendar-panel">
        <div className="calendar-toolbar">
          <button type="button" onClick={() => moveMonth(-1)} aria-label="Mes anterior">
            ←
          </button>
          <h3>{monthLabel}</h3>
          <button type="button" onClick={() => moveMonth(1)} aria-label="Mes siguiente">
            →
          </button>
        </div>

        <div className="calendar-weekdays">
          {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>

        <div className="calendar-grid" aria-label="Calendario de disponibilidad">
          {cells.map((cell) => {
            const item = statusByDate[cell.iso];
            const status = item?.status || "available";
            return (
              <div
                className={`calendar-day calendar-day--${status} ${
                  cell.isCurrentMonth ? "" : "calendar-day--muted"
                }`}
                key={cell.iso}
              >
                <span>{cell.day}</span>
                <small>{cell.isCurrentMonth ? statusLabels[status] : ""}</small>
              </div>
            );
          })}
        </div>

        <div className="calendar-legend">
          {Object.entries(statusLabels).map(([status, label]) => (
            <span key={status}>
              <i className={`legend-dot legend-dot--${status}`} />
              {label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
