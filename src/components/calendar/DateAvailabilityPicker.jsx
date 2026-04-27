import { useMemo, useState } from "react";
import { getMonthMatrix } from "../../utils/date.js";
import {
  availabilityLabels,
  getFirstAvailabilityMonth,
  getDateAvailability,
} from "../../utils/availability.js";

function getInitialMonth(value, availability) {
  const fallbackMonth = getFirstAvailabilityMonth(availability);
  const baseDate = value
    ? new Date(`${value}T12:00:00`)
    : new Date(fallbackMonth.year, fallbackMonth.month, 1);
  return {
    year: baseDate.getFullYear(),
    month: baseDate.getMonth(),
  };
}

export default function DateAvailabilityPicker({
  availability,
  value,
  onChange,
  label = "Fecha",
}) {
  const [visibleMonth, setVisibleMonth] = useState(() => getInitialMonth(value, availability));

  const cells = useMemo(
    () => getMonthMatrix(visibleMonth.year, visibleMonth.month),
    [visibleMonth],
  );

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
    <div className="date-picker-field">
      <span>{label}</span>
      <div className="date-picker-panel">
        <div className="calendar-toolbar calendar-toolbar--compact">
          <button type="button" onClick={() => moveMonth(-1)} aria-label="Mes anterior">
            ←
          </button>
          <h3>{monthLabel}</h3>
          <button type="button" onClick={() => moveMonth(1)} aria-label="Mes siguiente">
            →
          </button>
        </div>

        <div className="calendar-weekdays calendar-weekdays--compact">
          {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>

        <div className="date-picker-grid" aria-label="Seleccionar fecha disponible">
          {cells.map((cell) => {
            const availabilityState = getDateAvailability(cell.iso, availability);
            const isSelected = value === cell.iso;
            const isDisabled = !cell.isCurrentMonth || !availabilityState.selectable;

            return (
              <button
                type="button"
                className={`date-picker-day date-picker-day--${availabilityState.status} ${
                  isSelected ? "is-selected" : ""
                } ${cell.isCurrentMonth ? "" : "date-picker-day--muted"}`}
                key={cell.iso}
                disabled={isDisabled}
                title={availabilityState.reason || availabilityState.label}
                onClick={() => onChange(cell.iso)}
              >
                <span>{cell.day}</span>
                <small>{cell.isCurrentMonth ? availabilityState.label : ""}</small>
              </button>
            );
          })}
        </div>

        <div className="calendar-legend calendar-legend--compact">
          {Object.entries(availabilityLabels).map(([status, statusLabel]) => (
            <span key={status}>
              <i className={`legend-dot legend-dot--${status}`} />
              {statusLabel}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
