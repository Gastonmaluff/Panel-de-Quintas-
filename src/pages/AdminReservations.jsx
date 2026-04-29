import { useMemo, useState } from "react";
import { buildAdminAvailability, useAdminData } from "../admin/AdminDataProvider.jsx";
import BookingFields from "../components/admin/BookingFields.jsx";
import { adminReservationStatuses } from "../data/adminData.js";
import { venues } from "../data/venues.js";
import { isRangeAvailable } from "../utils/availability.js";
import { bookingModeLabels, normalizeBooking } from "../utils/booking.js";
import { formatGuaranies } from "../utils/pricing.js";

function buildClientWhatsappUrl(venue, reservation) {
  const booking = normalizeBooking(reservation);
  const phone = reservation.customerPhone.replace(/\D/g, "");
  const message = `Hola ${reservation.customerName}, te escribo por tu reserva en ${venue.name} para el ${booking.startDate}.`;
  return `https://wa.me/${phone || venue.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

function getStatusClass(status) {
  return status
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll(" ", "-");
}

function formatTableDate(dateValue) {
  if (!dateValue) return "Sin fecha";

  return new Intl.DateTimeFormat("es-PY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${dateValue}T12:00:00`));
}

function createReservationDraft() {
  return {
    id: `res-${Date.now()}`,
    customerName: "Nuevo cliente",
    customerPhone: "",
    startDate: "",
    startTime: "07:00",
    endDate: "",
    endTime: "19:00",
    bookingMode: "day",
    eventType: "Consulta",
    guestCount: 0,
    totalPrice: 0,
    depositAmount: 0,
    balanceAmount: 0,
    status: "consulta",
    notes: "",
  };
}

