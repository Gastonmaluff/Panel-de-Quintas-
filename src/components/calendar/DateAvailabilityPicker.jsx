import { useEffect, useMemo, useRef, useState } from "react";
import { getMonthMatrix } from "../../utils/date.js";
import {
  availabilityLabels,
  getFirstAvailabilityMonth,
  getDateAvailability,
} from "../../utils/availability.js";

function formatSelectedDate(value) {
  if (!value) return "Seleccionar fecha disponible";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

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
  minDate = "",
  allowReservedSelection = false,
}) {
  const pickerRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
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

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!pickerRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  return (
    <div className="date-picker-field" ref={pickerRef}>
      <span>{label}</span>
      <button
        type="button"
        className={`date-picker-trigger ${value ? "has-value" : ""}`}
        aria-expanded={isOpen}
        onClick={() => {
          setFeedback("");
          setIsOpen((current) => !current);
        }}
      >
        <span>{formatSelectedDate(value)}</span>
        <i aria-hidden="true">▾</i>
      </button>

      {feedback ? <p className="date-picker-feedback">{feedback}</p> : null}

      {isOpen ? (
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
            const isBeforeMinDate = Boolean(minDate && cell.iso < minDate);
            const isReservedSelectionAllowed =
              allowReservedSelection && ["reserved", "partialPaid"].includes(availabilityState.status);
            const isDisabled =
              !cell.isCurrentMonth ||
              isBeforeMinDate ||
              (!availabilityState.selectable && !isReservedSelectionAllowed);

            return (
              <button
                type="button"
                className={`date-picker-day date-picker-day--${availabilityState.status} ${
                  isSelected ? "is-selected" : ""
                } ${cell.isCurrentMonth ? "" : "date-picker-day--muted"}`}
                key={cell.iso}
                aria-disabled={isDisabled}
                title={
                  isBeforeMinDate
                    ? "La fecha de salida no puede ser anterior a la fecha de ingreso."
                    : availabilityState.reason || availabilityState.label
                }
                onClick={() => {
                  if (isDisabled) {
                    setFeedback(
                      isBeforeMinDate
                        ? "La fecha de salida no puede ser anterior a la fecha de ingreso."
                        : "Esa fecha no está disponible. Elegí otra fecha.",
                    );
                    return;
                  }
                  setFeedback("");
                  onChange(cell.iso);
                  setIsOpen(false);
                }}
              >
                <span>{cell.day}</span>
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
      ) : null}
    </div>
  );
}
