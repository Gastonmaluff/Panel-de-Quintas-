import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAdminData } from "../admin/AdminDataProvider.jsx";
import { getMonthMatrix } from "../utils/date.js";
import { isRangeAvailable } from "../utils/availability.js";
import { formatGuaranies } from "../utils/pricing.js";

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
    clientPhone: "",
    startDate: dateValue,
    startTime: "07:00",
    endDate: dateValue,
    endTime: "19:00",
    eventType: "Evento",
    guests: 0,
    totalAmount: 0,
    initialPayment: 0,
    notes: "",
  };
}

export default function AdminCalendar() {
  const today = new Date();
  const { reservations, availability, addReservation, getReservationDates } = useAdminData();
  const [visibleMonth, setVisibleMonth] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selectedDay, setSelectedDay] = useState(null);
  const [reservationDraft, setReservationDraft] = useState(null);

  const reservationsByDate = useMemo(
    () =>
      reservations.reduce((accumulator, reservation) => {
        if (reservation.status === "cancelada") return accumulator;
        getReservationDates(reservation).forEach((date) => {
          accumulator[date] = reservation;
        });
        return accumulator;
      }, {}),
    [reservations, getReservationDates],
  );
  const cells = getMonthMatrix(visibleMonth.year, visibleMonth.month);
  const monthLabel = new Intl.DateTimeFormat("es-PY", { month: "long", year: "numeric" }).format(
    new Date(visibleMonth.year, visibleMonth.month, 1),
  );
  const selectedReservation = selectedDay ? reservationsByDate[selectedDay.iso] : null;
  const canSaveReservation =
    reservationDraft?.clientName?.trim() &&
    isRangeAvailable(reservationDraft.startDate, reservationDraft.endDate, availability);

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

  const saveReservation = () => {
    if (!canSaveReservation) return;
    addReservation({
      ...reservationDraft,
      payments:
        Number(reservationDraft.initialPayment || 0) > 0
          ? [{ amount: Number(reservationDraft.initialPayment), method: "Transferencia", type: "seña" }]
          : [],
    });
    closeModal();
  };

  return (
    <section className="admin-section admin-calendar-section">
      <div className="admin-section-heading">
        <div>
          <h2>Calendario</h2>
          <p>Ver disponibilidad, revisar detalles y crear reservas desde fechas libres.</p>
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
            const reservation = reservationsByDate[cell.iso];
            const status = reservation ? "reservado" : "libre";

            return (
              <button
                className={`admin-calendar-day admin-calendar-day--${status} ${cell.isCurrentMonth ? "" : "is-muted"}`}
                type="button"
                key={cell.iso}
                onClick={() => setSelectedDay({ ...cell, status })}
              >
                <span className="admin-calendar-day__number">{cell.day}</span>
                {reservation ? (
                  <>
                    <span className="admin-calendar-day__status">Reservado</span>
                    <strong>{reservation.clientName}</strong>
                    <small>{reservation.eventType}</small>
                  </>
                ) : (
                  <strong className="admin-calendar-day__free">LIBRE</strong>
                )}
              </button>
            );
          })}
        </div>

        <div className="admin-calendar-legend">
          <span><i className="admin-status-dot admin-status-dot--libre" />Disponible</span>
          <span><i className="admin-status-dot admin-status-dot--reservado" />Reservado</span>
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
                <h3>{selectedReservation ? "Detalle de reserva" : "Fecha libre"}</h3>
              </div>
              <button type="button" onClick={closeModal}>Cerrar</button>
            </div>

            {selectedReservation ? (
              <div className="admin-reservation-panel">
                <div className="admin-reservation-panel__hero">
                  <div>
                    <span className="admin-status-pill">{selectedReservation.paymentStatus}</span>
                    <h4>{selectedReservation.clientName}</h4>
                    <p>{selectedReservation.eventType} · {selectedReservation.guests || "No aplica"} personas</p>
                  </div>
                  <div>
                    <small>Saldo</small>
                    <strong>{formatGuaranies(selectedReservation.balance)}</strong>
                  </div>
                </div>
                <div className="admin-detail-grid">
                  <div className="admin-detail-item"><span>Teléfono</span><strong>{selectedReservation.clientPhone || "Sin teléfono"}</strong></div>
                  <div className="admin-detail-item"><span>Ingreso</span><strong>{selectedReservation.startDate} · {selectedReservation.startTime}</strong></div>
                  <div className="admin-detail-item"><span>Egreso</span><strong>{selectedReservation.endDate} · {selectedReservation.endTime}</strong></div>
                  <div className="admin-detail-item"><span>Total</span><strong>{formatGuaranies(selectedReservation.totalAmount)}</strong></div>
                  <div className="admin-detail-item"><span>Pagado</span><strong>{formatGuaranies(selectedReservation.totalPaid)}</strong></div>
                  <div className="admin-detail-item"><span>Comprobantes</span><strong>{selectedReservation.payments.filter((payment) => payment.receiptName).length}</strong></div>
                </div>
              </div>
            ) : reservationDraft ? (
              <>
                <div className="reservation-edit-form">
                  <label>Cliente<input value={reservationDraft.clientName} onChange={(event) => setReservationDraft((current) => ({ ...current, clientName: event.target.value }))} /></label>
                  <label>Teléfono<input value={reservationDraft.clientPhone} onChange={(event) => setReservationDraft((current) => ({ ...current, clientPhone: event.target.value }))} /></label>
                  <label>Ingreso<input type="date" value={reservationDraft.startDate} onChange={(event) => setReservationDraft((current) => ({ ...current, startDate: event.target.value }))} /></label>
                  <label>Hora ingreso<input type="time" value={reservationDraft.startTime} onChange={(event) => setReservationDraft((current) => ({ ...current, startTime: event.target.value }))} /></label>
                  <label>Egreso<input type="date" value={reservationDraft.endDate} onChange={(event) => setReservationDraft((current) => ({ ...current, endDate: event.target.value }))} /></label>
                  <label>Hora egreso<input type="time" value={reservationDraft.endTime} onChange={(event) => setReservationDraft((current) => ({ ...current, endTime: event.target.value }))} /></label>
                  <label>Evento<input value={reservationDraft.eventType} onChange={(event) => setReservationDraft((current) => ({ ...current, eventType: event.target.value }))} /></label>
                  <label>Precio total<input type="number" value={reservationDraft.totalAmount} onChange={(event) => setReservationDraft((current) => ({ ...current, totalAmount: Number(event.target.value) }))} /></label>
                  <label>Seña inicial<input type="number" value={reservationDraft.initialPayment} onChange={(event) => setReservationDraft((current) => ({ ...current, initialPayment: Number(event.target.value) }))} /></label>
                </div>
                {!canSaveReservation ? <p className="admin-form-warning">El rango elegido cruza una fecha ocupada o falta el cliente.</p> : null}
                <div className="admin-modal__actions">
                  <button type="button" onClick={saveReservation} disabled={!canSaveReservation}>Guardar reserva</button>
                  <button type="button" onClick={() => setReservationDraft(null)}>Volver</button>
                </div>
              </>
            ) : (
              <div className="admin-free-date-panel">
                <strong>{formatLongDate(selectedDay.iso)}</strong>
                <p>Esta fecha está disponible para crear una reserva.</p>
                <div className="admin-modal__actions">
                  <button type="button" onClick={() => setReservationDraft(createReservationDraft(selectedDay.iso))}>Crear reserva</button>
                  <button type="button" onClick={closeModal}>Cancelar</button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
