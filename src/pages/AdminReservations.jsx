import { Fragment, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { buildAdminAvailability, useAdminData } from "../admin/AdminDataProvider.jsx";
import { venues } from "../data/venues.js";
import { isRangeAvailable } from "../utils/availability.js";
import { formatGuaranies } from "../utils/pricing.js";

const paymentMethods = ["Transferencia", "Efectivo"];
const eventTypes = ["Cumpleaños", "Casamiento", "Bautismo", "Reunión familiar", "Evento corporativo", "Pool day", "Otro"];

function buildClientWhatsappUrl(venue, reservation) {
  const phone = reservation.clientPhone.replace(/\D/g, "");
  const message = `Hola ${reservation.clientName}, te escribo por tu reserva en ${venue.name}.`;
  return `https://wa.me/${phone || venue.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

function formatDate(dateValue) {
  if (!dateValue) return "Sin fecha";
  return new Intl.DateTimeFormat("es-PY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${dateValue}T12:00:00`));
}

function createReservationDraft() {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: "",
    clientName: "",
    clientPhone: "",
    startDate: today,
    startTime: "07:00",
    endDate: today,
    endTime: "19:00",
    eventType: "Cumpleaños",
    guests: 0,
    totalAmount: 0,
    initialPayment: 0,
    initialPaymentMethod: "Transferencia",
    receiptName: "",
    receiptPreview: "",
    notes: "",
  };
}

function createPaymentDraft(amount = 0) {
  return {
    paymentDate: new Date().toISOString().slice(0, 10),
    amount,
    method: "Transferencia",
    receiptName: "",
    receiptPreview: "",
    notes: "",
    type: amount > 0 ? "saldo" : "pago parcial",
  };
}

