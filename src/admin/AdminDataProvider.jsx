import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, setDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "../config/firebase.js";
import {
  buildAvailabilityFromReservations,
  getReservationDates,
  normalizeBooking,
} from "../utils/booking.js";
import { cleanParaguayPhone, titleCaseName } from "../utils/formatters.js";
import { useAuth } from "../auth/AuthProvider.jsx";

const AdminDataContext = createContext(null);
const DEFAULT_PAYMENT_METHOD = "Transferencia";

function toNumber(value) {
  return Number(value || 0);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function getPaymentStatus(totalAmount, payments) {
  const totalPaid = payments.reduce((sum, payment) => sum + toNumber(payment.amount), 0);

  if (totalPaid <= 0) return "Sin pago";
  if (totalPaid >= totalAmount && totalAmount > 0) return "Pagado";
  if (payments.length <= 1) return "Seña recibida";
  return "Pago parcial";
}

function stripFileFields(item = {}) {
  const { receiptFile, receiptPreview, ...safeItem } = item;
  return safeItem;
}

function normalizePayment(payment = {}, index = 0) {
  return {
    id: payment.id || makeId(`pay-${index}`),
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

export function normalizeReservation(reservation = {}) {
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
  const clientCedula = reservation.clientCedula || reservation.clientDocument || "";
  const cleanPhone = cleanParaguayPhone(customerPhone);

  return {
    ...reservation,
    id: reservation.id || makeId("res"),
    clientId: reservation.clientId || cleanPhone || clientCedula || makeId("client"),
    clientName: titleCaseName(customerName) || customerName,
    clientCedula,
    clientDocument: clientCedula,
    clientPhone: cleanPhone,
    customerName: titleCaseName(customerName) || customerName,
    customerPhone: cleanPhone,
    startDate: booking.startDate,
    startTime: booking.startTime,
    endDate: booking.endDate || booking.startDate,
    endTime: booking.endTime,
    eventDate: booking.startDate,
    timeSlot: `${booking.startTime} - ${booking.endTime}`,
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
    status: reservation.status === "cancelada" ? "cancelada" : reservation.status || "confirmada",
    cancellationReason: reservation.cancellationReason || "",
    cancelledAt: reservation.cancelledAt || "",
    cancelledBy: reservation.cancelledBy || "",
    notes: reservation.notes || "",
    createdAt: reservation.createdAt || new Date().toISOString(),
    updatedAt: reservation.updatedAt || new Date().toISOString(),
  };
}

function buildClients(reservations) {
  const clients = new Map();

  reservations
    .filter((reservation) => reservation.status !== "cancelada")
    .forEach((reservation) => {
      const key = reservation.clientPhone || reservation.clientCedula || reservation.clientId;
      const current =
        clients.get(key) ||
        {
          id: key,
          name: reservation.clientName,
          phone: reservation.clientPhone,
          cedula: reservation.clientCedula,
          clientCedula: reservation.clientCedula,
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
      current.cedula = reservation.clientCedula || current.cedula;
      current.clientCedula = current.cedula;
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

async function uploadReceiptFile(file, folder, ownerId) {
  if (!file) return "";
  const safeName = file.name.replace(/[^\w.-]+/g, "-");
  const path = `${folder}/${ownerId}/${Date.now()}-${safeName}`;
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, file);
  return getDownloadURL(fileRef);
}

export function AdminDataProvider({ children }) {
  const { user } = useAuth();
  const [reservations, setReservations] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [firebaseStatus, setFirebaseStatus] = useState({ loading: true, error: "" });

  useEffect(() => {
    const unsubscribers = [
      onSnapshot(
        collection(db, "reservations"),
        (snapshot) => {
          setReservations(
            snapshot.docs.map((item) => normalizeReservation({ id: item.id, ...item.data() })),
          );
          setFirebaseStatus({ loading: false, error: "" });
        },
        (error) => setFirebaseStatus({ loading: false, error: error.message }),
      ),
      onSnapshot(
        collection(db, "expenses"),
        (snapshot) => {
          setExpenses(
            snapshot.docs
              .map((item) => ({ id: item.id, ...item.data() }))
              .sort((a, b) => String(b.date).localeCompare(String(a.date))),
          );
        },
        (error) => setFirebaseStatus({ loading: false, error: error.message }),
      ),
      onSnapshot(
        collection(db, "activityLog"),
        (snapshot) => {
          setActivityLog(
            snapshot.docs
              .map((item) => ({ id: item.id, ...item.data() }))
              .sort((a, b) => String(b.date).localeCompare(String(a.date))),
          );
        },
        (error) => setFirebaseStatus({ loading: false, error: error.message }),
      ),
    ];

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, []);

  const writeActivity = async (action, detail) => {
    const id = makeId("log");
    const payload = {
      id,
      date: new Date().toISOString(),
      user: user?.email || "Sistema",
      action,
      detail,
    };

    try {
      await setDoc(doc(db, "activityLog", id), payload);
    } catch (error) {
      setFirebaseStatus((current) => ({ ...current, error: error.message }));
    }
  };

  const persistClientSnapshot = async (reservation) => {
    if (!reservation.clientId) return;
    await setDoc(
      doc(db, "clients", reservation.clientId),
      {
        id: reservation.clientId,
        name: reservation.clientName,
        phone: reservation.clientPhone,
        cedula: reservation.clientCedula,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
  };

  const addReservation = async (reservation) => {
    const id = reservation.id || makeId("res");
    const uploadedPayments = await Promise.all(
      (reservation.payments || []).map(async (payment, index) => {
        const receiptUrl =
          payment.receiptUrl || (await uploadReceiptFile(payment.receiptFile, "receipts/payments", id));
        return normalizePayment({ ...stripFileFields(payment), receiptUrl }, index);
      }),
    );
    const newReservation = normalizeReservation({
      ...stripFileFields(reservation),
      id,
      payments: uploadedPayments,
      createdAt: reservation.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await setDoc(doc(db, "reservations", id), newReservation);
    await persistClientSnapshot(newReservation);
    await writeActivity("Reserva creada", `${newReservation.clientName} - ${newReservation.startDate}`);
    return newReservation;
  };

  const updateReservation = async (id, changes) => {
    const currentReservation = reservations.find((reservation) => reservation.id === id) || {};
    const updatedReservation = normalizeReservation({
      ...currentReservation,
      ...stripFileFields(changes),
      id,
      updatedAt: new Date().toISOString(),
    });

    await setDoc(doc(db, "reservations", id), updatedReservation, { merge: true });
    await persistClientSnapshot(updatedReservation);
    await writeActivity("Reserva editada", `${updatedReservation.clientName} - ${id}`);
  };

  const cancelReservation = async (id, reason = "") => {
    const reservation = reservations.find((item) => item.id === id);
    if (!reservation) return;

    await setDoc(
      doc(db, "reservations", id),
      {
        status: "cancelada",
        cancellationReason: reason,
        cancelledAt: new Date().toISOString(),
        cancelledBy: user?.email || "Sistema",
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
    await writeActivity("Reserva cancelada", `${reservation.clientName} - ${reservation.startDate}`);
  };

  const addPayment = async (reservationId, payment) => {
    const reservation = reservations.find((item) => item.id === reservationId);
    if (!reservation) return null;

    const receiptUrl =
      payment.receiptUrl ||
      (await uploadReceiptFile(payment.receiptFile, "receipts/payments", reservationId));
    const normalizedPayment = normalizePayment({ ...stripFileFields(payment), receiptUrl });
    const updatedReservation = normalizeReservation({
      ...reservation,
      payments: [...reservation.payments, normalizedPayment],
      updatedAt: new Date().toISOString(),
    });

    await setDoc(doc(db, "reservations", reservationId), updatedReservation, { merge: true });
    await writeActivity("Pago agregado", `${reservation.clientName} - ${normalizedPayment.amount}`);
    if (receiptUrl) await writeActivity("Comprobante subido", `${reservation.clientName} - pago`);
    return normalizedPayment;
  };

  const addExpense = async (expense) => {
    const id = expense.id || makeId("exp");
    const receiptUrl =
      expense.receiptUrl || (await uploadReceiptFile(expense.receiptFile, "receipts/expenses", id));
    const newExpense = {
      ...stripFileFields(expense),
      id,
      date: expense.date || todayISO(),
      category: expense.category || "Otros",
      description: expense.description || "",
      amount: toNumber(expense.amount),
      method: expense.method || "Transferencia",
      receiptUrl,
      receiptName: expense.receiptName || "",
      notes: expense.notes || "",
      createdAt: expense.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(doc(db, "expenses", id), newExpense);
    await writeActivity("Gasto creado", `${newExpense.category} - ${newExpense.amount}`);
    if (receiptUrl) await writeActivity("Comprobante subido", `${newExpense.category} - gasto`);
    return newExpense;
  };

  const clients = useMemo(() => buildClients(reservations), [reservations]);

  const value = useMemo(
    () => ({
      reservations,
      activeReservations: reservations.filter((reservation) => reservation.status !== "cancelada"),
      cancelledReservations: reservations.filter((reservation) => reservation.status === "cancelada"),
      expenses,
      clients,
      activityLog,
      firebaseStatus,
      availability: buildAdminAvailability(reservations),
      getReservationDates,
      addReservation,
      updateReservation,
      cancelReservation,
      removeReservation: cancelReservation,
      addPayment,
      addExpense,
      logActivity: writeActivity,
    }),
    [reservations, expenses, clients, activityLog, firebaseStatus],
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
