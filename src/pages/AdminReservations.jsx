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

function CollapsibleSection({
  title,
  count,
  defaultOpen = true,
  className = "",
  children,
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const sectionClassName = ["admin-reservation-time-section", "admin-reservation-collapsible-section", className]
    .filter(Boolean)
    .join(" ");

  useEffect(() => {
    setIsOpen(defaultOpen);
  }, [defaultOpen]);

  return (
    <section className={sectionClassName}>
      <button
        type="button"
        className="admin-reservation-section-toggle"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span>
          <h3>{title}</h3>
          <small>{count} {count === 1 ? "reserva" : "reservas"}</small>
        </span>
        <i aria-hidden="true" />
      </button>
      <div className={`admin-reservation-section-panel ${isOpen ? "is-open" : ""}`} aria-hidden={!isOpen}>
        <div className="admin-reservation-section-panel__inner">
          {children}
        </div>
      </div>
    </section>
  );
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

function createRescheduleDraft(reservation, mode = "date") {
  const startDate = reservation.startDate || todayISO();
  const endDate = reservation.endDate && reservation.endDate >= startDate ? reservation.endDate : startDate;

  return {
    mode,
    startDate,
    startTime: reservation.startTime || DEFAULT_START_TIME,
    endDate,
    endTime: reservation.endTime || getDefaultEndTime(startDate, endDate),
    reason: reservation.rescheduleReason || "",
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

function shouldAnimatePendingBalance(reservation, now = new Date()) {
  if (!hasPendingReservationBalance(reservation)) return false;
  const start = getReservationStartDateTime({
    ...reservation,
    startTime: "00:00",
  });
  if (!start) return false;
  return start <= startOfLocalDay(now);
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
  onReschedule,
  onCancel,
  canCancel = true,
  canEdit = true,
  allowPayments = true,
  canReschedule = true,
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
        {canReschedule && onReschedule ? <button type="button" onClick={() => onReschedule(reservation)}>Remarcar reserva</button> : null}
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
    <CollapsibleSection
      title="Reservas canceladas"
      count={reservations.length}
      defaultOpen={false}
      className="cancelled-reservations"
    >
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
    </CollapsibleSection>
  );
}

export default function AdminReservations({ mode = "admin" }) {
  const navigate = useNavigate();
  const venue = venues[0];
  const { isAdmin } = useAuth();
  const {
    reservations,
    activeReservations,
    rescheduleReservations,
    cancelledReservations,
    addReservation,
    updateReservation,
    markReservationForReschedule,
    rescheduleReservation,
    cancelReservation,
    addPayment,
    firebaseStatus,
  } = useAdminData();
  const [expandedReservationId, setExpandedReservationId] = useState(null);
  const [editingReservation, setEditingReservation] = useState(null);
  const [paymentTarget, setPaymentTarget] = useState(null);
  const [paymentDraft, setPaymentDraft] = useState(null);
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [rescheduleDraft, setRescheduleDraft] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const isModalOpen = Boolean(editingReservation || paymentTarget || rescheduleTarget || cancelTarget);
  const canCancelReservations = mode !== "manager" && isAdmin;

  const editingAvailability = useMemo(
    () =>
      editingReservation
        ? buildAdminAvailability(reservations, editingReservation.id)
        : buildAdminAvailability(reservations),
    [editingReservation, reservations],
  );
  const rescheduleAvailability = useMemo(
    () =>
      rescheduleTarget
        ? buildAdminAvailability(reservations, rescheduleTarget.id)
        : buildAdminAvailability(reservations),
    [rescheduleTarget, reservations],
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
  const sortedRescheduleReservations = useMemo(
    () =>
      [...(rescheduleReservations || [])].sort((a, b) =>
        String(b.rescheduleRequestedAt || b.updatedAt || "").localeCompare(String(a.rescheduleRequestedAt || a.updatedAt || "")),
      ),
    [rescheduleReservations],
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
  const rescheduleCandidate =
    rescheduleTarget && rescheduleDraft?.mode === "date"
      ? {
          ...rescheduleTarget,
          startDate: rescheduleDraft.startDate,
          startTime: rescheduleDraft.startTime,
          endDate: rescheduleDraft.endDate,
          endTime: rescheduleDraft.endTime,
          status: "confirmada",
        }
      : null;
  const rescheduleValidationMessage = rescheduleCandidate
    ? getReservationValidationMessage(rescheduleCandidate)
    : "";
  const rescheduleOverlap =
    rescheduleCandidate && !rescheduleValidationMessage
      ? findOverlappingReservation(reservations, rescheduleCandidate, rescheduleTarget.id)
      : null;
  const rescheduleWarning =
    rescheduleDraft?.mode === "date"
      ? rescheduleValidationMessage || (rescheduleOverlap ? "Ese horario se cruza con otra reserva. Ajustá la hora de salida o elegí otra fecha." : "")
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
            highlightedReservation: createdReservation,
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

  const openRescheduleModal = (reservation, modeValue = reservation.status === "pending_reschedule" ? "date" : "date") => {
    setRescheduleTarget(reservation);
    setRescheduleDraft(createRescheduleDraft(reservation, modeValue));
  };

  const closeRescheduleModal = () => {
    setRescheduleTarget(null);
    setRescheduleDraft(null);
  };

  const saveReschedule = async () => {
    if (!rescheduleTarget || !rescheduleDraft || rescheduleWarning || isSaving) return;
    setIsSaving(true);
    try {
      if (rescheduleDraft.mode === "pending") {
        await markReservationForReschedule(rescheduleTarget.id, rescheduleDraft.reason);
      } else {
        await rescheduleReservation(rescheduleTarget.id, {
          startDate: rescheduleDraft.startDate,
          startTime: rescheduleDraft.startTime,
          endDate: rescheduleDraft.endDate,
          endTime: rescheduleDraft.endTime,
          eventDate: rescheduleDraft.startDate,
          timeSlot: `${rescheduleDraft.startTime} - ${rescheduleDraft.endTime}`,
          rescheduleReason: rescheduleDraft.reason,
        });
      }
      setExpandedReservationId(null);
      closeRescheduleModal();
    } finally {
      setIsSaving(false);
    }
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
      const shouldAnimateBalanceAlert = showRegisterBalance && shouldAnimatePendingBalance(reservation);
      const rowClassName = [
        isTodayGroup ? "admin-reservation-row--today" : "",
        isPendingBalanceGroup ? "admin-reservation-row--pending-balance" : "",
        showRegisterBalance ? "admin-reservation-row--today-pending" : "",
        shouldAnimateBalanceAlert ? "admin-reservation-row--pending-attention" : "",
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
            <td className={`money-column ${showRegisterBalance ? "admin-balance-alert-cell" : ""} ${shouldAnimateBalanceAlert ? "admin-pending-attention-balance" : ""}`}>
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
                    className={`admin-register-balance-button admin-register-balance-button--compact ${shouldAnimateBalanceAlert ? "admin-pending-attention-button" : ""}`}
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
                  onReschedule={(currentReservation) => openRescheduleModal(currentReservation)}
                  onCancel={(currentReservation) => setCancelTarget(currentReservation)}
                  canCancel={canCancelReservations && !isPastGroup}
                  canEdit={!isPastGroup}
                  allowPayments={!isPastGroup}
                  canReschedule={!isPastGroup}
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
      const shouldAnimateBalanceAlert = showRegisterBalance && shouldAnimatePendingBalance(reservation);
      const cardClassName = [
        "admin-reservation-mobile-card",
        isTodayGroup ? "admin-reservation-mobile-card--today" : "",
        isPendingBalanceGroup ? "admin-reservation-mobile-card--pending-balance" : "",
        showRegisterBalance ? "admin-reservation-mobile-card--today-pending" : "",
        shouldAnimateBalanceAlert ? "admin-reservation-mobile-card--pending-attention" : "",
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
              <div className={`${showRegisterBalance ? "admin-balance-alert-cell" : ""} ${shouldAnimateBalanceAlert ? "admin-pending-attention-balance" : ""}`}>
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
                className={`admin-register-balance-button ${shouldAnimateBalanceAlert ? "admin-pending-attention-button" : ""}`}
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
              onReschedule={(currentReservation) => openRescheduleModal(currentReservation)}
              onCancel={(currentReservation) => setCancelTarget(currentReservation)}
              canCancel={canCancelReservations && !isPastGroup}
              canEdit={!isPastGroup}
              allowPayments={!isPastGroup}
              canReschedule={!isPastGroup}
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

  const renderRescheduleReservations = () => (
    <>
      <div className="admin-reservations-table-wrap">
        {sortedRescheduleReservations.length ? (
          <table className="admin-reservations-table admin-reservations-table--operations">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Teléfono</th>
                <th>Fecha original</th>
                <th className="money-column">Total</th>
                <th className="money-column">Saldo</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sortedRescheduleReservations.map((reservation) => {
                const hasPendingBalance = reservationHasPendingBalance(reservation);
                return (
                  <tr className="admin-reservation-row--reschedule" key={reservation.id}>
                    <td>
                      <strong>{reservation.clientName}</strong>
                      <small>{reservation.clientCedula || "Sin cédula"}</small>
                    </td>
                    <td>{formatParaguayPhone(reservation.clientPhone) || "Sin teléfono"}</td>
                    <td>
                      <strong>{formatDate(reservation.originalStartDate || reservation.startDate)}</strong>
                      <small>{reservation.originalStartTime || reservation.startTime} a {reservation.originalEndTime || reservation.endTime}</small>
                    </td>
                    <td className="money-column">{formatGuaranies(reservation.totalAmount)}</td>
                    <td className={`money-column ${hasPendingBalance ? "admin-balance-alert-cell" : ""}`}>
                      {hasPendingBalance ? formatGuaranies(reservation.balance) : "-"}
                    </td>
                    <td><span className="admin-status-pill">Pendiente de nueva fecha</span></td>
                    <td className="admin-actions-cell">
                      <div className="admin-reservation-row-actions">
                        <button type="button" className="admin-register-balance-button admin-register-balance-button--compact" onClick={() => openRescheduleModal(reservation, "date")}>
                          Asignar nueva fecha
                        </button>
                        <a href={buildClientWhatsappUrl(venue, reservation)} target="_blank" rel="noreferrer">WhatsApp</a>
                        {canCancelReservations ? (
                          <button type="button" className="is-danger" onClick={() => setCancelTarget(reservation)}>Cancelar</button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="admin-empty-note">No hay reservas a remarcar.</p>
        )}
      </div>

      <div className="admin-reservations-mobile-list">
        {sortedRescheduleReservations.length ? (
          sortedRescheduleReservations.map((reservation) => {
            const hasPendingBalance = reservationHasPendingBalance(reservation);
            return (
              <article className="admin-reservation-mobile-card admin-reservation-mobile-card--reschedule" key={reservation.id}>
                <header>
                  <div>
                    <span className="admin-today-badge">A remarcar</span>
                    <h3>{reservation.clientName}</h3>
                    <p>{formatParaguayPhone(reservation.clientPhone) || "Sin teléfono"} · {reservation.clientCedula || "Sin cédula"}</p>
                  </div>
                  <span className="admin-status-pill">Pendiente de nueva fecha</span>
                </header>
                <div className="admin-reservation-mobile-card__dates">
                  <div><span>Fecha original</span><strong>{formatDate(reservation.originalStartDate || reservation.startDate)} · {reservation.originalStartTime || reservation.startTime}</strong></div>
                  <div><span>Salida original</span><strong>{formatDate(reservation.originalEndDate || reservation.endDate)} · {reservation.originalEndTime || reservation.endTime}</strong></div>
                </div>
                <div className="admin-reservation-mobile-card__money">
                  <div><span>Total</span><strong>{formatGuaranies(reservation.totalAmount)}</strong></div>
                  <div><span>Pagado</span><strong>{formatGuaranies(reservation.totalPaid)}</strong></div>
                  {hasPendingBalance ? <div className="admin-balance-alert-cell"><span>Saldo</span><strong>{formatGuaranies(reservation.balance)}</strong></div> : null}
                </div>
                {reservation.rescheduleReason ? <p className="admin-empty-note">{reservation.rescheduleReason}</p> : null}
                <footer className="admin-reservation-mobile-card__actions">
                  <button type="button" className="admin-register-balance-button" onClick={() => openRescheduleModal(reservation, "date")}>Asignar nueva fecha</button>
                  <a href={buildClientWhatsappUrl(venue, reservation)} target="_blank" rel="noreferrer">WhatsApp</a>
                  {canCancelReservations ? <button type="button" className="is-danger" onClick={() => setCancelTarget(reservation)}>Cancelar</button> : null}
                </footer>
              </article>
            );
          })
        ) : (
          <p className="admin-empty-note">No hay reservas a remarcar.</p>
        )}
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

      <CollapsibleSection
        title="Reservas de hoy"
        count={reservationGroups.today.length}
        defaultOpen={reservationGroups.today.length > 0}
        className="admin-reservation-time-section--today"
      >
        {renderReservationContent(reservationGroups.today, "No hay reservas para hoy.", { isTodayGroup: true })}
      </CollapsibleSection>

      <CollapsibleSection
        title="Reservas con saldo pendiente"
        count={reservationGroups.pendingBalance.length}
        defaultOpen={reservationGroups.pendingBalance.length > 0}
        className="admin-reservation-time-section--pending-balance"
      >
        {renderReservationContent(reservationGroups.pendingBalance, "No hay reservas con saldo pendiente.", { isPendingBalanceGroup: true })}
      </CollapsibleSection>

      <CollapsibleSection
        title="Reservas a remarcar"
        count={sortedRescheduleReservations.length}
        defaultOpen={false}
        className="admin-reservation-time-section--reschedule"
      >
        {renderRescheduleReservations()}
      </CollapsibleSection>

      <CollapsibleSection
        title="Próximas reservas"
        count={reservationGroups.upcoming.length}
        defaultOpen={false}
      >
        {renderReservationContent(reservationGroups.upcoming, "No hay próximas reservas.")}
      </CollapsibleSection>

      <CollapsibleSection
        title="Reservas pasadas"
        count={reservationGroups.past.length}
        defaultOpen={false}
        className="admin-reservation-time-section--collapsed"
      >
        {renderReservationContent(reservationGroups.past, "No hay reservas pasadas.", { isPastGroup: true })}
      </CollapsibleSection>

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

      {rescheduleTarget && rescheduleDraft ? (
        <ModalPortal>
        <div className="admin-modal-backdrop admin-modal-backdrop--reservation" role="presentation">
          <div className="admin-modal admin-modal--wide admin-modal--reservation" role="dialog" aria-modal="true">
            <div className="admin-modal__header admin-modal__header--premium">
              <div className="admin-modal-title">
                <i><CalendarPlus size={18} strokeWidth={1.8} aria-hidden="true" /></i>
                <span>
                  <p className="eyebrow">Reserva</p>
                  <h3>Remarcar reserva</h3>
                  <small>Elegí una nueva fecha o dejá la reserva pendiente de remarcar.</small>
                </span>
              </div>
              <button type="button" className="admin-modal-close" onClick={closeRescheduleModal} aria-label="Cerrar">
                <X size={18} strokeWidth={1.8} aria-hidden="true" />
              </button>
            </div>

            <div className="admin-modal__body admin-modal__body--reservation">
              <div className="reservation-form-section reservation-form-section--full">
                <h4>{rescheduleTarget.clientName}</h4>
                <div className="admin-reschedule-choice">
                  <label>
                    <input
                      type="radio"
                      name="rescheduleMode"
                      checked={rescheduleDraft.mode === "date"}
                      onChange={() => setRescheduleDraft((current) => ({ ...current, mode: "date" }))}
                    />
                    <span>Elegir nueva fecha ahora</span>
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="rescheduleMode"
                      checked={rescheduleDraft.mode === "pending"}
                      onChange={() => setRescheduleDraft((current) => ({ ...current, mode: "pending" }))}
                    />
                    <span>Dejar pendiente de remarcar</span>
                  </label>
                </div>
              </div>

              {rescheduleDraft.mode === "date" ? (
                <div className="reservation-edit-form reservation-edit-form--operations">
                  <section className="reservation-form-section">
                    <h4>Nueva fecha y horario</h4>
                    <DateAvailabilityPicker
                      availability={rescheduleAvailability}
                      value={rescheduleDraft.startDate}
                      onChange={(date) => setRescheduleDraft((current) => updateReservationDate(current, "startDate", date))}
                      label="Nueva fecha de ingreso"
                    />
                    <label>Hora de ingreso<input type="time" value={rescheduleDraft.startTime} onChange={(event) => setRescheduleDraft((current) => ({ ...current, startTime: event.target.value }))} /></label>
                    <DateAvailabilityPicker
                      availability={rescheduleAvailability}
                      value={rescheduleDraft.endDate}
                      minDate={rescheduleDraft.startDate}
                      onChange={(date) => setRescheduleDraft((current) => updateReservationDate(current, "endDate", date))}
                      label="Nueva fecha de salida"
                      allowReservedSelection
                    />
                    <label>Hora de salida<input type="time" value={rescheduleDraft.endTime} onChange={(event) => setRescheduleDraft((current) => ({ ...current, endTime: event.target.value }))} /></label>
                  </section>
                  <section className="reservation-form-section">
                    <h4>Motivo / nota</h4>
                    <label className="reservation-edit-form__notes">Nota opcional<textarea value={rescheduleDraft.reason} onChange={(event) => setRescheduleDraft((current) => ({ ...current, reason: event.target.value }))} /></label>
                    <div className="reservation-balance-summary">
                      <span>Se conserva</span>
                      <strong>{formatGuaranies(rescheduleTarget.totalPaid)} pagado</strong>
                    </div>
                  </section>
                </div>
              ) : (
                <div className="reservation-form-section reservation-form-section--full">
                  <h4>Quedará pendiente de nueva fecha</h4>
                  <p className="admin-empty-note">La fecha actual se liberará del calendario, pero la reserva conservará cliente, pagos, comprobantes, total y saldo.</p>
                  <label className="reservation-edit-form__notes">Motivo / nota opcional<textarea value={rescheduleDraft.reason} onChange={(event) => setRescheduleDraft((current) => ({ ...current, reason: event.target.value }))} /></label>
                </div>
              )}

              {rescheduleWarning ? <p className="admin-form-warning">{rescheduleWarning}</p> : null}
            </div>
            <div className="admin-modal__actions admin-modal__actions--reservation">
              <button type="button" className="admin-secondary-button" onClick={closeRescheduleModal}>Cancelar</button>
              <button type="button" className="admin-primary-button" onClick={saveReschedule} disabled={Boolean(rescheduleWarning) || isSaving}>
                {isSaving ? "Guardando..." : rescheduleDraft.mode === "pending" ? "Dejar pendiente" : "Remarcar reserva"}
              </button>
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