function ReceiptInput({ value, onChange }) {
  const handleFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    onChange({
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
  onDelete,
}) {
  return (
    <article className="admin-reservation-detail-card">
      <header className="admin-reservation-detail-card__header">
        <div>
          <p className="eyebrow">Detalle de reserva</p>
          <h3>{reservation.clientName}</h3>
          <span>{reservation.clientPhone || "Sin teléfono"}</span>
        </div>
        <span className="admin-status-pill">{reservation.paymentStatus}</span>
      </header>

      <div className="admin-reservation-detail-grid">
        <section>
          <h4>Datos generales</h4>
          <dl>
            <div><dt>Evento</dt><dd>{reservation.eventType || "No aplica"}</dd></div>
            <div><dt>Personas</dt><dd>{reservation.guests || "No aplica"}</dd></div>
            <div><dt>Telefono</dt><dd>{reservation.clientPhone || "Sin telefono"}</dd></div>
          </dl>
        </section>

        <section>
          <h4>Fechas y horarios</h4>
          <dl>
            <div><dt>Ingreso</dt><dd>{formatDate(reservation.startDate)} - {reservation.startTime}</dd></div>
            <div><dt>Egreso</dt><dd>{formatDate(reservation.endDate)} - {reservation.endTime}</dd></div>
          </dl>
        </section>

        <section>
          <h4>Finanzas</h4>
          <dl className="admin-reservation-finance-summary">
            <div><dt>Total</dt><dd>{formatGuaranies(reservation.totalAmount)}</dd></div>
            <div><dt>Pagado hasta ahora</dt><dd>{formatGuaranies(reservation.totalPaid)}</dd></div>
            <div><dt>Saldo pendiente</dt><dd>{formatGuaranies(reservation.balance)}</dd></div>
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
        <button type="button" className="is-danger" onClick={() => onDelete(reservation.id)}>
          Eliminar reserva
        </button>
        <button type="button" onClick={onClose}>Cerrar detalle</button>
      </footer>
    </article>
  );
}

export default function AdminReservations() {
  const venue = venues[0];
  const { reservations, addReservation, updateReservation, removeReservation, addPayment } = useAdminData();
  const [expandedReservationId, setExpandedReservationId] = useState(null);
  const [editingReservation, setEditingReservation] = useState(null);
  const [paymentTarget, setPaymentTarget] = useState(null);
  const [paymentDraft, setPaymentDraft] = useState(null);

  const editingAvailability = useMemo(
    () =>
      editingReservation
        ? buildAdminAvailability(reservations, editingReservation.id)
        : { reserved: [], preReserved: [], blocked: [] },
    [editingReservation, reservations],
  );

  const reservationBalance = Math.max(
    Number(editingReservation?.totalAmount || 0) - Number(editingReservation?.initialPayment || 0),
    0,
  );
  const canSaveEditedReservation =
    Boolean(editingReservation?.clientName?.trim()) &&
    Boolean(editingReservation?.startDate) &&
    Boolean(editingReservation?.endDate) &&
    isRangeAvailable(editingReservation.startDate, editingReservation.endDate, editingAvailability);

  const openNewReservation = () => {
    setEditingReservation(createReservationDraft());
  };

  const openEditReservation = (reservation) => {
    setEditingReservation({
      ...reservation,
      initialPayment: reservation.payments[0]?.amount || 0,
      initialPaymentMethod: reservation.payments[0]?.method || "Transferencia",
      receiptName: reservation.payments[0]?.receiptName || "",
      receiptPreview: reservation.payments[0]?.receiptUrl || "",
    });
  };

  const saveEditedReservation = () => {
    if (!canSaveEditedReservation) return;

    const initialPayment = Number(editingReservation.initialPayment || 0);
    const firstPayment =
      initialPayment > 0
        ? {
            amount: initialPayment,
            method: editingReservation.initialPaymentMethod || "Transferencia",
            paymentDate: new Date().toISOString().slice(0, 10),
            receiptName: editingReservation.receiptName || "",
            receiptUrl: editingReservation.receiptPreview || "",
            notes: "Seña inicial",
            type: "seña",
          }
        : null;
    const payload = {
      ...editingReservation,
      payments: editingReservation.id
        ? editingReservation.payments
        : firstPayment
          ? [firstPayment]
          : [],
    };

    if (editingReservation.id && reservations.some((reservation) => reservation.id === editingReservation.id)) {
      updateReservation(editingReservation.id, payload);
    } else {
      addReservation(payload);
    }

    setEditingReservation(null);
  };

  const openPaymentModal = (reservation, fullBalance = false) => {
    setPaymentTarget(reservation);
    setPaymentDraft(createPaymentDraft(fullBalance ? reservation.balance : 0));
  };

  const savePayment = () => {
    if (!paymentTarget || !paymentDraft?.amount) return;
    addPayment(paymentTarget.id, {
      amount: Number(paymentDraft.amount),
      method: paymentDraft.method,
      paymentDate: paymentDraft.paymentDate,
      receiptName: paymentDraft.receiptName,
      receiptUrl: paymentDraft.receiptPreview,
      notes: paymentDraft.notes,
      type: Number(paymentDraft.amount) >= paymentTarget.balance ? "saldo" : "pago parcial",
    });
    setPaymentTarget(null);
    setPaymentDraft(null);
  };

  return (
    <section className="admin-section admin-reservations-section">
      <div className="admin-section-heading">
        <div>
          <h2>Reservas</h2>
          <p>Gestión operativa de fechas, pagos, saldos y comprobantes.</p>
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
              <th>Egreso</th>
              <th className="money-column">Total</th>
              <th className="money-column">Saldo</th>
              <th>Estado</th>
              <th>Más</th>
            </tr>
          </thead>
          <tbody>
            {reservations.map((reservation) => (
              <Fragment key={reservation.id}>
                <tr>
                  <td><strong>{reservation.clientName}</strong></td>
                  <td>{reservation.clientPhone || "Sin teléfono"}</td>
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
                        onDelete={(reservationId) => {
                          removeReservation(reservationId);
                          setExpandedReservationId(null);
                        }}
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
        {reservations.map((reservation) => (
          <article className="admin-reservation-mobile-card" key={reservation.id}>
            <header>
              <div>
                <h3>{reservation.clientName}</h3>
              </div>
              <span className="admin-status-pill">{reservation.paymentStatus}</span>
            </header>
            <p className="admin-reservation-mobile-card__phone">{reservation.clientPhone || "Sin teléfono"}</p>
            <div className="admin-reservation-mobile-card__dates">
              <div><span>Ingreso</span><strong>{formatDate(reservation.startDate)} · {reservation.startTime}</strong></div>
              <div><span>Egreso</span><strong>{formatDate(reservation.endDate)} · {reservation.endTime}</strong></div>
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
              <div className="admin-reservation-mobile-card__detail">
                <ReservationDetailPanel
                  reservation={reservation}
                  venue={venue}
                  onClose={() => setExpandedReservationId(null)}
                  onEdit={openEditReservation}
                  onAddPayment={(currentReservation) => openPaymentModal(currentReservation)}
                  onPayBalance={(currentReservation) => openPaymentModal(currentReservation, true)}
                  onDelete={(reservationId) => {
                    removeReservation(reservationId);
                    setExpandedReservationId(null);
                  }}
                />
              </div>
            ) : null}
          </article>
        ))}
      </div>

      {editingReservation ? (
        <div className="admin-modal-backdrop" role="presentation">
          <div className="admin-modal admin-modal--wide" role="dialog" aria-modal="true">
            <div className="admin-modal__header">
              <div>
                <p className="eyebrow">Reserva</p>
                <h3>{editingReservation.id ? "Editar reserva" : "Nueva reserva"}</h3>
              </div>
              <button type="button" onClick={() => setEditingReservation(null)}>Cerrar</button>
            </div>

            <div className="reservation-edit-form reservation-edit-form--operations">
              <label>Nombre del cliente<input value={editingReservation.clientName} onChange={(event) => setEditingReservation((current) => ({ ...current, clientName: event.target.value }))} /></label>
              <label>Teléfono<input value={editingReservation.clientPhone} onChange={(event) => setEditingReservation((current) => ({ ...current, clientPhone: event.target.value }))} /></label>
              <label>Fecha de ingreso<input type="date" value={editingReservation.startDate} onChange={(event) => setEditingReservation((current) => ({ ...current, startDate: event.target.value }))} /></label>
              <label>Hora de ingreso<input type="time" value={editingReservation.startTime} onChange={(event) => setEditingReservation((current) => ({ ...current, startTime: event.target.value }))} /></label>
              <label>Fecha de egreso<input type="date" value={editingReservation.endDate} onChange={(event) => setEditingReservation((current) => ({ ...current, endDate: event.target.value }))} /></label>
              <label>Hora de egreso<input type="time" value={editingReservation.endTime} onChange={(event) => setEditingReservation((current) => ({ ...current, endTime: event.target.value }))} /></label>
              <label>Tipo de evento<select value={editingReservation.eventType} onChange={(event) => setEditingReservation((current) => ({ ...current, eventType: event.target.value }))}>{eventTypes.map((eventType) => <option key={eventType} value={eventType}>{eventType}</option>)}</select></label>
              <label>Cantidad de personas<input type="number" value={editingReservation.guests} onChange={(event) => setEditingReservation((current) => ({ ...current, guests: Number(event.target.value) }))} /></label>
              <label>Precio total acordado<input type="number" value={editingReservation.totalAmount} onChange={(event) => setEditingReservation((current) => ({ ...current, totalAmount: Number(event.target.value) }))} /></label>
              {!editingReservation.id ? (
                <>
                  <label>Seña inicial<input type="number" value={editingReservation.initialPayment} onChange={(event) => setEditingReservation((current) => ({ ...current, initialPayment: Number(event.target.value) }))} /></label>
                  <label>Método de pago de la seña<select value={editingReservation.initialPaymentMethod} onChange={(event) => setEditingReservation((current) => ({ ...current, initialPaymentMethod: event.target.value }))}>{paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}</select></label>
                </>
              ) : null}
              <label>Saldo pendiente<input value={formatGuaranies(editingReservation.id ? editingReservation.balance : reservationBalance)} readOnly /></label>
              <label className="reservation-edit-form__notes">Notas internas<textarea value={editingReservation.notes} onChange={(event) => setEditingReservation((current) => ({ ...current, notes: event.target.value }))} /></label>
              {!editingReservation.id ? (
                <div className="reservation-edit-form__notes">
                  <ReceiptInput
                    value={editingReservation}
                    onChange={(receipt) => setEditingReservation((current) => ({ ...current, ...receipt }))}
                  />
                </div>
              ) : (
                <div className="reservation-edit-form__notes">
                  <h4>Pagos registrados</h4>
                  <PaymentHistory reservation={editingReservation} />
                </div>
              )}
            </div>

            {!canSaveEditedReservation ? (
              <p className="admin-form-warning">El rango elegido cruza una fecha ocupada o faltan datos obligatorios.</p>
            ) : null}
            <div className="admin-modal__actions">
              <button type="button" onClick={saveEditedReservation} disabled={!canSaveEditedReservation}>Guardar reserva</button>
              <button type="button" onClick={() => setEditingReservation(null)}>Cancelar</button>
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
              <label>Monto<input type="number" value={paymentDraft.amount} onChange={(event) => setPaymentDraft((current) => ({ ...current, amount: Number(event.target.value) }))} /></label>
              <label>Método<select value={paymentDraft.method} onChange={(event) => setPaymentDraft((current) => ({ ...current, method: event.target.value }))}>{paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}</select></label>
              <label className="reservation-edit-form__notes">Observación<textarea value={paymentDraft.notes} onChange={(event) => setPaymentDraft((current) => ({ ...current, notes: event.target.value }))} /></label>
              <div className="reservation-edit-form__notes">
                <ReceiptInput value={paymentDraft} onChange={(receipt) => setPaymentDraft((current) => ({ ...current, ...receipt }))} />
              </div>
            </div>
            <div className="admin-modal__actions">
              <button type="button" onClick={savePayment} disabled={!paymentDraft.amount}>Guardar pago</button>
              <button type="button" onClick={() => setPaymentTarget(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
