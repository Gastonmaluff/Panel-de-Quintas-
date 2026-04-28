import { useState } from "react";
import { getMonthMatrix } from "../../utils/date.js";
import {
  availabilityLabels,
  getDateAvailability,
  getFirstAvailabilityMonth,
} from "../../utils/availability.js";

export default function AvailabilityCalendar({ availability }) {
  const [visibleMonth, setVisibleMonth] = useState(() =>
    getFirstAvailabilityMonth(availability),
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
          Revisá las fechas libres, reservadas, pre-reservadas o bloqueadas antes
          de consultar por tu evento.
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
            const availabilityState = getDateAvailability(cell.iso, availability);
            const status = availabilityState.status;
            return (
              <div
                className={`calendar-day calendar-day--${status} ${
                  cell.isCurrentMonth ? "" : "calendar-day--muted"
                }`}
                key={cell.iso}
                title={availabilityState.reason || availabilityState.label}
              >
                <span>{cell.day}</span>
                <small>{cell.isCurrentMonth ? availabilityState.label : ""}</small>
              </div>
            );
          })}
        </div>

        <div className="calendar-legend">
          {Object.entries(availabilityLabels).map(([status, label]) => (
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
