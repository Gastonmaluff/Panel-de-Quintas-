import { createContext, useContext, useMemo, useState } from "react";
import { adminReservationsMock } from "../data/adminData.js";

const AdminDataContext = createContext(null);

export function buildAdminAvailability(reservations, excludedReservationId = "") {
  return reservations.reduce(
    (availability, reservation) => {
      if (reservation.id === excludedReservationId) return availability;
      if (reservation.status === "bloqueada") {
        availability.blocked.push(reservation.eventDate);
        return availability;
      }
      if (reservation.status === "pre-reserva") {
        availability.preReserved.push(reservation.eventDate);
        return availability;
      }
      if (reservation.status === "confirmada" || reservation.status === "seña pendiente") {
        availability.reserved.push(reservation.eventDate);
      }
      return availability;
    },
    { reserved: [], preReserved: [], blocked: [] },
  );
}

export function AdminDataProvider({ children }) {
  const [reservations, setReservations] = useState(adminReservationsMock);

  const addReservation = (reservation) => {
    const newReservation = {
      id: reservation.id || `res-${Date.now()}`,
      customerName: reservation.customerName || "Nuevo cliente",
      customerPhone: reservation.customerPhone || "",
      eventDate: reservation.eventDate,
      timeSlot: reservation.timeSlot || "Día completo",
      eventType: reservation.eventType || "Consulta",
      guestCount: Number(reservation.guestCount || 0),
      totalPrice: Number(reservation.totalPrice || 0),
      depositAmount: Number(reservation.depositAmount || 0),
      balanceAmount: Number(reservation.balanceAmount || 0),
      status: reservation.status || "consulta",
      notes: reservation.notes || "",
    };

    setReservations((current) => [newReservation, ...current]);
    return newReservation;
  };

  const updateReservation = (id, changes) => {
    setReservations((current) =>
      current.map((reservation) =>
        reservation.id === id ? { ...reservation, ...changes } : reservation,
      ),
    );
  };

  const removeReservation = (id) => {
    setReservations((current) => current.filter((reservation) => reservation.id !== id));
  };

  const value = useMemo(
    () => ({
      reservations,
      availability: buildAdminAvailability(reservations),
      addReservation,
      updateReservation,
      removeReservation,
    }),
    [reservations],
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
