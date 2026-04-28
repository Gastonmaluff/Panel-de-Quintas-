import { useState } from "react";
import {
  adminReservationsMock,
  adminReservationStatuses,
} from "../data/adminData.js";
import { venues } from "../data/venues.js";
import { formatGuaranies } from "../utils/pricing.js";

function buildClientWhatsappUrl(venue, reservation) {
  const phone = reservation.customerPhone.replace(/\D/g, "");
  const message = `Hola ${reservation.customerName}, te escribo por tu reserva en ${venue.name} para el ${reservation.eventDate}.`;
  return `https://wa.me/${phone || venue.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

function getStatusClass(status) {
  return status
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll(" ", "-");
}

export default function AdminReservations() {
  const venue = venues[0];
  const [reservations, setReservations] = useState(adminReservationsMock);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editingReservation, setEditingReservation] = useState(null);

  const updateReservation = (id, changes) => {
    setReservations((current) =>
      current.map((reservation) =>
        reservation.id === id ? { ...reservation, ...changes } : reservation,
      ),
    );
  };

  const addReservation = () => {
    const newReservation = {
      id: `res-${Date.now()}`,
      customerName: "Nuevo cliente",
      customerPhone: "",
      eventDate: "2026-05-22",
      timeSlot: "Día completo",
      eventType: "Consulta",
      guestCount: 0,
      totalPrice: 0,
      depositAmount: 0,
      balanceAmount: 0,
      status: "consulta",
      notes: "",
    };

    setReservations((current) => [newReservation, ...current]);
    setEditingReservation(newReservation);
  };

  const removeReservation = (id) => {
    setReservations((current) => current.filter((reservation) => reservation.id !== id));
    setOpenMenuId(null);
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
    updateReservation(editingReservation.id, editingReservation);
    setEditingReservation(null);
  };

  return (
    <section className="admin-section">
      <div className="admin-section-heading">
        <div>
          <h2>Reservas</h2>
          <p>Revisá cada fecha, seguí pagos pendientes y contactá al cliente en un toque.</p>
        </div>
        <button type="button" onClick={addReservation}>
          Crear reserva manual
        </button>
      </div>

      <div className="admin-reservations-table-wrap">
        <table className="admin-reservations-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Teléfono</th>
              <th>Fecha</th>
              <th>Horario</th>
              <th>Evento</th>
              <th>Personas</th>
              <th>Total</th>
              <th>Seña</th>
              <th>Saldo</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {reservations.map((reservation) => (
              <tr key={reservation.id}>
                <td>
                  <strong>{reservation.customerName}</strong>
                </td>
                <td>{reservation.customerPhone || "Sin teléfono"}</td>
                <td>{reservation.eventDate}</td>
                <td>{reservation.timeSlot}</td>
                <td>{reservation.eventType}</td>
                <td>{reservation.guestCount || "No aplica"}</td>
                <td>{formatGuaranies(reservation.totalPrice)}</td>
                <td>{formatGuaranies(reservation.depositAmount)}</td>
                <td>{formatGuaranies(reservation.balanceAmount)}</td>
                <td>
                  <span className={`admin-status-pill admin-status-pill--${getStatusClass(reservation.status)}`}>
                    {reservation.status}
                  </span>
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
                      <button type="button" onClick={() => setEditingReservation(reservation)}>
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
              </tr>
            ))}
          </tbody>
        </table>
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
              <label>
                Fecha
                <input
                  type="date"
                  value={editingReservation.eventDate}
                  onChange={(event) =>
                    setEditingReservation((current) => ({
                      ...current,
                      eventDate: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Horario
                <input
                  value={editingReservation.timeSlot}
                  onChange={(event) =>
                    setEditingReservation((current) => ({
                      ...current,
                      timeSlot: event.target.value,
                    }))
                  }
                />
              </label>
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
              <button type="button" onClick={saveEditedReservation}>
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
