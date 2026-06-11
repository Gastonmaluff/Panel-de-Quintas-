import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DateAvailabilityPicker from "../components/calendar/DateAvailabilityPicker.jsx";
import { useAdminData } from "../admin/AdminDataProvider.jsx";
import { getMonthMatrix } from "../utils/date.js";
import {
  DEFAULT_START_TIME,
  findOverlappingReservation,
  getDayAvailabilityStatus,
  getDefaultEndTime,
  getReservationValidationMessage,
  getReservationsForDate,
} from "../utils/booking.js";
import { formatGuaranies } from "../utils/pricing.js";
import {
  cleanParaguayPhone,
  formatAmountInput,
  formatParaguayPhone,
  parseAmountInput,
  titleCaseName,
} from "../utils/formatters.js";

const weekdays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function formatLongDate(dateValue) {
  return new Intl.DateTimeFormat("es-PY", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${dateValue}T12:00:00`));
}

function createReservationDraft(dateValue) {
  return {
    clientName: "",
    clientCedula: "",
    clientPhone: "",
    startDate: dateValue,
    startTime: DEFAULT_START_TIME,
    endDate: dateValue,
    endTime: getDefaultEndTime(dateValue, dateValue),
    eventType: "Evento",
    guests: "",
    totalAmount: "",
    initialPayment: "",
    notes: "",
  };
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function AmountInput({ value, onChange }) {
  return (
    <input
      inputMode="numeric"
      placeholder="0"
      value={formatAmountInput(value)}
      onFocus={() => {
        if (Number(value || 0) === 0) onChange("");
      }}
      onChange={(event) => onChange(parseAmountInput(event.target.value) || "")}
    />
  );
}

function updateDraftDate(current, key, value) {
  const next = { ...current, [key]: value };
  if (key === "startDate") next.endDate = current.endDate && current.endDate >= value ? current.endDate : value;
  next.endTime = getDefaultEndTime(next.startDate, next.endDate);
  return next;
}

export default function AdminCalendar() {
  const today = new Date();
  const { reservations, activeReservations, availability, addReservation } = useAdminData();
  const [visibleMonth, setVisibleMonth] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selectedDay, setSelectedDay] = useState(null);
  const [reservationDraft, setReservationDraft] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const cells = getMonthMatrix(visibleMonth.year, visibleMonth.month);
  const monthLabel = new Intl.DateTimeFormat("es-PY", { month: "long", year: "numeric" }).format(
    new Date(visibleMonth.year, visibleMonth.month, 1),
  );
  const selectedReservations = useMemo(
    () => (selectedDay ? getReservationsForDate(selectedDay.iso, activeReservations) : []),
    [activeReservations, selectedDay],
  );
  const validationMessage = reservationDraft ? getReservationValidationMessage(reservationDraft) : "";
  const overlappingReservation =
    reservationDraft && !validationMessage
      ? findOverlappingReservation(reservations, reservationDraft)
      : null;
  const canSaveReservation =
    Boolean(reservationDraft?.clientName?.trim()) && !validationMessage && !overlappingReservation;

  const moveMonth = (direction) => {
    setVisibleMonth((current) => {
      const next = new Date(current.year, current.month + direction, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  };

  const closeModal = () => {
    setSelectedDay(null);
    setReservationDraft(null);
  };

  const saveReservation = async () => {
    if (!canSaveReservation || isSaving) return;
    setIsSaving(true);
    try {
      await addReservation({
        ...reservationDraft,
        clientName: titleCaseName(reservationDraft.clientName),
        clientPhone: cleanParaguayPhone(reservationDraft.clientPhone),
        guests: Number(reservationDraft.guests || 0),
        totalAmount: Number(reservationDraft.totalAmount || 0),
        payments:
          Number(reservationDraft.initialPayment || 0) > 0
            ? [{ amount: Number(reservationDraft.initialPayment), method: "Transferencia", type: "seña" }]
            : [],
      });
      closeModal();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="admin-section admin-calendar-section">
      <div className="admin-section-heading">
        <div>
          <h2>Calendario</h2>
          <p>Ver disponibilidad por fecha y horario, revisar detalles y crear reservas.</p>
        </div>
      </div>

      <div className="admin-calendar-shell">
        <div className="admin-calendar-toolbar">
          <button type="button" onClick={() => moveMonth(-1)} aria-label="Mes anterior">←</button>
          <h3>{monthLabel}</h3>
          <button type="button" onClick={() => moveMonth(1)} aria-label="Mes siguiente">→</button>
        </div>

        <div className="admin-calendar-weekdays">
          {weekdays.map((day) => <span key={day}>{day}</span>)}
        </div>

        <div className="admin-calendar-grid">
          {cells.map((cell) => {
            const status = getDayAvailabilityStatus(cell.iso, activeReservations);
            const dayReservations = getReservationsForDate(cell.iso, activeReservations);
            const isPast = status === "past";

            return (
              <button
                className={`admin-calendar-day admin-calendar-day--${status} ${cell.isCurrentMonth ? "" : "is-muted"}`}
                type="button"
                key={cell.iso}
                disabled={isPast || !cell.isCurrentMonth}
                onClick={() => setSelectedDay({ ...cell, status })}
              >
                <span className="admin-calendar-day__number">{cell.day}</span>
                {dayReservations.length ? (
                  <>
                    <span className="admin-calendar-day__status">{status === "partial" ? "Parcial" : "Reservado"}</span>
                    <strong>{dayReservations[0].clientName}</strong>
                    <small>{dayReservations[0].startTime} - {dayReservations[0].endTime}</small>
                  </>
                ) : isPast ? (
                  <strong className="admin-calendar-day__free">PASADO</strong>
                ) : (
                  <strong className="admin-calendar-day__free">LIBRE</strong>
                )}
              </button>
            );
          })}
        </div>

        <div className="admin-calendar-legend">
          <span><i className="admin-status-dot admin-status-dot--available" />Disponible</span>
          <span><i className="admin-status-dot admin-status-dot--reserved" />Reservado</span>
          <span><i className="admin-status-dot admin-status-dot--partial" />Ocupación parcial</span>
          <span><i className="admin-status-dot admin-status-dot--past" />Pasado</span>
        </div>
      </div>

      <article className="admin-table-card admin-table-card--large">
        <div className="admin-section-heading">
          <div>
            <h2>Próximos eventos</h2>
            <p>Acceso rápido a la lista operativa de reservas.</p>
          </div>
          <Link to="/admin/reservas">Gestionar reservas</Link>
        </div>
      </article>

      {selectedDay ? (
        <div className="admin-modal-backdrop" role="presentation">
          <div className="admin-modal" role="dialog" aria-modal="true">
            <div className="admin-modal__header">
              <div>
                <p className="eyebrow">{formatLongDate(selectedDay.iso)}</p>
                <h3>{selectedReservations.length ? "Bloques del día" : "Fecha libre"}</h3>
              </div>
              <button type="button" onClick={closeModal}>Cerrar</button>
            </div>

            {reservationDraft ? (
              <>
                <div className="reservation-edit-form">
                  <label>Cliente<input value={reservationDraft.clientName} onBlur={() => setReservationDraft((current) => ({ ...current, clientName: titleCaseName(current.clientName) }))} onChange={(event) => setReservationDraft((current) => ({ ...current, clientName: event.target.value }))} /></label>
                  <label>Número de cédula<input value={reservationDraft.clientCedula} onChange={(event) => setReservationDraft((current) => ({ ...current, clientCedula: event.target.value.replace(/\D/g, "") }))} /></label>
                  <label>Teléfono<input inputMode="numeric" value={formatParaguayPhone(reservationDraft.clientPhone)} onChange={(event) => setReservationDraft((current) => ({ ...current, clientPhone: formatParaguayPhone(event.target.value) }))} /></label>
                  <DateAvailabilityPicker availability={availability} value={reservationDraft.startDate} onChange={(date) => setReservationDraft((current) => updateDraftDate(current, "startDate", date))} label="Fecha de ingreso" />
                  <label>Hora ingreso<input type="time" value={reservationDraft.startTime} onChange={(event) => setReservationDraft((current) => ({ ...current, startTime: event.target.value }))} /></label>
                  <DateAvailabilityPicker availability={availability} value={reservationDraft.endDate} minDate={reservationDraft.startDate} onChange={(date) => setReservationDraft((current) => updateDraftDate(current, "endDate", date))} label="Fecha de salida" />
                  <label>Hora salida<input type="time" value={reservationDraft.endTime} onChange={(event) => setReservationDraft((current) => ({ ...current, endTime: event.target.value }))} /></label>
                  <label>Evento<input value={reservationDraft.eventType} onChange={(event) => setReservationDraft((current) => ({ ...current, eventType: event.target.value }))} /></label>
                  <label>Personas<input inputMode="numeric" value={reservationDraft.guests} onChange={(event) => setReservationDraft((current) => ({ ...current, guests: event.target.value.replace(/\D/g, "") }))} /></label>
                  <label>Precio total<AmountInput value={reservationDraft.totalAmount} onChange={(totalAmount) => setReservationDraft((current) => ({ ...current, totalAmount }))} /></label>
                  <label>Seña inicial<AmountInput value={reservationDraft.initialPayment} onChange={(initialPayment) => setReservationDraft((current) => ({ ...current, initialPayment }))} /></label>
                </div>
                {!canSaveReservation ? (
                  <p className="admin-form-warning">
                    {!reservationDraft.clientName?.trim()
                      ? "El nombre del cliente es obligatorio."
                      : validationMessage || "Ya existe una reserva en ese rango de fecha y horario."}
                  </p>
                ) : null}
                <div className="admin-modal__actions">
                  <button type="button" onClick={saveReservation} disabled={!canSaveReservation || isSaving}>{isSaving ? "Guardando..." : "Guardar reserva"}</button>
                  <button type="button" className="admin-secondary-button" onClick={() => setReservationDraft(null)}>Volver</button>
                </div>
              </>
            ) : (
              <div className="admin-free-date-panel">
                <strong>{formatLongDate(selectedDay.iso)}</strong>
                {selectedReservations.length ? (
                  <div className="admin-day-blocks">
                    {selectedReservations.map((reservation) => (
                      <article key={reservation.id}>
                        <strong>{reservation.clientName}</strong>
                        <span>{reservation.startDate} {reservation.startTime} - {reservation.endDate} {reservation.endTime}</span>
                        <small>Saldo: {formatGuaranies(reservation.balance)}</small>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p>Esta fecha está disponible para crear una reserva.</p>
                )}
                <div className="admin-modal__actions">
                  <button type="button" onClick={() => setReservationDraft(createReservationDraft(selectedDay.iso))}>
                    Crear reserva
                  </button>
                  <button type="button" className="admin-secondary-button" onClick={closeModal}>Cancelar</button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