function ReservationActionsMenu({
  reservation,
  venue,
  openMenuId,
  setEditingReservation,
  markDepositPaid,
  markBalancePaid,
  updateReservation,
  removeReservation,
}) {
  if (openMenuId !== reservation.id) return null;

  return (
    <div className="admin-actions-menu">
      <button type="button" onClick={() => setEditingReservation(normalizeBooking(reservation))}>
        Editar reserva
      </button>
      <a href={buildClientWhatsappUrl(venue, reservation)} target="_blank" rel="noreferrer">
        Escribir por WhatsApp
      </a>
      <button type="button" onClick={() => markDepositPaid(reservation)}>
        Marcar seña recibida
      </button>
      <button type="button" onClick={() => markBalancePaid(reservation)}>
        Marcar saldo pagado
      </button>
      <label>
        Cambiar estado
        <select
          value={reservation.status}
          onChange={(event) => updateReservation(reservation.id, { status: event.target.value })}
        >
          {adminReservationStatuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>
      <button type="button" onClick={() => updateReservation(reservation.id, { status: "cancelada" })}>
        Cancelar reserva
      </button>
      <button type="button" className="is-danger" onClick={() => removeReservation(reservation.id)}>
        Eliminar reserva
      </button>
    </div>
  );
}

export default function AdminReservations() {
  const venue = venues[0];
  const { reservations, addReservation, updateReservation, removeReservation } = useAdminData();
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editingReservation, setEditingReservation] = useState(null);

  const editingAvailability = useMemo(
    () =>
      editingReservation
        ? buildAdminAvailability(reservations, editingReservation.id)
        : { reserved: [], preReserved: [], blocked: [] },
    [editingReservation, reservations],
  );
  const canSaveEditedReservation =
    !!editingReservation?.startDate &&
    !!editingReservation?.endDate &&
    isRangeAvailable(
      editingReservation.startDate,
      editingReservation.endDate,
      editingAvailability,
    );

  const openNewReservation = () => {
    setEditingReservation(createReservationDraft());
  };

  const markDepositPaid = (reservation) => {
    const depositAmount = reservation.depositAmount || Math.round(reservation.totalPrice * 0.3);
    updateReservation(reservation.id, {
      depositAmount,
      balanceAmount: Math.max(reservation.totalPrice - depositAmount, 0),
      status: "confirmada",
    });
    setOpenMenuId(null);
  };

  const markBalancePaid = (reservation) => {
    updateReservation(reservation.id, { balanceAmount: 0, status: "confirmada" });
    setOpenMenuId(null);
  };

  const saveEditedReservation = () => {
    if (!canSaveEditedReservation) return;

    const existingReservation = reservations.some(
      (reservation) => reservation.id === editingReservation.id,
    );

    if (existingReservation) {
      updateReservation(editingReservation.id, editingReservation);
    } else {
      addReservation(editingReservation);
    }

    setEditingReservation(null);
  };

  const renderActionsMenu = (reservation) => (
    <ReservationActionsMenu
      reservation={reservation}
      venue={venue}
      openMenuId={openMenuId}
      setEditingReservation={setEditingReservation}
      markDepositPaid={markDepositPaid}
      markBalancePaid={markBalancePaid}
      updateReservation={updateReservation}
      removeReservation={removeReservation}
    />
  );

  return (
    <section className="admin-section">
      <div className="admin-section-heading">
        <div>
          <h2>Reservas</h2>
          <p>Revisá cada fecha, seguí pagos pendientes y contactá al cliente en un toque.</p>
        </div>
        <button type="button" onClick={openNewReservation}>
          Crear reserva manual
        </button>
      </div>

      <div className="admin-reservations-table-wrap">
        <table className="admin-reservations-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Teléfono</th>
              <th>Ingreso</th>
              <th>Egreso</th>
              <th>Evento</th>
              <th>Personas</th>
              <th className="money-column money-column--total">Total</th>
              <th className="money-column money-column--deposit">Seña</th>
              <th className="money-column money-column--balance">Saldo</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {reservations.map((reservation) => (
              <tr key={reservation.id}>
                {(() => {
                  const booking = normalizeBooking(reservation);
                  return (
                    <>
                <td>
                  <strong>{reservation.customerName}</strong>
                </td>
                <td className="admin-reservations-table__phone">{reservation.customerPhone || "Sin teléfono"}</td>
                <td>
                  <strong>{formatTableDate(booking.startDate)}</strong>
                  <small>{booking.startTime}</small>
                </td>
                <td>
                  <strong>{formatTableDate(booking.endDate)}</strong>
                  <small>{booking.endTime}</small>
                </td>
                <td className="admin-reservations-table__event">{reservation.eventType}</td>
                <td>{reservation.guestCount || "No aplica"}</td>
                <td className="money-column money-column--total">{formatGuaranies(reservation.totalPrice)}</td>
                <td className="money-column money-column--deposit">{formatGuaranies(reservation.depositAmount)}</td>
                <td className="money-column money-column--balance">{formatGuaranies(reservation.balanceAmount)}</td>
                <td>
                  <span className={`admin-status-pill admin-status-pill--${getStatusClass(reservation.status)}`}>
                    {reservation.status}
                  </span>
                  <small>{bookingModeLabels[booking.bookingMode]}</small>
                </td>
                <td className="admin-actions-cell">
                  <button
                    type="button"
                    className="admin-actions-button"
                    onClick={() =>
                      setOpenMenuId((current) => (current === reservation.id ? null : reservation.id))
                    }
                  >
                    Acciones
                  </button>
                  {openMenuId === reservation.id ? (
                    <div className="admin-actions-menu">
                      <button type="button" onClick={() => setEditingReservation(normalizeBooking(reservation))}>
                        Editar reserva
                      </button>
                      <a href={buildClientWhatsappUrl(venue, reservation)} target="_blank" rel="noreferrer">
                        Escribir por WhatsApp
                      </a>
                      <button type="button" onClick={() => markDepositPaid(reservation)}>
                        Marcar seña recibida
                      </button>
                      <button type="button" onClick={() => markBalancePaid(reservation)}>
                        Marcar saldo pagado
                      </button>
                      <label>
                        Cambiar estado
                        <select
                          value={reservation.status}
                          onChange={(event) =>
                            updateReservation(reservation.id, { status: event.target.value })
                          }
                        >
                          {adminReservationStatuses.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button type="button" onClick={() => updateReservation(reservation.id, { status: "cancelada" })}>
                        Cancelar reserva
                      </button>
                      <button type="button" className="is-danger" onClick={() => removeReservation(reservation.id)}>
                        Eliminar reserva
                      </button>
                    </div>
                  ) : null}
                </td>
                    </>
                  );
                })()}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="admin-reservations-mobile-list">
        {reservations.map((reservation) => {
          const booking = normalizeBooking(reservation);
          const hasPhone = Boolean(reservation.customerPhone?.replace(/\D/g, ""));

          return (
            <article className="admin-reservation-mobile-card" key={reservation.id}>
              <header>
                <div>
                  <h3>{reservation.customerName}</h3>
                  <p>
                    {reservation.eventType} · {reservation.guestCount || "No aplica"} personas
                  </p>
                </div>
                <span className={`admin-status-pill admin-status-pill--${getStatusClass(reservation.status)}`}>
                  {reservation.status}
                </span>
              </header>

              <p className="admin-reservation-mobile-card__phone">
                {reservation.customerPhone || "Sin telefono"}
              </p>

              <div className="admin-reservation-mobile-card__dates">
                <div>
                  <span>Ingreso</span>
                  <strong>{formatTableDate(booking.startDate)} · {booking.startTime}</strong>
                </div>
                <div>
                  <span>Egreso</span>
                  <strong>{formatTableDate(booking.endDate)} · {booking.endTime}</strong>
                </div>
              </div>

              <div className="admin-reservation-mobile-card__money">
                <div>
                  <span>Total</span>
                  <strong>{formatGuaranies(reservation.totalPrice)}</strong>
                </div>
                <div>
                  <span>Seña</span>
                  <strong>{formatGuaranies(reservation.depositAmount)}</strong>
                </div>
                <div>
                  <span>Saldo</span>
                  <strong>{formatGuaranies(reservation.balanceAmount)}</strong>
                </div>
              </div>

              <footer className="admin-reservation-mobile-card__actions">
                {hasPhone ? (
                  <a href={buildClientWhatsappUrl(venue, reservation)} target="_blank" rel="noreferrer">
                    WhatsApp
                  </a>
                ) : (
                  <button type="button" disabled>
                    Sin telefono
                  </button>
                )}
                <div className="admin-actions-cell">
                  <button
                    type="button"
                    className="admin-actions-button"
                    onClick={() =>
                      setOpenMenuId((current) => (current === reservation.id ? null : reservation.id))
                    }
                  >
                    Acciones
                  </button>
                  {renderActionsMenu(reservation)}
                </div>
              </footer>
            </article>
          );
        })}
      </div>

      {editingReservation ? (
        <div className="admin-modal-backdrop" role="presentation">
          <div className="admin-modal" role="dialog" aria-modal="true">
            <div className="admin-modal__header">
              <div>
                <p className="eyebrow">Editar reserva</p>
                <h3>{editingReservation.customerName}</h3>
              </div>
              <button type="button" onClick={() => setEditingReservation(null)}>
                Cerrar
              </button>
            </div>

            <div className="reservation-edit-form">
              <label>
                Nombre del cliente
                <input
                  value={editingReservation.customerName}
                  onChange={(event) =>
                    setEditingReservation((current) => ({
                      ...current,
                      customerName: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Teléfono
                <input
                  value={editingReservation.customerPhone}
                  onChange={(event) =>
                    setEditingReservation((current) => ({
                      ...current,
                      customerPhone: event.target.value,
                    }))
                  }
                />
              </label>
              <BookingFields
                availability={editingAvailability}
                value={editingReservation}
                onChange={(booking) =>
                  setEditingReservation((current) => ({ ...current, ...booking }))
                }
              />
              <label>
                Tipo de evento
                <input
                  value={editingReservation.eventType}
                  onChange={(event) =>
                    setEditingReservation((current) => ({
                      ...current,
                      eventType: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Personas
                <input
                  type="number"
                  value={editingReservation.guestCount}
                  onChange={(event) =>
                    setEditingReservation((current) => ({
                      ...current,
                      guestCount: Number(event.target.value),
                    }))
                  }
                />
              </label>
              <label>
                Precio total
                <input
                  type="number"
                  value={editingReservation.totalPrice}
                  onChange={(event) =>
                    setEditingReservation((current) => ({
                      ...current,
                      totalPrice: Number(event.target.value),
                    }))
                  }
                />
              </label>
              <label>
                Seña
                <input
                  type="number"
                  value={editingReservation.depositAmount}
                  onChange={(event) =>
                    setEditingReservation((current) => ({
                      ...current,
                      depositAmount: Number(event.target.value),
                    }))
                  }
                />
              </label>
              <label>
                Saldo
                <input
                  type="number"
                  value={editingReservation.balanceAmount}
                  onChange={(event) =>
                    setEditingReservation((current) => ({
                      ...current,
                      balanceAmount: Number(event.target.value),
                    }))
                  }
                />
              </label>
              <label>
                Estado
                <select
                  value={editingReservation.status}
                  onChange={(event) =>
                    setEditingReservation((current) => ({
                      ...current,
                      status: event.target.value,
                    }))
                  }
                >
                  {adminReservationStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
              <label className="reservation-edit-form__notes">
                Notas internas
                <textarea
                  value={editingReservation.notes}
                  onChange={(event) =>
                    setEditingReservation((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                />
              </label>
            </div>

            <div className="admin-modal__actions">
              <button type="button" onClick={saveEditedReservation} disabled={!canSaveEditedReservation}>
                Guardar cambios
              </button>
              <button type="button" onClick={() => setEditingReservation(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
