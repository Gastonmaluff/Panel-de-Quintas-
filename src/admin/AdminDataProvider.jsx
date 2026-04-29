import { createContext, useContext, useMemo, useState } from "react";
import { adminReservationsMock } from "../data/adminData.js";
import {
  buildAvailabilityFromReservations,
  normalizeBooking,
} from "../utils/booking.js";

const AdminDataContext = createContext(null);

export function buildAdminAvailability(reservations, excludedReservationId = "") {
  return buildAvailabilityFromReservations(reservations, excludedReservationId);
}

export function AdminDataProvider({ children }) {
  const [reservations, setReservations] = useState(adminReservationsMock);

  const addReservation = (reservation) => {
    const booking = normalizeBooking(reservation);
    const newReservation = {
      id: reservation.id || `res-${Date.now()}`,
      customerName: reservation.customerName || "Nuevo cliente",
      customerPhone: reservation.customerPhone || "",
      startDate: booking.startDate,
      startTime: booking.startTime,
      endDate: booking.endDate,
      endTime: booking.endTime,
      bookingMode: booking.bookingMode,
      eventDate: booking.startDate,
      timeSlot: booking.timeSlot,
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
      current.map((reservation) => {
        if (reservation.id !== id) return reservation;
        const updated = normalizeBooking({ ...reservation, ...changes });
        return {
          ...reservation,
          ...changes,
          startDate: updated.startDate,
          startTime: updated.startTime,
          endDate: updated.endDate,
          endTime: updated.endTime,
          bookingMode: updated.bookingMode,
          eventDate: updated.startDate,
          timeSlot: updated.timeSlot,
        };
      }),
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
