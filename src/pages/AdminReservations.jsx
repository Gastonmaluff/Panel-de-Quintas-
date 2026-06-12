import { Fragment, useEffect, useMemo, useState } from "react";
import { CalendarPlus, Plus, X } from "lucide-react";
import DateAvailabilityPicker from "../components/calendar/DateAvailabilityPicker.jsx";
import { buildAdminAvailability, useAdminData } from "../admin/AdminDataProvider.jsx";
import { venues } from "../data/venues.js";
import {
  DEFAULT_START_TIME,
  findOverlappingReservation,
  getDefaultEndTime,
  getReservationValidationMessage,
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

const paymentMethods = ["Transferencia", "Efectivo"];
const eventTypes = ["Cumpleaños", "Casamiento", "Bautismo", "Reunión familiar", "Evento corporativo", "Pool day", "Otro"];

function buildClientWhatsappUrl(venue, reservation) {
  const phone = toWhatsappParaguay(reservation.clientPhone) || venue.whatsappNumber;
  const message = `Hola ${reservation.clientName}, te escribo por tu reserva en ${venue.name}.`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function formatDate(dateValue) {
  if (!dateValue) return "Sin fecha";
  return new Intl.DateTimeFormat("es-PY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${dateValue}T12:00:00`));
}

function createReservationDraft(dateValue = new Date().toISOString().slice(0, 10)) {
  return {
    id: "",
    clientName: "",
    clientCedula: "",
    clientPhone: "",
    startDate: dateValue,
    startTime: DEFAULT_START_TIME,
    endDate: dateValue,
    endTime: getDefaultEndTime(dateValue, dateValue),
    eventType: "Cumpleaños",
    guests: "",
    totalAmount: "",
    initialPayment: "",
    initialPaymentMethod: "Transferencia",
    receiptName: "",
    receiptPreview: "",
    receiptFile: null,
    notes: "",
  };
}

function createPaymentDraft(amount = "") {
  return {
    paymentDate: new Date().toISOString().slice(0, 10),
    amount,
    method: "Transferencia",
    receiptName: "",
    receiptPreview: "",
    receiptFile: null,
    notes: "",
    type: Number(amount || 0) > 0 ? "saldo" : "pago parcial",
  };
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function updateReservationDate(current, key, value) {
  const next = { ...current, [key]: value };

  if (key === "startDate") {
    next.endDate = current.endDate && current.endDate >= value ? current.endDate : value;
  }

  if (next.startDate && next.endDate) {
    next.endTime = getDefaultEndTime(next.startDate, next.endDate);
  }

  return next;
}

function AmountInput({ value, onChange, placeholder = "0" }) {
  return (
    <input
      inputMode="numeric"
      placeholder={placeholder}
      value={formatAmountInput(value)}
      onFocus={() => {
        if (Number(value || 0) === 0) onChange("");
      }}
      onChange={(event) => onChange(parseAmountInput(event.target.value) || "")}
    />
  );
}

function QuantityInput({ value, onChange, placeholder = "Cantidad" }) {
  return (
    <input
      inputMode="numeric"
      placeholder={placeholder}
      value={value === 0 ? "" : value}
      onFocus={() => {
        if (Number(value || 0) === 0) onChange("");
      }}
      onChange={(event) => onChange(event.target.value.replace(/\D/g, ""))}
    />
  );
}

function ReceiptInput({ value, onChange }) {
  const handleFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    onChange({
      receiptFile: file,
      receiptName: file.name,
      receiptPreview: file.type.startsWith("image/") ? URL.createObjectURL(file) : "",
    });
  };

  return (
    <div className="admin-receipt-input">
      <label>
        <span>Subir comprobante</span>
        <input type="file" accept="image/*,.pdf" onChange={handleFile} />
      </label>
      {value?.receiptName ? (
        <div>
          {value.receiptPreview ? <img src={value.receiptPreview} alt="" /> : null}
          <strong>{value.receiptName}</strong>
        </div>
      ) : (
        <small>Imagen, PDF o archivo.</small>
      )}
    </div>
  );
}

function PaymentHistory({ reservation }) {
  if (!reservation.payments.length) {
    return <p className="admin-empty-note">Todavía no hay pagos registrados.</p>;
  }

  return (
    <div className="admin-payment-list">
      {reservation.payments.map((payment) => (
        <article key={payment.id}>
          <div>
            <strong>{formatGuaranies(payment.amount)}</strong>
            <span>{payment.method} · {formatDate(payment.paymentDate)}</span>
          </div>
          <em>{payment.type}</em>
          {payment.receiptUrl ? (
            <a href={payment.receiptUrl} target="_blank" rel="noreferrer">
              Ver comprobante
            </a>
          ) : (
            <small>{payment.receiptName || "Sin comprobante"}</small>
          )}
        </article>
      ))}
    </div>
  );
}

function ReservationDetailPanel({
  reservation,
  venue,
  onClose,
  onEdit,
  onAddPayment,
  onPayBalance,
  onCancel,
}) {
  return (
    <article className="admin-reservation-detail-card admin-accordion-panel">
      <header className="admin-reservation-detail-card__header">
        <div>
          <p className="eyebrow">Detalle de reserva</p>
          <h3>{reservation.clientName}</h3>
          <span>{formatParaguayPhone(reservation.clientPhone) || "Sin teléfono"}</span>
        </div>
        <span className="admin-status-pill">{reservation.paymentStatus}</span>
      </header>

      <div className="admin-reservation-detail-grid">
        <section>
          <h4>Datos del cliente</h4>
          <dl>
            <div><dt>Cliente</dt><dd>{reservation.clientName}</dd></div>
            <div><dt>Cédula</dt><dd>{reservation.clientCedula || "Sin cédula"}</dd></div>
            <div><dt>Teléfono</dt><dd>{formatParaguayPhone(reservation.clientPhone) || "Sin teléfono"}</dd></div>
          </dl>
        </section>

        <section>
          <h4>Fechas y horarios</h4>
          <dl>
            <div><dt>Ingreso</dt><dd>{formatDate(reservation.startDate)} - {reservation.startTime}</dd></div>
            <div><dt>Salida</dt><dd>{formatDate(reservation.endDate)} - {reservation.endTime}</dd></div>
            <div><dt>Evento</dt><dd>{reservation.eventType || "No aplica"}</dd></div>
            <div><dt>Personas</dt><dd>{reservation.guests || "No aplica"}</dd></div>
          </dl>
        </section>

        <section>
          <h4>Finanzas</h4>
          <dl className="admin-reservation-finance-summary">
            <div><dt>Total</dt><dd>{formatGuaranies(reservation.totalAmount)}</dd></div>
            <div><dt>Pagado</dt><dd>{formatGuaranies(reservation.totalPaid)}</dd></div>
            <div><dt>Saldo</dt><dd>{formatGuaranies(reservation.balance)}</dd></div>
            <div><dt>Estado</dt><dd>{reservation.paymentStatus}</dd></div>
          </dl>
        </section>
      </div>

      <section className="admin-reservation-detail-notes">
        <h4>Notas internas</h4>
        <p>{reservation.notes || "Sin notas internas."}</p>
      </section>

      <section className="admin-reservation-detail-payments">
        <h4>Pagos</h4>
        <PaymentHistory reservation={reservation} />
      </section>

      <footer className="admin-reservation-detail-actions">
        <a href={buildClientWhatsappUrl(venue, reservation)} target="_blank" rel="noreferrer">
          WhatsApp
        </a>
        <button type="button" onClick={() => onAddPayment(reservation)}>Agregar pago</button>
        <button type="button" onClick={() => onPayBalance(reservation)} disabled={reservation.balance <= 0}>
          Pagar saldo
        </button>
        <button type="button" onClick={() => onEdit(reservation)}>Editar reserva</button>
        <button type="button" className="is-danger" onClick={() => onCancel(reservation)}>
          Eliminar reserva
        </button>
        <button type="button" onClick={onClose}>Cerrar detalle</button>
      </footer>
    </article>
  );
}

function CancelledReservations({ reservations }) {
  return (
    <details className="admin-editor-card admin-collapsible-card cancelled-reservations">
      <summary>
        <span>
          <strong>Reservas canceladas</strong>
          <small>{reservations.length} reservas liberadas del calendario.</small>
        </span>
      </summary>
      <div className="admin-collapsible-card__content">
        {reservations.length ? (
          <div className="admin-cancelled-list">
            {reservations.map((reservation) => (
              <article key={reservation.id}>
                <header>
                  <strong>{reservation.clientName}</strong>
                  <span>{formatGuaranies(reservation.balance)} saldo</span>
                </header>
                <dl>
                  <div><dt>Teléfono</dt><dd>{formatParaguayPhone(reservation.clientPhone) || "Sin teléfono"}</dd></div>
                  <div><dt>Cédula</dt><dd>{reservation.clientCedula || "Sin cédula"}</dd></div>
                  <div><dt>Ingreso</dt><dd>{formatDate(reservation.startDate)} · {reservation.startTime}</dd></div>
                  <div><dt>Salida</dt><dd>{formatDate(reservation.endDate)} · {reservation.endTime}</dd></div>
                  <div><dt>Total</dt><dd>{formatGuaranies(reservation.totalAmount)}</dd></div>
                  <div><dt>Pagado</dt><dd>{formatGuaranies(reservation.totalPaid)}</dd></div>
                  <div><dt>Cancelación</dt><dd>{reservation.cancelledAt ? new Date(reservation.cancelledAt).toLocaleString("es-PY") : "Sin fecha"}</dd></div>
                  <div><dt>Usuario</dt><dd>{reservation.cancelledBy || "Sin usuario"}</dd></div>
                  <div><dt>Motivo</dt><dd>{reservation.cancellationReason || "Sin motivo"}</dd></div>
                </dl>
              </article>
            ))}
          </div>
        ) : (
          <p className="admin-empty-note">No hay reservas canceladas.</p>
        )}
      </div>
    </details>
  );
}

export default function AdminReservations() {
  const venue = venues[0];
  const {
    reservations,
    activeReservations,
    cancelledReservations,
    addReservation,
    updateReservation,
    cancelReservation,
    addPayment,
    firebaseStatus,
  } = useAdminData();
  const [expandedReservationId, setExpandedReservationId] = useState(null);
  const [editingReservation, setEditingReservation] = useState(null);
  const [paymentTarget, setPaymentTarget] = useState(null);
  const [paymentDraft, setPaymentDraft] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const isModalOpen = Boolean(editingReservation || paymentTarget || cancelTarget);

  const editingAvailability = useMemo(
    () =>
      editingReservation
        ? buildAdminAvailability(reservations, editingReservation.id)
        : buildAdminAvailability(reservations),
    [editingReservation, reservations],
  );

  const reservationBalance = Math.max(
    Number(editingReservation?.totalAmount || 0) - Number(editingReservation?.initialPayment || 0),
    0,
  );
  const validationMessage = editingReservation
    ? getReservationValidationMessage(editingReservation)
    : "";
  const overlappingReservation =
    editingReservation && !validationMessage
      ? findOverlappingReservation(reservations, editingReservation, editingReservation.id)
      : null;
  const saveWarning =
    !editingReservation?.clientName?.trim()
      ? "El nombre del cliente es obligatorio."
      : validationMessage || (overlappingReservation ? "Ya existe una reserva en ese rango de fecha y horario." : "");
  const canSaveEditedReservation = Boolean(editingReservation && !saveWarning);

  useEffect(() => {
    if (!isModalOpen) return undefined;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isModalOpen]);

  const openNewReservation = () => {
    setEditingReservation(createReservationDraft());
  };

  const openEditReservation = (reservation) => {
    setEditingReservation({
      ...reservation,
      clientPhone: formatParaguayPhone(reservation.clientPhone),
      initialPayment: reservation.payments[0]?.amount || "",
      initialPaymentMethod: reservation.payments[0]?.method || "Transferencia",
      receiptName: reservation.payments[0]?.receiptName || "",
      receiptPreview: reservation.payments[0]?.receiptUrl || "",
      receiptFile: null,
    });
  };

  const saveEditedReservation = async () => {
    if (!canSaveEditedReservation || isSaving) return;
    setIsSaving(true);

    try {
      const initialPayment = Number(editingReservation.initialPayment || 0);
      const firstPayment =
        initialPayment > 0
          ? {
              amount: initialPayment,
              method: editingReservation.initialPaymentMethod || "Transferencia",
              paymentDate: todayISO(),
              receiptName: editingReservation.receiptName || "",
              receiptFile: editingReservation.receiptFile || null,
              notes: "Seña inicial",
              type: "seña",
            }
          : null;
      const payload = {
        ...editingReservation,
        clientName: titleCaseName(editingReservation.clientName),
        clientPhone: cleanParaguayPhone(editingReservation.clientPhone),
        guests: Number(editingReservation.guests || 0),
        totalAmount: Number(editingReservation.totalAmount || 0),
        payments: editingReservation.id
          ? editingReservation.payments
          : firstPayment
            ? [firstPayment]
            : [],
      };

      if (editingReservation.id && reservations.some((reservation) => reservation.id === editingReservation.id)) {
        await updateReservation(editingReservation.id, payload);
      } else {
        await addReservation(payload);
      }

      setEditingReservation(null);
    } finally {
      setIsSaving(false);
    }
  };

  const openPaymentModal = (reservation, fullBalance = false) => {
    setPaymentTarget(reservation);
    setPaymentDraft(createPaymentDraft(fullBalance ? reservation.balance : ""));
  };

  const savePayment = async () => {
    if (!paymentTarget || !paymentDraft?.amount || isSaving) return;
    setIsSaving(true);
    try {
      await addPayment(paymentTarget.id, {
        amount: Number(paymentDraft.amount),
        method: paymentDraft.method,
        paymentDate: paymentDraft.paymentDate,
        receiptName: paymentDraft.receiptName,
        receiptFile: paymentDraft.receiptFile,
        notes: paymentDraft.notes,
        type: Number(paymentDraft.amount) >= paymentTarget.balance ? "saldo" : "pago parcial",
      });
      setPaymentTarget(null);
      setPaymentDraft(null);
    } finally {
      setIsSaving(false);
    }
  };

  const confirmCancelReservation = async () => {
    if (!cancelTarget || isSaving) return;
    setIsSaving(true);
    try {
      await cancelReservation(cancelTarget.id, cancelReason);
      setExpandedReservationId(null);
      setCancelTarget(null);
      setCancelReason("");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="admin-section admin-reservations-section">
      <div className="admin-section-heading">
        <div>
          <h2>Reservas</h2>
          <p>Gestión operativa de fechas, pagos, saldos y comprobantes.</p>
          {firebaseStatus.error ? (
            <small className="admin-firebase-warning">Firebase: {firebaseStatus.error}</small>
          ) : null}
        </div>
        <button type="button" onClick={openNewReservation}>
          Nueva reserva
        </button>
      </div>

      <div className="admin-reservations-table-wrap">
        <table className="admin-reservations-table admin-reservations-table--operations">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Teléfono</th>
              <th>Ingreso</th>
              <th>Salida</th>
              <th className="money-column">Total</th>
              <th className="money-column">Saldo</th>
              <th>Estado</th>
              <th>Más</th>
            </tr>
          </thead>
          <tbody>
            {activeReservations.map((reservation) => (
              <Fragment key={reservation.id}>
                <tr>
                  <td><strong>{reservation.clientName}</strong><small>{reservation.clientCedula || "Sin cédula"}</small></td>
                  <td>{formatParaguayPhone(reservation.clientPhone) || "Sin teléfono"}</td>
                  <td>
                    <strong>{formatDate(reservation.startDate)}</strong>
                    <small>{reservation.startTime}</small>
                  </td>
                  <td>
                    <strong>{formatDate(reservation.endDate)}</strong>
                    <small>{reservation.endTime}</small>
                  </td>
                  <td className="money-column">{formatGuaranies(reservation.totalAmount)}</td>
                  <td className="money-column">{formatGuaranies(reservation.balance)}</td>
                  <td><span className="admin-status-pill">{reservation.paymentStatus}</span></td>
                  <td className="admin-actions-cell">
                    <button
                      type="button"
                      className={`admin-detail-toggle ${expandedReservationId === reservation.id ? "is-open" : ""}`}
                      aria-label={`Ver detalle de ${reservation.clientName}`}
                      aria-expanded={expandedReservationId === reservation.id}
                      onClick={() => setExpandedReservationId((current) => (current === reservation.id ? null : reservation.id))}
                    >
                      <Plus size={18} strokeWidth={2} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
                {expandedReservationId === reservation.id ? (
                  <tr className="admin-reservation-detail-row">
                    <td colSpan={8}>
                      <ReservationDetailPanel
                        reservation={reservation}
                        venue={venue}
                        onClose={() => setExpandedReservationId(null)}
                        onEdit={openEditReservation}
                        onAddPayment={(currentReservation) => openPaymentModal(currentReservation)}
                        onPayBalance={(currentReservation) => openPaymentModal(currentReservation, true)}
                        onCancel={(currentReservation) => setCancelTarget(currentReservation)}
                      />
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="admin-reservations-mobile-list">
        {activeReservations.map((reservation) => (
          <article className="admin-reservation-mobile-card" key={reservation.id}>
            <header>
              <div>
                <h3>{reservation.clientName}</h3>
                <small>{reservation.clientCedula || "Sin cédula"}</small>
              </div>
              <span className="admin-status-pill">{reservation.paymentStatus}</span>
            </header>
            <p className="admin-reservation-mobile-card__phone">{formatParaguayPhone(reservation.clientPhone) || "Sin teléfono"}</p>
            <div className="admin-reservation-mobile-card__dates">
              <div><span>Ingreso</span><strong>{formatDate(reservation.startDate)} · {reservation.startTime}</strong></div>
              <div><span>Salida</span><strong>{formatDate(reservation.endDate)} · {reservation.endTime}</strong></div>
            </div>
            <div className="admin-reservation-mobile-card__money">
              <div><span>Total</span><strong>{formatGuaranies(reservation.totalAmount)}</strong></div>
              <div><span>Saldo</span><strong>{formatGuaranies(reservation.balance)}</strong></div>
            </div>
            <footer className="admin-reservation-mobile-card__actions">
              <a href={buildClientWhatsappUrl(venue, reservation)} target="_blank" rel="noreferrer">WhatsApp</a>
              <button
                type="button"
                className={`admin-detail-toggle admin-detail-toggle--mobile ${expandedReservationId === reservation.id ? "is-open" : ""}`}
                aria-label={`Ver detalle de ${reservation.clientName}`}
                aria-expanded={expandedReservationId === reservation.id}
                onClick={() => setExpandedReservationId((current) => (current === reservation.id ? null : reservation.id))}
              >
                <Plus size={18} strokeWidth={2} aria-hidden="true" />
              </button>
            </footer>
            {expandedReservationId === reservation.id ? (
              <div className="admin-reservation-mobile-card__detail admin-accordion-panel">
                <ReservationDetailPanel
                  reservation={reservation}
                  venue={venue}
                  onClose={() => setExpandedReservationId(null)}
                  onEdit={openEditReservation}
                  onAddPayment={(currentReservation) => openPaymentModal(currentReservation)}
                  onPayBalance={(currentReservation) => openPaymentModal(currentReservation, true)}
                  onCancel={(currentReservation) => setCancelTarget(currentReservation)}
                />
              </div>
            ) : null}
          </article>
        ))}
      </div>

      <CancelledReservations reservations={cancelledReservations} />

      {editingReservation ? (
        <div className="admin-modal-backdrop" role="presentation">
          <div className="admin-modal admin-modal--wide admin-modal--reservation" role="dialog" aria-modal="true">
            <div className="admin-modal__header admin-modal__header--premium">
              <div className="admin-modal-title">
                <i><CalendarPlus size={18} strokeWidth={1.8} aria-hidden="true" /></i>
                <span>
                  <p className="eyebrow">Reserva</p>
                  <h3>{editingReservation.id ? "Editar reserva" : "Nueva reserva"}</h3>
                  <small>Registrar ingreso, salida y datos del cliente.</small>
                </span>
              </div>
              <button type="button" className="admin-modal-close" onClick={() => setEditingReservation(null)} aria-label="Cerrar">
                <X size={18} strokeWidth={1.8} aria-hidden="true" />
              </button>
            </div>

            <div className="admin-modal__body admin-modal__body--reservation">
              <div className="reservation-edit-form reservation-edit-form--operations">
                <section className="reservation-form-section">
                  <h4>Cliente</h4>
                  <label>Nombre del cliente<input value={editingReservation.clientName} onBlur={() => setEditingReservation((current) => ({ ...current, clientName: titleCaseName(current.clientName) }))} onChange={(event) => setEditingReservation((current) => ({ ...current, clientName: event.target.value }))} /></label>
                  <label>Número de cédula<input value={editingReservation.clientCedula || ""} onChange={(event) => setEditingReservation((current) => ({ ...current, clientCedula: event.target.value.replace(/\D/g, "") }))} /></label>
                  <label>Teléfono<input inputMode="numeric" placeholder="0983 332 233" value={formatParaguayPhone(editingReservation.clientPhone)} onChange={(event) => setEditingReservation((current) => ({ ...current, clientPhone: formatParaguayPhone(event.target.value) }))} /></label>
                </section>

                <section className="reservation-form-section">
                  <h4>Fecha y horario</h4>
                  <DateAvailabilityPicker availability={editingAvailability} value={editingReservation.startDate} onChange={(date) => setEditingReservation((current) => updateReservationDate(current, "startDate", date))} label="Fecha de ingreso" />
                  <label>Hora de ingreso<input type="time" value={editingReservation.startTime} onChange={(event) => setEditingReservation((current) => ({ ...current, startTime: event.target.value }))} /></label>
                  <DateAvailabilityPicker availability={editingAvailability} value={editingReservation.endDate} minDate={editingReservation.startDate} onChange={(date) => setEditingReservation((current) => updateReservationDate(current, "endDate", date))} label="Fecha de salida" />
                  <label>Hora de salida<input type="time" value={editingReservation.endTime} onChange={(event) => setEditingReservation((current) => ({ ...current, endTime: event.target.value }))} /></label>
                </section>

                <section className="reservation-form-section">
                  <h4>Detalles de la reserva</h4>
                  <label>Tipo de evento<select value={editingReservation.eventType} onChange={(event) => setEditingReservation((current) => ({ ...current, eventType: event.target.value }))}>{eventTypes.map((eventType) => <option key={eventType} value={eventType}>{eventType}</option>)}</select></label>
                  <label>Cantidad de personas<QuantityInput value={editingReservation.guests} onChange={(guests) => setEditingReservation((current) => ({ ...current, guests }))} /></label>
                  <label className="reservation-edit-form__notes">Notas internas<textarea value={editingReservation.notes} onChange={(event) => setEditingReservation((current) => ({ ...current, notes: event.target.value }))} /></label>
                </section>

                <section className="reservation-form-section">
                  <h4>Pago inicial</h4>
                  <label>Precio total acordado<AmountInput value={editingReservation.totalAmount} onChange={(totalAmount) => setEditingReservation((current) => ({ ...current, totalAmount }))} placeholder="2.850.000" /></label>
                  {!editingReservation.id ? (
                    <>
                      <label>Seña inicial<AmountInput value={editingReservation.initialPayment} onChange={(initialPayment) => setEditingReservation((current) => ({ ...current, initialPayment }))} placeholder="850.000" /></label>
                      <label>Método de pago de la seña<select value={editingReservation.initialPaymentMethod} onChange={(event) => setEditingReservation((current) => ({ ...current, initialPaymentMethod: event.target.value }))}>{paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}</select></label>
                      <div className="reservation-edit-form__notes">
                        <ReceiptInput value={editingReservation} onChange={(receipt) => setEditingReservation((current) => ({ ...current, ...receipt }))} />
                      </div>
                    </>
                  ) : (
                    <div className="reservation-edit-form__notes">
                      <h4>Pagos registrados</h4>
                      <PaymentHistory reservation={editingReservation} />
                    </div>
                  )}
                  <label>Saldo pendiente<input value={formatGuaranies(editingReservation.id ? editingReservation.balance : reservationBalance)} readOnly /></label>
                </section>
              </div>

              {saveWarning ? <p className="admin-form-warning">{saveWarning}</p> : null}
            </div>
            <div className="admin-modal__actions">
              <button type="button" className="admin-secondary-button" onClick={() => setEditingReservation(null)}>Cancelar</button>
              <button type="button" onClick={saveEditedReservation} disabled={!canSaveEditedReservation || isSaving}>{isSaving ? "Guardando..." : "Guardar reserva"}</button>
            </div>
          </div>
        </div>
      ) : null}

      {paymentTarget && paymentDraft ? (
        <div className="admin-modal-backdrop" role="presentation">
          <div className="admin-modal" role="dialog" aria-modal="true">
            <div className="admin-modal__header">
              <div>
                <p className="eyebrow">Pago</p>
                <h3>{paymentTarget.clientName}</h3>
              </div>
              <button type="button" onClick={() => setPaymentTarget(null)}>Cerrar</button>
            </div>
            <div className="reservation-edit-form">
              <label>Fecha de pago<input type="date" value={paymentDraft.paymentDate} onChange={(event) => setPaymentDraft((current) => ({ ...current, paymentDate: event.target.value }))} /></label>
              <label>Monto<AmountInput value={paymentDraft.amount} onChange={(amount) => setPaymentDraft((current) => ({ ...current, amount }))} /></label>
              <label>Método<select value={paymentDraft.method} onChange={(event) => setPaymentDraft((current) => ({ ...current, method: event.target.value }))}>{paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}</select></label>
              <label className="reservation-edit-form__notes">Observación<textarea value={paymentDraft.notes} onChange={(event) => setPaymentDraft((current) => ({ ...current, notes: event.target.value }))} /></label>
              <div className="reservation-edit-form__notes">
                <ReceiptInput value={paymentDraft} onChange={(receipt) => setPaymentDraft((current) => ({ ...current, ...receipt }))} />
              </div>
            </div>
            <div className="admin-modal__actions">
              <button type="button" onClick={savePayment} disabled={!paymentDraft.amount || isSaving}>{isSaving ? "Guardando..." : "Guardar pago"}</button>
              <button type="button" className="admin-secondary-button" onClick={() => setPaymentTarget(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      ) : null}

      {cancelTarget ? (
        <div className="admin-modal-backdrop" role="presentation">
          <div className="admin-modal admin-modal--confirm" role="dialog" aria-modal="true">
            <div className="admin-modal__header">
              <div>
                <p className="eyebrow">Confirmación</p>
                <h3>¿Seguro que desea cancelar esta reserva?</h3>
              </div>
              <button type="button" onClick={() => setCancelTarget(null)}>Cerrar</button>
            </div>
            <p className="admin-empty-note">
              La reserva de {cancelTarget.clientName} pasará a Reservas canceladas y liberará disponibilidad.
            </p>
            <label className="admin-confirm-reason">
              Motivo opcional
              <textarea value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} />
            </label>
            <div className="admin-modal__actions">
              <button type="button" className="admin-secondary-button" onClick={() => setCancelTarget(null)}>Cancelar</button>
              <button type="button" className="is-danger" onClick={confirmCancelReservation} disabled={isSaving}>
                {isSaving ? "Cancelando..." : "Sí, cancelar reserva"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
