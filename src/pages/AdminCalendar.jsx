import { useMemo, useState } from "react";
import { buildAdminAvailability, useAdminData } from "../admin/AdminDataProvider.jsx";
import BookingFields from "../components/admin/BookingFields.jsx";
import { adminReservationStatuses } from "../data/adminData.js";
import { getMonthMatrix } from "../utils/date.js";
import { isRangeAvailable } from "../utils/availability.js";
import {
  formatBookingRange,
  getBookingModeLabel,
  getBookingDurationLabel,
  getReservationDates,
  normalizeBooking,
} from "../utils/booking.js";
import { formatGuaranies } from "../utils/pricing.js";

const weekdays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function getStatusClass(status) {
  return status
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll(" ", "-");
}

function formatLongDate(dateValue) {
  return new Intl.DateTimeFormat("es-PY", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${dateValue}T12:00:00`));
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

  const booking = normalizeBooking(reservation);
  const range = formatBookingRange(reservation);

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
              {reservation.eventType} · {getBookingModeLabel(booking.bookingMode)}
            </p>
          </div>
          <div>
            <small>Total estimado</small>
            <strong>{formatGuaranies(reservation.totalPrice)}</strong>
          </div>
        </div>

        <div className="admin-detail-grid">
          <DetailItem label="Ingreso" value={range.start} />
          <DetailItem label="Egreso" value={range.end} />
          <DetailItem label="Duración" value={getBookingDurationLabel(reservation)} />
          <DetailItem label="Teléfono" value={reservation.customerPhone || "Sin teléfono"} />
          <DetailItem label="Personas" value={reservation.guestCount || "No aplica"} />
          <DetailItem label="Seña" value={formatGuaranies(reservation.depositAmount)} />
          <DetailItem label="Saldo" value={formatGuaranies(reservation.balanceAmount)} />
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
      <dt>Ingreso</dt>
      <dd>{range.start}</dd>
      <dt>Egreso</dt>
      <dd>{range.end}</dd>
      <dt>Evento</dt>
      <dd>{reservation.eventType}</dd>
      <dt>Personas</dt>
      <dd>{reservation.guestCount || "No aplica"}</dd>
      <dt>Tipo de reserva</dt>
      <dd>{getBookingModeLabel(booking.bookingMode)}</dd>
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

function createReservationDraft(dateValue) {
  return {
    customerName: "",
    customerPhone: "",
    startDate: dateValue,
    startTime: "07:00",
    endDate: dateValue,
    endTime: "19:00",
    bookingMode: "day",
    eventType: "Cumpleaños",
    guestCount: 0,
    totalPrice: 0,
    depositAmount: 0,
    balanceAmount: 0,
    status: "pre-reserva",
    notes: "",
  };
}

export default function AdminCalendar() {
  const today = new Date();
  const { reservations, addReservation } = useAdminData();
  const [visibleMonth, setVisibleMonth] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  });
  const [selectedDay, setSelectedDay] = useState(null);
  const [reservationDraft, setReservationDraft] = useState(null);
  const [freeDateMode, setFreeDateMode] = useState(null);
  const [blockReason, setBlockReason] = useState("");

  const reservationsByDate = useMemo(
    () =>
      reservations.reduce((accumulator, reservation) => {
        getReservationDates(reservation).forEach((date) => {
          accumulator[date] = reservation;
        });
        return accumulator;
      }, {}),
    [reservations],
  );

  const availability = useMemo(() => buildAdminAvailability(reservations), [reservations]);
  const cells = getMonthMatrix(visibleMonth.year, visibleMonth.month);
  const monthLabel = new Intl.DateTimeFormat("es-PY", {
    month: "long",
    year: "numeric",
  }).format(new Date(visibleMonth.year, visibleMonth.month, 1));
  const selectedReservation = selectedDay ? reservationsByDate[selectedDay.iso] : null;
  const canSaveReservation =
    reservationDraft?.startDate &&
    reservationDraft?.endDate &&
    isRangeAvailable(reservationDraft.startDate, reservationDraft.endDate, availability) &&
    reservationDraft.customerName.trim();

  const moveMonth = (direction) => {
    setVisibleMonth((current) => {
      const next = new Date(current.year, current.month + direction, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  };

  const closeModal = () => {
    setSelectedDay(null);
    setReservationDraft(null);
    setFreeDateMode(null);
    setBlockReason("");
  };

  const openReservationForm = (dateValue) => {
    setReservationDraft(createReservationDraft(dateValue));
    setFreeDateMode("reservation");
    setBlockReason("");
  };

  const saveReservation = () => {
    if (!canSaveReservation) return;
    addReservation(reservationDraft);
    closeModal();
  };

  const openBlockForm = () => {
    setReservationDraft(null);
    setFreeDateMode("block");
    setBlockReason("");
  };

  const saveBlockedDate = () => {
    if (!selectedDay?.iso || !isRangeAvailable(selectedDay.iso, selectedDay.iso, availability)) {
      return;
    }

    addReservation({
      customerName: "Fecha bloqueada",
      customerPhone: "",
      startDate: selectedDay.iso,
      startTime: "07:00",
      endDate: selectedDay.iso,
      endTime: "19:00",
      bookingMode: "day",
      eventType: "Bloqueo",
      guestCount: 0,
      totalPrice: 0,
      depositAmount: 0,
      balanceAmount: 0,
      status: "bloqueada",
      notes: blockReason || "Fecha bloqueada desde calendario.",
    });
    closeModal();
  };

  return (
    <section className="admin-section admin-calendar-section">
      <div className="admin-section-heading">
        <div>
          <h2>Calendario interno</h2>
          <p>Elegí una fecha para ver el detalle, crear una reserva o bloquear el día.</p>
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
            const booking = reservation ? normalizeBooking(reservation) : null;

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
                {reservation ? (
                  <>
                    <span className="admin-calendar-day__status">{status}</span>
                    <strong>{reservation.customerName}</strong>
                    <small>
                      {reservation.eventType} · {getBookingModeLabel(booking.bookingMode)}
                    </small>
                    <div className="admin-calendar-popover">
                      <ReservationDetails reservation={reservation} />
                    </div>
                  </>
                ) : (
                  <strong className="admin-calendar-day__free">LIBRE</strong>
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
                <p className="eyebrow">{formatLongDate(selectedDay.iso)}</p>
                <h3>{selectedReservation ? "Detalle de reserva" : "Fecha libre"}</h3>
              </div>
              <button type="button" onClick={closeModal}>
                Cerrar
              </button>
            </div>

            {selectedReservation ? (
              <>
                <ReservationDetails reservation={selectedReservation} variant="full" />
                <div className="admin-modal__actions">
                  <button type="button">Marcar seña recibida</button>
                  <button type="button">Cancelar reserva</button>
                </div>
              </>
            ) : freeDateMode === "reservation" && reservationDraft ? (
              <>
                <div className="reservation-edit-form">
                  <label>
                    Nombre del cliente
                    <input
                      value={reservationDraft.customerName}
                      onChange={(event) =>
                        setReservationDraft((current) => ({
                          ...current,
                          customerName: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    Teléfono
                    <input
                      value={reservationDraft.customerPhone}
                      onChange={(event) =>
                        setReservationDraft((current) => ({
                          ...current,
                          customerPhone: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <BookingFields
                    availability={availability}
                    value={reservationDraft}
                    onChange={(booking) =>
                      setReservationDraft((current) => ({ ...current, ...booking }))
                    }
                    eventField={(
                      <label>
                        Tipo de evento
                        <input
                          value={reservationDraft.eventType}
                          onChange={(event) =>
                            setReservationDraft((current) => ({
                              ...current,
                              eventType: event.target.value,
                            }))
                          }
                        />
                      </label>
                    )}
                  />
                  <label>
                    Personas
                    <input
                      type="number"
                      value={reservationDraft.guestCount}
                      onChange={(event) =>
                        setReservationDraft((current) => ({
                          ...current,
                          guestCount: Number(event.target.value),
                        }))
                      }
                    />
                  </label>
                  <label>
                    Estado
                    <select
                      value={reservationDraft.status}
                      onChange={(event) =>
                        setReservationDraft((current) => ({
                          ...current,
                          status: event.target.value,
                        }))
                      }
                    >
                      {adminReservationStatuses
                        .filter((status) => status !== "bloqueada")
                        .map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    Precio total
                    <input
                      type="number"
                      value={reservationDraft.totalPrice}
                      onChange={(event) =>
                        setReservationDraft((current) => ({
                          ...current,
                          totalPrice: Number(event.target.value),
                        }))
                      }
                    />
                  </label>
                  <label>
                    Seña
                    <input
                      type="number"
                      value={reservationDraft.depositAmount}
                      onChange={(event) =>
                        setReservationDraft((current) => ({
                          ...current,
                          depositAmount: Number(event.target.value),
                        }))
                      }
                    />
                  </label>
                  <label>
                    Saldo
                    <input
                      type="number"
                      value={reservationDraft.balanceAmount}
                      onChange={(event) =>
                        setReservationDraft((current) => ({
                          ...current,
                          balanceAmount: Number(event.target.value),
                        }))
                      }
                    />
                  </label>
                  <label className="reservation-edit-form__notes">
                    Notas internas
                    <textarea
                      value={reservationDraft.notes}
                      onChange={(event) =>
                        setReservationDraft((current) => ({
                          ...current,
                          notes: event.target.value,
                        }))
                      }
                    />
                  </label>
                </div>
                <div className="admin-modal__actions">
                  <button type="button" onClick={saveReservation} disabled={!canSaveReservation}>
                    Guardar reserva
                  </button>
                  <button type="button" onClick={() => setReservationDraft(null)}>
                    Volver
                  </button>
                </div>
              </>
            ) : freeDateMode === "block" ? (
              <>
                <div className="admin-free-date-panel">
                  <strong>{formatLongDate(selectedDay.iso)}</strong>
                  <p>Agregá un motivo opcional para recordar por qué esta fecha no se ofrece.</p>
                  <label>
                    Motivo
                    <textarea
                      value={blockReason}
                      onChange={(event) => setBlockReason(event.target.value)}
                    />
                  </label>
                </div>
                <div className="admin-modal__actions">
                  <button type="button" onClick={saveBlockedDate}>
                    Guardar bloqueo
                  </button>
                  <button type="button" onClick={() => setFreeDateMode(null)}>
                    Volver
                  </button>
                </div>
              </>
            ) : (
              <div className="admin-free-date-panel">
                <strong>{formatLongDate(selectedDay.iso)}</strong>
                <p>Esta fecha está disponible para crear una reserva o bloquearla.</p>
                <div className="admin-modal__actions">
                  <button type="button" onClick={() => openReservationForm(selectedDay.iso)}>
                    Crear reserva
                  </button>
                  <button type="button" onClick={openBlockForm}>
                    Bloquear fecha
                  </button>
                  <button type="button" onClick={closeModal}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
