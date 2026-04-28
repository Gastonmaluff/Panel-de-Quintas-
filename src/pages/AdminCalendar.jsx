import { useMemo, useState } from "react";
import { adminReservationsMock, adminReservationStatuses } from "../data/adminData.js";
import { formatGuaranies } from "../utils/pricing.js";
import { getMonthMatrix } from "../utils/date.js";

const weekdays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function getStatusClass(status) {
  return status
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll(" ", "-");
}

function DetailItem({ label, value }) {
  return (
    <div className="admin-detail-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ReservationDetails({ reservation, variant = "compact" }) {
  if (!reservation) return null;

  if (variant === "full") {
    const statusClass = getStatusClass(reservation.status);

    return (
      <div className="admin-reservation-panel">
        <div className="admin-reservation-panel__hero">
          <div>
            <span className={`admin-status-pill admin-status-pill--${statusClass}`}>
              {reservation.status}
            </span>
            <h4>{reservation.customerName}</h4>
            <p>
              {reservation.eventType} · {reservation.timeSlot}
            </p>
          </div>
          <div>
            <small>Total estimado</small>
            <strong>{formatGuaranies(reservation.totalPrice)}</strong>
          </div>
        </div>

        <div className="admin-detail-grid">
          <DetailItem label="Fecha" value={reservation.eventDate} />
          <DetailItem label="Teléfono" value={reservation.customerPhone || "Sin teléfono"} />
          <DetailItem label="Personas" value={reservation.guestCount || "No aplica"} />
          <DetailItem label="Seña" value={formatGuaranies(reservation.depositAmount)} />
          <DetailItem label="Saldo" value={formatGuaranies(reservation.balanceAmount)} />
          <DetailItem label="Horario" value={reservation.timeSlot} />
        </div>

        <div className="admin-detail-note">
          <span>Notas internas</span>
          <p>{reservation.notes || "Sin notas cargadas."}</p>
        </div>
      </div>
    );
  }

  return (
    <dl className="admin-reservation-detail">
      <dt>Cliente</dt>
      <dd>{reservation.customerName}</dd>
      <dt>Teléfono</dt>
      <dd>{reservation.customerPhone || "Sin teléfono"}</dd>
      <dt>Fecha</dt>
      <dd>{reservation.eventDate}</dd>
      <dt>Evento</dt>
      <dd>{reservation.eventType}</dd>
      <dt>Personas</dt>
      <dd>{reservation.guestCount || "No aplica"}</dd>
      <dt>Horario</dt>
      <dd>{reservation.timeSlot}</dd>
      <dt>Precio total</dt>
      <dd>{formatGuaranies(reservation.totalPrice)}</dd>
      <dt>Seña</dt>
      <dd>{formatGuaranies(reservation.depositAmount)}</dd>
      <dt>Saldo</dt>
      <dd>{formatGuaranies(reservation.balanceAmount)}</dd>
      <dt>Estado</dt>
      <dd>{reservation.status}</dd>
      <dt>Notas</dt>
      <dd>{reservation.notes}</dd>
    </dl>
  );
}

export default function AdminCalendar() {
  const today = new Date();
  const [visibleMonth, setVisibleMonth] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  });
  const [selectedDay, setSelectedDay] = useState(null);

  const reservationsByDate = useMemo(
    () =>
      adminReservationsMock.reduce((accumulator, reservation) => {
        accumulator[reservation.eventDate] = reservation;
        return accumulator;
      }, {}),
    [],
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

  const selectedReservation = selectedDay ? reservationsByDate[selectedDay.iso] : null;

  return (
    <section className="admin-section admin-calendar-section">
      <div className="admin-section-heading">
        <div>
          <h2>Calendario interno</h2>
          <p>Vista mensual para administrar reservas, bloqueos y pagos.</p>
        </div>
        <div>
          <button type="button">Bloquear fecha</button>
          <button type="button">Nueva reserva</button>
        </div>
      </div>

      <div className="admin-calendar-shell">
        <div className="admin-calendar-toolbar">
          <button type="button" onClick={() => moveMonth(-1)} aria-label="Mes anterior">
            ←
          </button>
          <h3>{monthLabel}</h3>
          <button type="button" onClick={() => moveMonth(1)} aria-label="Mes siguiente">
            →
          </button>
        </div>

        <div className="admin-calendar-weekdays">
          {weekdays.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>

        <div className="admin-calendar-grid">
          {cells.map((cell) => {
            const reservation = reservationsByDate[cell.iso];
            const status = reservation?.status || "libre";

            return (
              <button
                className={`admin-calendar-day admin-calendar-day--${getStatusClass(status)} ${
                  cell.isCurrentMonth ? "" : "is-muted"
                }`}
                type="button"
                key={cell.iso}
                onClick={() => setSelectedDay({ ...cell, status })}
              >
                <span className="admin-calendar-day__number">{cell.day}</span>
                <span className="admin-calendar-day__status">{status}</span>
                {reservation ? (
                  <>
                    <strong>{reservation.customerName}</strong>
                    <small>
                      {reservation.eventType} · {formatGuaranies(reservation.totalPrice)}
                    </small>
                    <div className="admin-calendar-popover">
                      <ReservationDetails reservation={reservation} />
                    </div>
                  </>
                ) : (
                  <small>Libre para consulta o bloqueo</small>
                )}
              </button>
            );
          })}
        </div>

        <div className="admin-calendar-legend">
          {["libre", ...adminReservationStatuses].map((status) => (
            <span key={status}>
              <i className={`admin-status-dot admin-status-dot--${getStatusClass(status)}`} />
              {status}
            </span>
          ))}
        </div>
      </div>

      {selectedDay ? (
        <div className="admin-modal-backdrop" role="presentation">
          <div className="admin-modal" role="dialog" aria-modal="true">
            <div className="admin-modal__header">
              <div>
                <p className="eyebrow">{selectedDay.iso}</p>
                <h3>{selectedReservation ? "Detalle de reserva" : "Fecha libre"}</h3>
              </div>
              <button type="button" onClick={() => setSelectedDay(null)}>
                Cerrar
              </button>
            </div>

            {selectedReservation ? (
              <>
                <ReservationDetails reservation={selectedReservation} variant="full" />
                <div className="admin-modal__actions">
                  <button type="button">Editar reserva</button>
                  <button type="button">Marcar seña recibida</button>
                  <button type="button">Cancelar reserva</button>
                </div>
              </>
            ) : (
              <div className="admin-empty-action">
                <p>Esta fecha no tiene reservas ni bloqueos.</p>
                <button type="button">Crear reserva manual</button>
                <button type="button">Bloquear fecha</button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
