import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { collection, deleteDoc, doc, onSnapshot, query, setDoc, where } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "../config/firebase.js";
import {
  buildAvailabilityFromReservations,
  getReservationDates,
  normalizeBooking,
} from "../utils/booking.js";
import { cleanParaguayPhone, titleCaseName } from "../utils/formatters.js";
import { useAuth } from "../auth/AuthProvider.jsx";
import { ROLES, isAdminRole } from "../auth/permissions.js";

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

function normalizeTask(task = {}) {
  return {
    id: task.id || makeId("task"),
    title: String(task.title || "").trim(),
    description: task.description || "",
    assignedTo: task.assignedTo || "general",
    assignedToName: task.assignedToName || "General",
    dueDate: task.dueDate || "",
    priority: task.priority || "normal",
    status: task.status === "done" ? "done" : "pending",
    createdBy: task.createdBy || "",
    createdByName: task.createdByName || "",
    completedBy: task.completedBy || "",
    completedByName: task.completedByName || "",
    createdAt: task.createdAt || new Date().toISOString(),
    updatedAt: task.updatedAt || new Date().toISOString(),
    completedAt: task.completedAt || "",
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
  const { profile, role, user } = useAuth();
  const [reservations, setReservations] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [tasksStatus, setTasksStatus] = useState({ loading: true, error: "" });
  const [activityLog, setActivityLog] = useState([]);
  const [users, setUsers] = useState([]);
  const [firebaseStatus, setFirebaseStatus] = useState({ loading: true, error: "" });
  const isAdmin = isAdminRole(role);

  useEffect(() => {
    if (!user || !role) {
      setReservations([]);
      setExpenses([]);
      setTasks([]);
      setActivityLog([]);
      setUsers([]);
      setFirebaseStatus({ loading: false, error: "" });
      setTasksStatus({ loading: false, error: "" });
      return undefined;
    }

    const taskAssignees = [...new Set(["general", user.uid, user.email].filter(Boolean))];
    const tasksRef = isAdmin
      ? collection(db, "tasks")
      : query(collection(db, "tasks"), where("assignedTo", "in", taskAssignees));
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
        tasksRef,
        (snapshot) => {
          setTasks(
            snapshot.docs
              .map((item) => normalizeTask({ id: item.id, ...item.data() }))
              .sort((a, b) => String(a.dueDate || "9999-12-31").localeCompare(String(b.dueDate || "9999-12-31"))),
          );
          setTasksStatus({ loading: false, error: "" });
        },
        (error) => {
          console.error("Tasks permission error", error);
          setTasks([]);
          setTasksStatus({
            loading: false,
            error: "No tenés permisos para ver tareas o falta configurar tu usuario.",
          });
        },
      ),
    ];

    if (isAdmin) {
      unsubscribers.push(
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
        onSnapshot(
          collection(db, "users"),
          (snapshot) => {
            setUsers(
              snapshot.docs
                .map((item) => {
                  const data = item.data();
                  return { ...data, id: data.id || item.id, docId: item.id };
                })
                .sort((a, b) => String(a.email || "").localeCompare(String(b.email || ""))),
            );
          },
          (error) => setFirebaseStatus({ loading: false, error: error.message }),
        ),
      );
    } else {
      setActivityLog([]);
      setUsers([]);
    }

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [isAdmin, role, user]);

  const writeActivity = async (action, detail) => {
    const id = makeId("log");
    const payload = {
      id,
      date: new Date().toISOString(),
      user: user?.email || "Sistema",
      userName: profile?.name || user?.email || "Sistema",
      userRole: role || ROLES.manager,
      userUid: user?.uid || "",
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
      createdBy: user?.email || "",
      createdByUid: user?.uid || "",
      createdByRole: role || ROLES.manager,
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
      updatedBy: user?.email || "",
      updatedByUid: user?.uid || "",
      updatedByRole: role || ROLES.manager,
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
      createdBy: user?.email || "",
      createdByUid: user?.uid || "",
      createdByRole: role || ROLES.manager,
      createdAt: expense.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(doc(db, "expenses", id), newExpense);
    await writeActivity("Gasto creado", `${newExpense.category} - ${newExpense.amount}`);
    if (receiptUrl) await writeActivity("Comprobante subido", `${newExpense.category} - gasto`);
    return newExpense;
  };

  const saveTask = async (taskDraft) => {
    const id = taskDraft.id || makeId("task");
    const currentTask = tasks.find((item) => item.id === id) || {};
    const normalizedTask = normalizeTask({
      ...currentTask,
      ...taskDraft,
      id,
      createdBy: currentTask.createdBy || user?.uid || user?.email || "",
      createdByName: currentTask.createdByName || profile?.name || user?.email || "Sistema",
      createdAt: currentTask.createdAt || taskDraft.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    if (!normalizedTask.title) {
      throw new Error("El título de la tarea es obligatorio.");
    }

    await setDoc(doc(db, "tasks", id), normalizedTask, { merge: true });
    await writeActivity(taskDraft.id ? "Tarea editada" : "Tarea creada", `${normalizedTask.title} - ${normalizedTask.assignedToName}`);
    return normalizedTask;
  };

  const completeTask = async (id) => {
    const task = tasks.find((item) => item.id === id);
    if (!task) return null;
    const payload = {
      status: "done",
      completedAt: new Date().toISOString(),
      completedBy: user?.uid || user?.email || "",
      completedByName: profile?.name || user?.email || "Usuario",
      updatedAt: new Date().toISOString(),
    };

    await setDoc(doc(db, "tasks", id), payload, { merge: true });
    await writeActivity("Tarea completada", `${task.title}`);
    return { ...task, ...payload };
  };

  const reopenTask = async (id) => {
    const task = tasks.find((item) => item.id === id);
    if (!task) return null;
    const payload = {
      status: "pending",
      completedAt: "",
      completedBy: "",
      completedByName: "",
      updatedAt: new Date().toISOString(),
    };

    await setDoc(doc(db, "tasks", id), payload, { merge: true });
    await writeActivity("Tarea reabierta", `${task.title}`);
    return { ...task, ...payload };
  };

  const deleteTask = async (id) => {
    const task = tasks.find((item) => item.id === id);
    if (!task) return null;
    await deleteDoc(doc(db, "tasks", id));
    await writeActivity("Tarea eliminada", `${task.title}`);
    return task;
  };

  const saveUserProfile = async (profileDraft) => {
    const email = String(profileDraft.email || "").trim().toLowerCase();
    const uid = String(profileDraft.uid || profileDraft.id || "").trim();
    const id = uid;
    if (!id || !email || !profileDraft.name?.trim()) {
      throw new Error("Nombre, email y UID de Firebase son obligatorios.");
    }

    const existingUser = users.find((item) => item.id === id || item.uid === id);
    if (!profileDraft.id && existingUser) {
      throw new Error("Ya existe un usuario con este UID.");
    }

    const payload = {
      id,
      uid,
      name: profileDraft.name?.trim() || email,
      email,
      role: profileDraft.role === ROLES.admin ? ROLES.admin : ROLES.manager,
      active: profileDraft.active !== false,
      accesses:
        profileDraft.role === ROLES.admin
          ? ["all"]
          : ["Reservas", "Calendario", "Gastos"],
      createdAt: profileDraft.createdAt || existingUser?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(doc(db, "users", id), payload, { merge: true });
    await writeActivity(profileDraft.id ? "Usuario editado" : "Usuario creado", `${payload.email} - ${payload.role}`);
    return payload;
  };

  const updateUserActiveState = async (id, active) => {
    const target = users.find((item) => item.id === id || item.uid === id);
    if (!target) return null;
    if (active === false && target.uid && target.uid === user?.uid) {
      throw new Error("No podés desactivar tu propio usuario activo.");
    }
    const activeAdmins = users.filter((item) => item.role === ROLES.admin && item.active !== false);
    if (active === false && target.role === ROLES.admin && activeAdmins.length <= 1) {
      throw new Error("No podés desactivar el último Dueño/Admin activo.");
    }

    await setDoc(
      doc(db, "users", target.docId || id),
      { active, updatedAt: new Date().toISOString() },
      { merge: true },
    );
    await writeActivity(active ? "Usuario activado" : "Usuario desactivado", `${target.email || id}`);
    return { ...target, active };
  };

  const deleteUserProfile = async (id) => {
    const target = users.find((item) => item.id === id || item.uid === id);
    if (!target) return null;
    if (target.uid && target.uid === user?.uid) {
      throw new Error("No podés eliminar tu propio usuario activo.");
    }
    const activeAdmins = users.filter((item) => item.role === ROLES.admin && item.active !== false);
    if (target.role === ROLES.admin && target.active !== false && activeAdmins.length <= 1) {
      throw new Error("No podés eliminar el último Dueño/Admin activo.");
    }

    await deleteDoc(doc(db, "users", target.docId || id));
    await writeActivity("Usuario eliminado", `${target.email || id}`);
    return target;
  };

  const clients = useMemo(() => buildClients(reservations), [reservations]);

  const value = useMemo(
    () => ({
      reservations,
      activeReservations: reservations.filter((reservation) => reservation.status !== "cancelada"),
      cancelledReservations: reservations.filter((reservation) => reservation.status === "cancelada"),
      expenses,
      tasks,
      tasksStatus,
      clients,
      activityLog,
      users,
      firebaseStatus,
      availability: buildAdminAvailability(reservations),
      getReservationDates,
      addReservation,
      updateReservation,
      cancelReservation,
      removeReservation: cancelReservation,
      addPayment,
      addExpense,
      saveTask,
      completeTask,
      reopenTask,
      deleteTask,
      saveUserProfile,
      updateUserActiveState,
      deleteUserProfile,
      logActivity: writeActivity,
    }),
    [reservations, expenses, tasks, tasksStatus, clients, activityLog, users, firebaseStatus],
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
