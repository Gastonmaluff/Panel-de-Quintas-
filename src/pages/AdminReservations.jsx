import { Fragment, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
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
import { hasPendingReservationBalance } from "../utils/reservations.js";
import { useAuth } from "../auth/AuthProvider.jsx";

const paymentMethods = ["Transferencia", "Efectivo"];
const eventTypes = ["Cumpleaños", "Casamiento", "Bautismo", "Reunión familiar", "Evento corporativo", "Pool day", "Otro"];

function ModalPortal({ children }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

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
    hasInitialDeposit: false,
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

function reservationHasPendingBalance(reservation) {
  return hasPendingReservationBalance(reservation);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function parseLocalDateTime(dateValue, timeValue = "00:00") {
  if (!dateValue) return null;
  const [year, month, day] = dateValue.split("-").map(Number);
  const [hour = 0, minute = 0] = String(timeValue || "00:00").split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

function startOfLocalDay(dateValue = new Date()) {
  const date = new Date(dateValue);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfLocalDay(dateValue = new Date()) {
  const date = new Date(dateValue);
  date.setHours(23, 59, 59, 999);
  return date;
}

function getReservationStartDateTime(reservation) {
  return parseLocalDateTime(reservation.startDate, reservation.startTime);
}

function getReservationEndDateTime(reservation) {
  return parseLocalDateTime(reservation.endDate || reservation.startDate, reservation.endTime || "23:59");
}

function isReservationActiveNow(reservation, now = new Date()) {
  const start = getReservationStartDateTime(reservation);
  const end = getReservationEndDateTime(reservation);
  return Boolean(start && end && start <= now && end >= now);
}

function getReservationTimeGroup(reservation, now = new Date()) {
  const start = getReservationStartDateTime(reservation);
  const end = getReservationEndDateTime(reservation);
  if (!start || !end) return "upcoming";
  if (end < now) return "past";

  const todayStart = startOfLocalDay(now);
  const todayEnd = endOfLocalDay(now);
  if (start <= todayEnd && end >= todayStart) return "today";
  return "upcoming";
}

function compareReservationStartAsc(a, b) {
  return getReservationStartDateTime(a) - getReservationStartDateTime(b);
}

function compareReservationEndDesc(a, b) {
  return getReservationEndDateTime(b) - getReservationEndDateTime(a);
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

function ReceiptInput({ value, onChange, label = "Subir comprobante" }) {
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
        <span>{label}</span>
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
  canCancel = true,
  canEdit = true,
  allowPayments = true,
}) {
  const hasPendingBalance = reservationHasPendingBalance(reservation);

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
            {hasPendingBalance ? (
              <div className="admin-reservation-finance-summary__balance">
                <dt>Saldo</dt>
                <dd>{formatGuaranies(reservation.balance)}</dd>
              </div>
            ) : null}
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
        {allowPayments && hasPendingBalance ? (
          <>
            <button type="button" onClick={() => onAddPayment(reservation)}>Agregar pago</button>
            <button type="button" onClick={() => onPayBalance(reservation)}>Registrar saldo</button>
          </>
        ) : null}
        {canEdit ? <button type="button" onClick={() => onEdit(reservation)}>Editar reserva</button> : null}
        {canCancel ? (
          <button type="button" className="is-danger" onClick={() => onCancel(reservation)}>
            Eliminar reserva
          </button>
        ) : null}
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

export default function AdminReservations({ mode = "admin" }) {
  const navigate = useNavigate();
  const venue = venues[0];
  const { isAdmin } = useAuth();
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
  const canCancelReservations = mode !== "manager" && isAdmin;

  const editingAvailability = useMemo(
    () =>
      editingReservation
        ? buildAdminAvailability(reservations, editingReservation.id)
        : buildAdminAvailability(reservations),
    [editingReservation, reservations],
  );
  const reservationGroups = useMemo(() => {
    const now = new Date();
    const groups = {
      today: [],
      pendingBalance: [],
      upcoming: [],
      past: [],
    };

    activeReservations.forEach((reservation) => {
      const group = getReservationTimeGroup(reservation, now);
      if (group === "today") {
        groups.today.push(reservation);
      } else if (reservationHasPendingBalance(reservation)) {
        groups.pendingBalance.push(reservation);
      } else {
        groups[group].push(reservation);
      }
    });

    groups.today.sort((a, b) => {
      const activeDelta =
        Number(isReservationActiveNow(b, now)) - Number(isReservationActiveNow(a, now));
      return activeDelta || compareReservationStartAsc(a, b);
    });
    groups.pendingBalance.sort((a, b) => {
      const endDelta = compareReservationEndDesc(a, b);
      return endDelta || compareReservationStartAsc(a, b);
    });
    groups.upcoming.sort(compareReservationStartAsc);
    groups.past.sort(compareReservationEndDesc);

    return groups;
  }, [activeReservations]);
  const sortedCancelledReservations = useMemo(
    () =>
      [...cancelledReservations].sort((a, b) =>
        String(b.cancelledAt || "").localeCompare(String(a.cancelledAt || "")),
      ),
    [cancelledReservations],
  );

  const totalAmountValue = Number(editingReservation?.totalAmount || 0);
  const hasInitialDeposit = Boolean(editingReservation?.hasInitialDeposit);
  const initialPaymentValue = hasInitialDeposit
    ? Number(editingReservation?.initialPayment || 0)
    : totalAmountValue;
  const reservationBalance = Math.max(totalAmountValue - initialPaymentValue, 0);
  const isNewReservation = Boolean(editingReservation && !editingReservation.id);
  const initialPaymentMethod = editingReservation?.initialPaymentMethod || "";
  const requiresInitialReceipt =
    isNewReservation &&
    initialPaymentValue > 0 &&
    initialPaymentMethod === "Transferencia" &&
    !editingReservation?.receiptFile &&
    !editingReservation?.receiptName;
  const paymentWarning =
    hasInitialDeposit && initialPaymentValue <= 0
      ? "Ingresá el monto de la seña o desmarcá esta opción."
      : "";
  const validationMessage = editingReservation
    ? getReservationValidationMessage(editingReservation)
    : "";
  const overlappingReservation =
    editingReservation && !validationMessage
      ? findOverlappingReservation(reservations, editingReservation, editingReservation.id)
      : null;
  const saveWarning = !editingReservation?.clientName?.trim()
    ? "Completá el nombre del cliente."
    : !editingReservation?.clientCedula?.trim()
      ? "Completá el número de cédula."
      : !editingReservation?.clientPhone?.trim()
        ? "Completá el teléfono."
        : !editingReservation?.startDate || !editingReservation?.startTime
          ? "Seleccioná fecha y hora de ingreso."
          : !editingReservation?.endDate || !editingReservation?.endTime
            ? "Seleccioná fecha y hora de salida."
            : !editingReservation?.eventType
              ? "Seleccioná el tipo de evento."
              : !Number(editingReservation?.guests || 0)
                ? "Ingresá la cantidad de personas."
                : !totalAmountValue || totalAmountValue <= 0
                  ? "Ingresá el precio total acordado."
                  : isNewReservation && !initialPaymentMethod
                    ? "Seleccioná el método de pago."
                    : isNewReservation && hasInitialDeposit && initialPaymentValue <= 0
                      ? "Ingresá el monto de la seña o desmarcá esta opción."
                      : hasInitialDeposit && initialPaymentValue > totalAmountValue
                        ? "La seña no puede ser mayor al precio total."
                        : requiresInitialReceipt
                          ? "Para pagos por transferencia, subí el comprobante."
                          : validationMessage || (overlappingReservation ? "Ese horario se cruza con otra reserva. Ajustá la hora de salida o elegí otra fecha." : "");
  const canSaveEditedReservation = Boolean(editingReservation && !saveWarning);
  const paymentSaveWarning =
    paymentDraft?.method === "Transferencia" && !paymentDraft?.receiptFile && !paymentDraft?.receiptName
      ? "Para pagos por transferencia, subí el comprobante."
      : "";

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
    const firstPaymentType = reservation.payments[0]?.type?.toLowerCase?.() || "";
    setEditingReservation({
      ...reservation,
      clientPhone: formatParaguayPhone(reservation.clientPhone),
      initialPayment: reservation.payments[0]?.amount || "",
      hasInitialDeposit: firstPaymentType.includes("seña") || firstPaymentType.includes("seÃ±a"),
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
      const totalAmount = Number(editingReservation.totalAmount || 0);
      const isDepositPayment = Boolean(editingReservation.hasInitialDeposit);
      const initialPayment = isDepositPayment ? Number(editingReservation.initialPayment || 0) : totalAmount;
      const firstPayment =
        initialPayment > 0
          ? {
              amount: initialPayment,
              method: editingReservation.initialPaymentMethod || "Transferencia",
              paymentDate: todayISO(),
              receiptName: editingReservation.receiptName || "",
              receiptFile: editingReservation.receiptFile || null,
              notes: isDepositPayment ? "Seña inicial" : "Pago total",
              type: isDepositPayment ? "Seña" : "Pago total",
            }
          : null;
      const payload = {
        ...editingReservation,
        clientName: titleCaseName(editingReservation.clientName),
        clientPhone: cleanParaguayPhone(editingReservation.clientPhone),
        guests: Number(editingReservation.guests || 0),
        totalAmount,
        payments: editingReservation.id
          ? editingReservation.payments
          : firstPayment
            ? [firstPayment]
            : [],
      };

      const isExistingReservation = editingReservation.id && reservations.some((reservation) => reservation.id === editingReservation.id);

      if (isExistingReservation) {
        await updateReservation(editingReservation.id, payload);
      } else {
        const createdReservation = await addReservation(payload);
        setEditingReservation(null);
        navigate(mode === "manager" ? "/encargado/calendario" : "/admin/calendario", {
          state: {
            calendarCelebrationDate: createdReservation.startDate,
            highlightedReservationId: createdReservation.id,
            celebrationKey: `${createdReservation.id}-${Date.now()}`,
          },
        });
        return;
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
    if (!paymentTarget || !paymentDraft?.amount || paymentSaveWarning || isSaving) return;
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

  const renderReservationRows = (reservationList, { isTodayGroup = false, isPendingBalanceGroup = false, isPastGroup = false } = {}) =>
    reservationList.map((reservation) => {
      const isExpanded = expandedReservationId === reservation.id;
      const hasPendingBalance = reservationHasPendingBalance(reservation);
      const showRegisterBalance = (isTodayGroup || isPendingBalanceGroup) && hasPendingBalance;
      const rowClassName = [
        isTodayGroup ? "admin-reservation-row--today" : "",
        isPendingBalanceGroup ? "admin-reservation-row--pending-balance" : "",
        showRegisterBalance ? "admin-reservation-row--today-pending" : "",
      ]
        .filter(Boolean)
        .join(" ");

      return (
        <Fragment key={reservation.id}>
          <tr className={rowClassName}>
            <td>
              <strong>{reservation.clientName}</strong>
              {isTodayGroup ? <small className="admin-today-badge">Hoy</small> : null}
            </td>
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
            <td className={`money-column ${showRegisterBalance ? "admin-balance-alert-cell" : ""}`}>
              {hasPendingBalance ? (
                <>
                  {showRegisterBalance ? <small>Saldo pendiente</small> : null}
                  <strong>{formatGuaranies(reservation.balance)}</strong>
                </>
              ) : (
                "-"
              )}
            </td>
            <td><span className="admin-status-pill">{reservation.paymentStatus}</span></td>
            <td className="admin-actions-cell">
              <div className="admin-reservation-row-actions">
                {showRegisterBalance ? (
                  <button
                    type="button"
                    className="admin-register-balance-button admin-register-balance-button--compact"
                    onClick={() => openPaymentModal(reservation, true)}
                  >
                    Registrar saldo
                  </button>
                ) : null}
                <button
                  type="button"
                  className={`admin-detail-toggle ${isExpanded ? "is-open" : ""}`}
                  aria-label={`Ver detalle de ${reservation.clientName}`}
                  aria-expanded={isExpanded}
                  onClick={() => setExpandedReservationId((current) => (current === reservation.id ? null : reservation.id))}
                >
                  <Plus size={18} strokeWidth={2} aria-hidden="true" />
                </button>
              </div>
            </td>
          </tr>
          <tr className={`admin-reservation-detail-row ${isExpanded ? "is-open" : ""}`}>
            <td colSpan={8}>
              <div
                className={`admin-reservation-detail-shell ${isExpanded ? "is-open" : ""}`}
                aria-hidden={!isExpanded}
                inert={isExpanded ? undefined : true}
              >
                <ReservationDetailPanel
                  reservation={reservation}
                  venue={venue}
                  onClose={() => setExpandedReservationId(null)}
                  onEdit={openEditReservation}
                  onAddPayment={(currentReservation) => openPaymentModal(currentReservation)}
                  onPayBalance={(currentReservation) => openPaymentModal(currentReservation, true)}
                  onCancel={(currentReservation) => setCancelTarget(currentReservation)}
                  canCancel={canCancelReservations && !isPastGroup}
                  canEdit={!isPastGroup}
                  allowPayments={!isPastGroup}
                />
              </div>
            </td>
          </tr>
        </Fragment>
      );
    });

  const renderReservationCards = (reservationList, { isTodayGroup = false, isPendingBalanceGroup = false, isPastGroup = false } = {}) =>
    reservationList.map((reservation) => {
      const isExpanded = expandedReservationId === reservation.id;
      const hasPendingBalance = reservationHasPendingBalance(reservation);
      const showRegisterBalance = (isTodayGroup || isPendingBalanceGroup) && hasPendingBalance;
      const cardClassName = [
        "admin-reservation-mobile-card",
        isTodayGroup ? "admin-reservation-mobile-card--today" : "",
        isPendingBalanceGroup ? "admin-reservation-mobile-card--pending-balance" : "",
        showRegisterBalance ? "admin-reservation-mobile-card--today-pending" : "",
      ]
        .filter(Boolean)
        .join(" ");

      return (
        <article className={cardClassName} key={reservation.id}>
          <header>
            <div>
              {isTodayGroup ? <span className="admin-today-badge">Hoy</span> : null}
              <h3>{reservation.clientName}</h3>
            </div>
            <span className="admin-status-pill">{reservation.paymentStatus}</span>
          </header>
          <div className="admin-reservation-mobile-card__dates">
            <div><span>Ingreso</span><strong>{formatDate(reservation.startDate)} · {reservation.startTime}</strong></div>
            <div><span>Salida</span><strong>{formatDate(reservation.endDate)} · {reservation.endTime}</strong></div>
          </div>
          <div className="admin-reservation-mobile-card__money">
            <div><span>Total</span><strong>{formatGuaranies(reservation.totalAmount)}</strong></div>
            {hasPendingBalance ? (
              <div className={showRegisterBalance ? "admin-balance-alert-cell" : ""}>
                <span>{showRegisterBalance ? "Saldo pendiente" : "Saldo"}</span>
                <strong>{formatGuaranies(reservation.balance)}</strong>
              </div>
            ) : null}
          </div>
          <footer className="admin-reservation-mobile-card__actions">
            <a href={buildClientWhatsappUrl(venue, reservation)} target="_blank" rel="noreferrer">WhatsApp</a>
            {showRegisterBalance ? (
              <button
                type="button"
                className="admin-register-balance-button"
                onClick={() => openPaymentModal(reservation, true)}
              >
                Registrar saldo
              </button>
            ) : null}
            <button
              type="button"
              className={`admin-detail-toggle admin-detail-toggle--mobile ${isExpanded ? "is-open" : ""}`}
              aria-label={`Ver detalle de ${reservation.clientName}`}
              aria-expanded={isExpanded}
              onClick={() => setExpandedReservationId((current) => (current === reservation.id ? null : reservation.id))}
            >
              <Plus size={18} strokeWidth={2} aria-hidden="true" />
            </button>
          </footer>
          <div
            className={`admin-reservation-mobile-card__detail admin-reservation-detail-shell ${isExpanded ? "is-open" : ""}`}
            aria-hidden={!isExpanded}
            inert={isExpanded ? undefined : true}
          >
            <ReservationDetailPanel
              reservation={reservation}
              venue={venue}
              onClose={() => setExpandedReservationId(null)}
              onEdit={openEditReservation}
              onAddPayment={(currentReservation) => openPaymentModal(currentReservation)}
              onPayBalance={(currentReservation) => openPaymentModal(currentReservation, true)}
              onCancel={(currentReservation) => setCancelTarget(currentReservation)}
              canCancel={canCancelReservations && !isPastGroup}
              canEdit={!isPastGroup}
              allowPayments={!isPastGroup}
            />
          </div>
        </article>
      );
    });

  const renderReservationContent = (reservationList, emptyMessage, options = {}) => (
    <>
      <div className="admin-reservations-table-wrap">
        {reservationList.length ? (
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
            <tbody>{renderReservationRows(reservationList, options)}</tbody>
          </table>
        ) : (
          <p className="admin-empty-note">{emptyMessage}</p>
        )}
      </div>

      <div className="admin-reservations-mobile-list">
        {reservationList.length ? renderReservationCards(reservationList, options) : <p className="admin-empty-note">{emptyMessage}</p>}
      </div>
    </>
  );

  return (
    <section className="admin-section admin-reservations-section">
      <div className="admin-section-heading">
        <div>
          <h2>Reservas</h2>
          {firebaseStatus.error ? (
            <small className="admin-firebase-warning">Firebase: {firebaseStatus.error}</small>
          ) : null}
        </div>
        <button type="button" onClick={openNewReservation}>
          Nueva reserva
        </button>
      </div>

      <section className="admin-reservation-time-section admin-reservation-time-section--today">
        <header>
          <div>
            <h3>Reservas de hoy</h3>
            <span>{reservationGroups.today.length} reservas</span>
          </div>
        </header>
        {renderReservationContent(reservationGroups.today, "No hay reservas para hoy.", { isTodayGroup: true })}
      </section>

      <section className="admin-reservation-time-section admin-reservation-time-section--pending-balance">
        <header>
          <div>
            <h3>Reservas con saldo pendiente</h3>
            <span>{reservationGroups.pendingBalance.length} reservas</span>
          </div>
        </header>
        {renderReservationContent(reservationGroups.pendingBalance, "No hay reservas con saldo pendiente.", { isPendingBalanceGroup: true })}
      </section>

      <section className="admin-reservation-time-section">
        <header>
          <div>
            <h3>Próximas reservas</h3>
            <span>{reservationGroups.upcoming.length} reservas</span>
          </div>
        </header>
        {renderReservationContent(reservationGroups.upcoming, "No hay próximas reservas.")}
      </section>

      <details className="admin-reservation-time-section admin-reservation-time-section--collapsed admin-collapsible-card">
        <summary>
          <span>
            <strong>Reservas pasadas</strong>
            <small>{reservationGroups.past.length} reservas históricas.</small>
          </span>
        </summary>
        <div className="admin-collapsible-card__content">
          {renderReservationContent(reservationGroups.past, "No hay reservas pasadas.", { isPastGroup: true })}
        </div>
      </details>

      <div className="admin-legacy-reservation-list" hidden>
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
            {activeReservations.map((reservation) => {
              const isExpanded = expandedReservationId === reservation.id;
              const hasPendingBalance = reservationHasPendingBalance(reservation);

              return (
              <Fragment key={reservation.id}>
                <tr>
                  <td><strong>{reservation.clientName}</strong></td>
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
                  <td className="money-column">{hasPendingBalance ? formatGuaranies(reservation.balance) : "-"}</td>
                  <td><span className="admin-status-pill">{reservation.paymentStatus}</span></td>
                  <td className="admin-actions-cell">
                    <button
                      type="button"
                      className={`admin-detail-toggle ${isExpanded ? "is-open" : ""}`}
                      aria-label={`Ver detalle de ${reservation.clientName}`}
                      aria-expanded={isExpanded}
                      onClick={() => setExpandedReservationId((current) => (current === reservation.id ? null : reservation.id))}
                    >
                      <Plus size={18} strokeWidth={2} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
                <tr className={`admin-reservation-detail-row ${isExpanded ? "is-open" : ""}`}>
                  <td colSpan={8}>
                    <div
                      className={`admin-reservation-detail-shell ${isExpanded ? "is-open" : ""}`}
                      aria-hidden={!isExpanded}
                      inert={isExpanded ? undefined : true}
                    >
                      <ReservationDetailPanel
                        reservation={reservation}
                        venue={venue}
                        onClose={() => setExpandedReservationId(null)}
                        onEdit={openEditReservation}
                        onAddPayment={(currentReservation) => openPaymentModal(currentReservation)}
                        onPayBalance={(currentReservation) => openPaymentModal(currentReservation, true)}
                        onCancel={(currentReservation) => setCancelTarget(currentReservation)}
                        canCancel={canCancelReservations}
                      />
                    </div>
                  </td>
                </tr>
              </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="admin-reservations-mobile-list">
        {activeReservations.map((reservation) => {
          const isExpanded = expandedReservationId === reservation.id;
          const hasPendingBalance = reservationHasPendingBalance(reservation);

          return (
          <article className="admin-reservation-mobile-card" key={reservation.id}>
            <header>
              <div>
                <h3>{reservation.clientName}</h3>
              </div>
              <span className="admin-status-pill">{reservation.paymentStatus}</span>
            </header>
            <div className="admin-reservation-mobile-card__dates">
              <div><span>Ingreso</span><strong>{formatDate(reservation.startDate)} · {reservation.startTime}</strong></div>
              <div><span>Salida</span><strong>{formatDate(reservation.endDate)} · {reservation.endTime}</strong></div>
            </div>
            <div className="admin-reservation-mobile-card__money">
              <div><span>Total</span><strong>{formatGuaranies(reservation.totalAmount)}</strong></div>
              {hasPendingBalance ? <div><span>Saldo pendiente</span><strong>{formatGuaranies(reservation.balance)}</strong></div> : null}
            </div>
            <footer className="admin-reservation-mobile-card__actions">
              <a href={buildClientWhatsappUrl(venue, reservation)} target="_blank" rel="noreferrer">WhatsApp</a>
              <button
                type="button"
                className={`admin-detail-toggle admin-detail-toggle--mobile ${isExpanded ? "is-open" : ""}`}
                aria-label={`Ver detalle de ${reservation.clientName}`}
                aria-expanded={isExpanded}
                onClick={() => setExpandedReservationId((current) => (current === reservation.id ? null : reservation.id))}
              >
                <Plus size={18} strokeWidth={2} aria-hidden="true" />
              </button>
            </footer>
            <div
              className={`admin-reservation-mobile-card__detail admin-reservation-detail-shell ${isExpanded ? "is-open" : ""}`}
              aria-hidden={!isExpanded}
              inert={isExpanded ? undefined : true}
            >
              <ReservationDetailPanel
                reservation={reservation}
                venue={venue}
                onClose={() => setExpandedReservationId(null)}
                onEdit={openEditReservation}
                onAddPayment={(currentReservation) => openPaymentModal(currentReservation)}
                onPayBalance={(currentReservation) => openPaymentModal(currentReservation, true)}
                onCancel={(currentReservation) => setCancelTarget(currentReservation)}
                canCancel={canCancelReservations}
              />
            </div>
          </article>
          );
        })}
      </div>

      </div>

      {canCancelReservations ? <CancelledReservations reservations={sortedCancelledReservations} /> : null}

      {editingReservation ? (
        <ModalPortal>
        <div className="admin-modal-backdrop admin-modal-backdrop--reservation" role="presentation">
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
                  <DateAvailabilityPicker availability={editingAvailability} value={editingReservation.endDate} minDate={editingReservation.startDate} onChange={(date) => setEditingReservation((current) => updateReservationDate(current, "endDate", date))} label="Fecha de salida" allowReservedSelection />
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
                  <label>Precio total acordado<AmountInput value={editingReservation.totalAmount} onChange={(totalAmount) => setEditingReservation((current) => ({ ...current, totalAmount }))} /></label>
                  {!editingReservation.id ? (
                    <>
                      <label className="reservation-switch-field">
                        <input
                          type="checkbox"
                          checked={Boolean(editingReservation.hasInitialDeposit)}
                          onChange={(event) =>
                            setEditingReservation((current) => ({
                              ...current,
                              hasInitialDeposit: event.target.checked,
                              initialPayment: event.target.checked ? current.initialPayment : "",
                            }))
                          }
                        />
                        <span>
                          <strong>El cliente pagó una seña</strong>
                          <small>Si no se marca, se registra como pago total.</small>
                        </span>
                      </label>
                      {editingReservation.hasInitialDeposit ? (
                        <label>Seña inicial<AmountInput value={editingReservation.initialPayment} onChange={(initialPayment) => setEditingReservation((current) => ({ ...current, initialPayment }))} /></label>
                      ) : null}
                      <label>{editingReservation.hasInitialDeposit ? "Método de pago de la seña" : "Método de pago"}<select value={editingReservation.initialPaymentMethod} onChange={(event) => setEditingReservation((current) => ({ ...current, initialPaymentMethod: event.target.value }))}>{paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}</select></label>
                      <div className="reservation-edit-form__notes">
                        <ReceiptInput
                          value={editingReservation}
                          label={editingReservation.hasInitialDeposit ? "Subir comprobante de seña" : "Subir comprobante de pago"}
                          onChange={(receipt) => setEditingReservation((current) => ({ ...current, ...receipt }))}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="reservation-edit-form__notes">
                      <h4>Pagos registrados</h4>
                      <PaymentHistory reservation={editingReservation} />
                    </div>
                  )}
                  <div className="reservation-balance-summary" aria-live="polite">
                    <span>Saldo pendiente</span>
                    <strong>{formatGuaranies(editingReservation.id ? editingReservation.balance : reservationBalance)}</strong>
                  </div>
                </section>
              </div>

              {saveWarning ? <p className="admin-form-warning">{saveWarning}</p> : null}
              {!saveWarning && paymentWarning ? <p className="admin-form-warning admin-form-warning--soft">{paymentWarning}</p> : null}
            </div>
            <div className="admin-modal__actions admin-modal__actions--reservation">
              <button type="button" className="admin-secondary-button" onClick={() => setEditingReservation(null)}>Cancelar</button>
              <button type="button" className="admin-primary-button" onClick={saveEditedReservation} disabled={!canSaveEditedReservation || isSaving}>{isSaving ? "Guardando..." : "Guardar reserva"}</button>
            </div>
          </div>
        </div>
        </ModalPortal>
      ) : null}

      {paymentTarget && paymentDraft ? (
        <ModalPortal>
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
            {paymentSaveWarning ? <p className="admin-form-warning">{paymentSaveWarning}</p> : null}
            <div className="admin-modal__actions">
              <button type="button" onClick={savePayment} disabled={!paymentDraft.amount || Boolean(paymentSaveWarning) || isSaving}>{isSaving ? "Guardando..." : "Guardar pago"}</button>
              <button type="button" className="admin-secondary-button" onClick={() => setPaymentTarget(null)}>Cancelar</button>
            </div>
          </div>
        </div>
        </ModalPortal>
      ) : null}

      {cancelTarget && canCancelReservations ? (
        <ModalPortal>
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
        </ModalPortal>
      ) : null}
    </section>
  );
}
