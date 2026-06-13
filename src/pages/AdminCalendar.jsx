import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { CalendarDays, X } from "lucide-react";
import DateAvailabilityPicker from "../components/calendar/DateAvailabilityPicker.jsx";
import { useAdminData } from "../admin/AdminDataProvider.jsx";
import { useAuth } from "../auth/AuthProvider.jsx";
import { venues } from "../data/venues.js";
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
  toWhatsappParaguay,
} from "../utils/formatters.js";

const weekdays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function ModalPortal({ children }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

function formatLongDate(dateValue) {
  return new Intl.DateTimeFormat("es-PY", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${dateValue}T12:00:00`));
}

function formatDate(dateValue) {
  if (!dateValue) return "Sin fecha";
  return new Intl.DateTimeFormat("es-PY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${dateValue}T12:00:00`));
}

function getCalendarStatusLabel(status, reservationCount) {
  if (status === "past") return "Pasado";
  if (status === "reserved" || reservationCount > 0) return "Reservado";
  return "Disponible";
}

function buildClientWhatsappUrl(reservation) {
  const venue = venues.find((item) => item.slug === "paraiso-escondido") || venues[0] || {};
  const phone = toWhatsappParaguay(reservation.clientPhone) || venue.whatsappNumber;
  const message = `Hola ${reservation.clientName}, te escribo por tu reserva en ${venue.name || "Paraíso Escondido"}.`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
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

function AmountInput({ value, onChange }) {
  return (
    <input
      inputMode="numeric"
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
  const navigate = useNavigate();
  const { hasPermission, isManager } = useAuth();
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
  const selectedBlockingReservations = selectedDay?.status === "reserved" ? selectedReservations : [];
  const selectedStatusLabel = selectedDay
    ? getCalendarStatusLabel(selectedDay.status, selectedBlockingReservations.length)
    : "";
  const validationMessage = reservationDraft ? getReservationValidationMessage(reservationDraft) : "";
  const overlappingReservation =
    reservationDraft && !validationMessage
      ? findOverlappingReservation(reservations, reservationDraft)
      : null;
  const canSaveReservation =
    Boolean(reservationDraft?.clientName?.trim()) && !validationMessage && !overlappingReservation;
  const canCreateReservation = hasPermission("calendar:create_reservation");
  const canEditReservations = hasPermission("reservations:update_basic");
  const canAddPayments = hasPermission("payments:create");
  const reservationsPath = isManager ? "/encargado/reservas" : "/admin/reservas";

  useEffect(() => {
    if (!selectedDay || typeof document === "undefined") return undefined;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [selectedDay]);

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

  const goToReservations = () => navigate(reservationsPath);

  return (
    <section className="admin-section admin-calendar-section">
      <div className="admin-section-heading">
        <div>
          <h2>Calendario</h2>
          <p>Tocá un día para revisar los detalles.</p>
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
            const visibleReservations = status === "reserved" ? dayReservations : [];
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
                {visibleReservations.length ? (
                  <>
                    <span className="admin-calendar-day__status">Reservado</span>
                    <strong>{visibleReservations[0].clientName}</strong>
                    <small>{visibleReservations[0].startTime} - {visibleReservations[0].endTime}</small>
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
          <span><i className="admin-status-dot admin-status-dot--past" />Pasado</span>
        </div>
      </div>

      {selectedDay ? (
        <ModalPortal>
          <div className="admin-modal-backdrop admin-modal-backdrop--sheet admin-calendar-detail-backdrop" role="presentation">
            <div className="admin-modal admin-modal--sheet admin-calendar-detail-sheet" role="dialog" aria-modal="true" aria-labelledby="calendar-detail-title">
              <div className="admin-modal__header admin-modal__header--premium">
                <div className="admin-modal-title">
                  <i aria-hidden="true"><CalendarDays size={20} strokeWidth={1.8} /></i>
                  <div>
                    <h3 id="calendar-detail-title">{formatLongDate(selectedDay.iso)}</h3>
                    <small>
                      <span className={`admin-calendar-detail-status admin-calendar-detail-status--${selectedDay.status}`}>
                        {selectedStatusLabel}
                      </span>
                    </small>
                  </div>
                </div>
                <button type="button" className="admin-modal-close" onClick={closeModal} aria-label="Cerrar">
                  <X size={18} strokeWidth={1.8} aria-hidden="true" />
                </button>
              </div>

              <div className="admin-modal__body admin-modal__body--sheet">
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
                  </>
                ) : selectedBlockingReservations.length ? (
                  <div className="admin-day-blocks admin-calendar-reservation-list">
                    {selectedBlockingReservations.map((reservation) => (
                      <article className="admin-calendar-reservation-card" key={reservation.id}>
                        <header>
                          <div>
                            <strong>{reservation.clientName}</strong>
                            <span>{formatParaguayPhone(reservation.clientPhone) || "Sin teléfono"}</span>
                          </div>
                          <em>{reservation.paymentStatus}</em>
                        </header>

                        <dl>
                          <div><dt>Cédula</dt><dd>{reservation.clientCedula || "Sin cédula"}</dd></div>
                          <div><dt>Ingreso</dt><dd>{formatDate(reservation.startDate)} - {reservation.startTime}</dd></div>
                          <div><dt>Salida</dt><dd>{formatDate(reservation.endDate)} - {reservation.endTime}</dd></div>
                          <div><dt>Evento</dt><dd>{reservation.eventType || "No aplica"}</dd></div>
                          <div><dt>Personas</dt><dd>{reservation.guests || "No aplica"}</dd></div>
                          <div><dt>Total</dt><dd>{formatGuaranies(reservation.totalAmount)}</dd></div>
                          <div><dt>Pagado</dt><dd>{formatGuaranies(reservation.totalPaid)}</dd></div>
                          <div><dt>Saldo</dt><dd>{formatGuaranies(reservation.balance)}</dd></div>
                        </dl>

                        <section>
                          <h4>Pagos</h4>
                          {reservation.payments.length ? (
                            <div className="admin-calendar-payment-list">
                              {reservation.payments.map((payment) => (
                                <div key={payment.id}>
                                  <span>{formatGuaranies(payment.amount)} · {payment.method} · {formatDate(payment.paymentDate)}</span>
                                  {payment.receiptUrl ? (
                                    <a className="admin-receipt-link" href={payment.receiptUrl} target="_blank" rel="noreferrer">
                                      Ver comprobante
                                    </a>
                                  ) : (
                                    <small>Sin comprobante</small>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="admin-empty-note">Todavía no hay pagos registrados.</p>
                          )}
                        </section>

                        <footer>
                          <a href={buildClientWhatsappUrl(reservation)} target="_blank" rel="noreferrer">WhatsApp</a>
                          <button type="button" onClick={goToReservations}>Ver reserva</button>
                          {canEditReservations ? <button type="button" onClick={goToReservations}>Editar reserva</button> : null}
                          {canAddPayments ? <button type="button" onClick={goToReservations}>Agregar pago</button> : null}
                        </footer>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="admin-free-date-panel">
                    <strong>{formatLongDate(selectedDay.iso)}</strong>
                    <p>No hay reservas para este día.</p>
                  </div>
                )}
              </div>

              <div className="admin-modal__actions admin-modal__actions--sheet">
                {reservationDraft ? (
                  <>
                    <button type="button" className="admin-primary-button" onClick={saveReservation} disabled={!canSaveReservation || isSaving}>{isSaving ? "Guardando..." : "Guardar reserva"}</button>
                    <button type="button" className="admin-secondary-button" onClick={() => setReservationDraft(null)}>Volver</button>
                  </>
                ) : selectedBlockingReservations.length === 0 && selectedDay.status !== "past" && canCreateReservation ? (
                  <>
                    <button type="button" className="admin-primary-button" onClick={() => setReservationDraft(createReservationDraft(selectedDay.iso))}>
                      Crear reserva
                    </button>
                    <button type="button" className="admin-secondary-button" onClick={closeModal}>Cerrar</button>
                  </>
                ) : (
                  <button type="button" className="admin-secondary-button" onClick={closeModal}>Cerrar</button>
                )}
              </div>
            </div>
          </div>
        </ModalPortal>
      ) : null}
    </section>
  );
}
