import { createContext, useContext, useMemo, useState } from "react";
import { adminReservationsMock } from "../data/adminData.js";
import {
  buildAvailabilityFromReservations,
  getReservationDates,
  normalizeBooking,
} from "../utils/booking.js";

const AdminDataContext = createContext(null);
const DEFAULT_PAYMENT_METHOD = "Transferencia";

const expenseSeed = [
  {
    id: "exp-001",
    date: "2026-05-04",
    category: "Limpieza",
    description: "Limpieza posterior a evento",
    amount: 280000,
    method: "Transferencia",
    receiptName: "",
    receiptUrl: "",
    notes: "",
  },
  {
    id: "exp-002",
    date: "2026-05-12",
    category: "Jardinería",
    description: "Mantenimiento de patio y áreas verdes",
    amount: 350000,
    method: "Efectivo",
    receiptName: "",
    receiptUrl: "",
    notes: "",
  },
];

function toNumber(value) {
  return Number(value || 0);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function getPaymentStatus(totalAmount, payments) {
  const totalPaid = payments.reduce((sum, payment) => sum + toNumber(payment.amount), 0);

  if (totalPaid <= 0) return "Sin pago";
  if (totalPaid >= totalAmount && totalAmount > 0) return "Pagado";
  if (payments.length <= 1) return "Seña recibida";
  return "Pago parcial";
}

function normalizePayment(payment = {}, index = 0) {
  return {
    id: payment.id || `pay-${Date.now()}-${index}`,
    amount: toNumber(payment.amount),
    method: payment.method || DEFAULT_PAYMENT_METHOD,
    paymentDate: payment.paymentDate || todayISO(),
    receiptUrl: payment.receiptUrl || "",
    receiptName: payment.receiptName || "",
    notes: payment.notes || "",
    type: payment.type || "pago parcial",
    createdAt: payment.createdAt || new Date().toISOString(),
  };
}

function normalizeReservation(reservation = {}) {
  const booking = normalizeBooking(reservation);
  const totalAmount = toNumber(reservation.totalAmount ?? reservation.totalPrice);
  const seedPayments = Array.isArray(reservation.payments) ? reservation.payments : [];
  const legacyDeposit = toNumber(reservation.depositAmount);
  const payments =
    seedPayments.length > 0
      ? seedPayments.map(normalizePayment)
      : legacyDeposit > 0
        ? [
            normalizePayment({
              amount: legacyDeposit,
              method: DEFAULT_PAYMENT_METHOD,
              paymentDate: booking.startDate || todayISO(),
              type: "seña",
              notes: "Seña inicial",
            }),
          ]
        : [];
  const totalPaid = payments.reduce((sum, payment) => sum + toNumber(payment.amount), 0);
  const balance = Math.max(totalAmount - totalPaid, 0);
  const customerName = reservation.clientName || reservation.customerName || "Nuevo cliente";
  const customerPhone = reservation.clientPhone || reservation.customerPhone || "";

  return {
    ...reservation,
    id: reservation.id || `res-${Date.now()}`,
    clientId: reservation.clientId || customerPhone.replace(/\D/g, "") || `client-${Date.now()}`,
    clientName: customerName,
    clientPhone: customerPhone,
    customerName,
    customerPhone,
    startDate: booking.startDate,
    startTime: booking.startTime || "07:00",
    endDate: booking.endDate || booking.startDate,
    endTime: booking.endTime || "19:00",
    eventDate: booking.startDate,
    timeSlot: `${booking.startTime || "07:00"} - ${booking.endTime || "19:00"}`,
    eventType: reservation.eventType || "Evento",
    guests: toNumber(reservation.guests ?? reservation.guestCount),
    guestCount: toNumber(reservation.guests ?? reservation.guestCount),
    totalAmount,
    totalPrice: totalAmount,
    payments,
    totalPaid,
    depositAmount: totalPaid,
    balance,
    balanceAmount: balance,
    paymentStatus: getPaymentStatus(totalAmount, payments),
    status: reservation.status === "cancelada" ? "cancelada" : "confirmada",
    notes: reservation.notes || "",
    createdAt: reservation.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function buildClients(reservations) {
  const clients = new Map();

  reservations.forEach((reservation) => {
    const key = reservation.clientPhone.replace(/\D/g, "") || reservation.clientId;
    const current =
      clients.get(key) ||
      {
        id: key,
        name: reservation.clientName,
        phone: reservation.clientPhone,
        reservationCount: 0,
        lastReservationDate: "",
        totalBilled: 0,
        totalPaid: 0,
        totalBalance: 0,
        notes: "",
        createdAt: reservation.createdAt,
        updatedAt: reservation.updatedAt,
        reservations: [],
      };

    current.name = reservation.clientName || current.name;
    current.phone = reservation.clientPhone || current.phone;
    current.reservationCount += 1;
    current.totalBilled += reservation.totalAmount;
    current.totalPaid += reservation.totalPaid;
    current.totalBalance += reservation.balance;
    current.lastReservationDate =
      !current.lastReservationDate || reservation.startDate > current.lastReservationDate
        ? reservation.startDate
        : current.lastReservationDate;
    current.reservations.push(reservation);
    current.updatedAt = reservation.updatedAt;
    clients.set(key, current);
  });

  return [...clients.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function buildAdminAvailability(reservations, excludedReservationId = "") {
  return buildAvailabilityFromReservations(
    reservations.filter((reservation) => reservation.status !== "cancelada"),
    excludedReservationId,
  );
}

export function AdminDataProvider({ children }) {
  const [reservations, setReservations] = useState(() =>
    adminReservationsMock.map(normalizeReservation),
  );
  const [expenses, setExpenses] = useState(expenseSeed);
  const [activityLog, setActivityLog] = useState([]);

  const logActivity = (action, detail) => {
    setActivityLog((current) => [
      {
        id: `log-${Date.now()}`,
        date: new Date().toISOString(),
        user: "Admin",
        action,
        detail,
      },
      ...current,
    ]);
  };

  const addReservation = (reservation) => {
    const newReservation = normalizeReservation({
      ...reservation,
      id: reservation.id || `res-${Date.now()}`,
    });
    setReservations((current) => [newReservation, ...current]);
    logActivity("Reserva creada", `${newReservation.clientName} · ${newReservation.startDate}`);
    return newReservation;
  };

  const updateReservation = (id, changes) => {
    setReservations((current) =>
      current.map((reservation) =>
        reservation.id === id ? normalizeReservation({ ...reservation, ...changes }) : reservation,
      ),
    );
    logActivity("Reserva editada", id);
  };

  const removeReservation = (id) => {
    setReservations((current) => current.filter((reservation) => reservation.id !== id));
    logActivity("Reserva eliminada", id);
  };

  const addPayment = (reservationId, payment) => {
    const normalizedPayment = normalizePayment(payment);
    setReservations((current) =>
      current.map((reservation) => {
        if (reservation.id !== reservationId) return reservation;
        return normalizeReservation({
          ...reservation,
          payments: [...reservation.payments, normalizedPayment],
        });
      }),
    );
    logActivity("Pago agregado", `${reservationId} · ${normalizedPayment.amount}`);
    return normalizedPayment;
  };

  const addExpense = (expense) => {
    const newExpense = {
      id: expense.id || `exp-${Date.now()}`,
      date: expense.date || todayISO(),
      category: expense.category || "Otros",
      description: expense.description || "",
      amount: toNumber(expense.amount),
      method: expense.method || "Transferencia",
      receiptUrl: expense.receiptUrl || "",
      receiptName: expense.receiptName || "",
      notes: expense.notes || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setExpenses((current) => [newExpense, ...current]);
    logActivity("Gasto registrado", `${newExpense.category} · ${newExpense.amount}`);
    return newExpense;
  };

  const clients = useMemo(() => buildClients(reservations), [reservations]);

  const value = useMemo(
    () => ({
      reservations,
      expenses,
      clients,
      activityLog,
      availability: buildAdminAvailability(reservations),
      getReservationDates,
      addReservation,
      updateReservation,
      removeReservation,
      addPayment,
      addExpense,
    }),
    [reservations, expenses, clients, activityLog],
  );

  return <AdminDataContext.Provider value={value}>{children}</AdminDataContext.Provider>;
}

export function useAdminData() {
  const context = useContext(AdminDataContext);
  if (!context) {
    throw new Error("useAdminData debe usarse dentro de AdminDataProvider");
  }
  return context;
}
