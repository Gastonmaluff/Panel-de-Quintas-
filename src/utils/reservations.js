const INACTIVE_RESERVATION_STATUSES = new Set([
  "cancelada",
  "cancelado",
  "cancelled",
  "canceled",
  "deleted",
  "eliminada",
  "eliminado",
  "archived",
  "archivada",
]);

const RESCHEDULE_STATUSES = new Set(["pending_reschedule", "to_reschedule", "a_remarcar"]);

function normalizeStatus(status = "") {
  return String(status || "").trim().toLowerCase();
}

export function isActiveReservation(reservation = {}) {
  const status = normalizeStatus(reservation.status);
  return !reservation.deleted && !INACTIVE_RESERVATION_STATUSES.has(status);
}

export function isPendingRescheduleReservation(reservation = {}) {
  return isActiveReservation(reservation) && RESCHEDULE_STATUSES.has(normalizeStatus(reservation.status));
}

export function isScheduledReservation(reservation = {}) {
  return isActiveReservation(reservation) && !isPendingRescheduleReservation(reservation);
}

export function getReservationTotal(reservation = {}) {
  return Number(
    reservation.totalAmount ??
      reservation.totalPrice ??
      reservation.total ??
      reservation.agreedPrice ??
      0,
  );
}

export function getReservationPaid(reservation = {}) {
  if (Array.isArray(reservation.payments)) {
    return reservation.payments.reduce((total, payment) => total + Number(payment.amount || 0), 0);
  }

  return Number(reservation.totalPaid ?? reservation.paid ?? reservation.depositAmount ?? 0);
}

export function getReservationBalance(reservation = {}) {
  const storedBalance = reservation.balance ?? reservation.balanceAmount;
  const calculatedBalance = Math.max(getReservationTotal(reservation) - getReservationPaid(reservation), 0);
  const numericStoredBalance = storedBalance == null ? null : Number(storedBalance || 0);

  if (numericStoredBalance == null) return calculatedBalance;
  if (calculatedBalance === 0) return 0;
  return Math.max(calculatedBalance, numericStoredBalance);
}

export function hasPendingReservationBalance(reservation = {}) {
  const paymentStatus = normalizeStatus(reservation.paymentStatus);
  const isPaid = paymentStatus === "paid" || paymentStatus.includes("pagado");
  return isActiveReservation(reservation) && getReservationBalance(reservation) > 0 && !isPaid;
}
