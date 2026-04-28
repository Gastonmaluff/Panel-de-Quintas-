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

export default function AdminReservations() {
  const venue = venues[0];
  const [reservations, setReservations] = useState(adminReservationsMock);

  const updateReservation = (id, key, value) => {
    setReservations((current) =>
      current.map((reservation) =>
        reservation.id === id ? { ...reservation, [key]: value } : reservation,
      ),
    );
  };

  const addReservation = () => {
    setReservations((current) => [
      {
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
      },
      ...current,
    ]);
  };

  return (
    <section className="admin-section">
      <div className="admin-section-heading">
        <div>
          <h2>Reservas</h2>
          <p>Creá reservas manuales, cambiá estados y abrí WhatsApp del cliente.</p>
        </div>
        <button type="button" onClick={addReservation}>
          Crear reserva manual
        </button>
      </div>

      <div className="reservation-grid">
        {reservations.map((reservation) => (
          <article className="reservation-card reservation-card--editable" key={reservation.id}>
            <div>
              <input
                aria-label="Nombre del cliente"
                value={reservation.customerName}
                onChange={(event) =>
                  updateReservation(reservation.id, "customerName", event.target.value)
                }
              />
              <select
                value={reservation.status}
                onChange={(event) =>
                  updateReservation(reservation.id, "status", event.target.value)
                }
              >
                {adminReservationStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div className="reservation-form-grid">
              <label>
                Teléfono
                <input
                  value={reservation.customerPhone}
                  onChange={(event) =>
                    updateReservation(reservation.id, "customerPhone", event.target.value)
                  }
                />
              </label>
              <label>
                Fecha
                <input
                  type="date"
                  value={reservation.eventDate}
                  onChange={(event) =>
                    updateReservation(reservation.id, "eventDate", event.target.value)
                  }
                />
              </label>
              <label>
                Horario
                <input
                  value={reservation.timeSlot}
                  onChange={(event) =>
                    updateReservation(reservation.id, "timeSlot", event.target.value)
                  }
                />
              </label>
              <label>
                Tipo de evento
                <input
                  value={reservation.eventType}
                  onChange={(event) =>
                    updateReservation(reservation.id, "eventType", event.target.value)
                  }
                />
              </label>
              <label>
                Personas
                <input
                  type="number"
                  value={reservation.guestCount}
                  onChange={(event) =>
                    updateReservation(reservation.id, "guestCount", Number(event.target.value))
                  }
                />
              </label>
              <label>
                Precio total
                <input
                  type="number"
                  value={reservation.totalPrice}
                  onChange={(event) =>
                    updateReservation(reservation.id, "totalPrice", Number(event.target.value))
                  }
                />
              </label>
              <label>
                Seña
                <input
                  type="number"
                  value={reservation.depositAmount}
                  onChange={(event) =>
                    updateReservation(reservation.id, "depositAmount", Number(event.target.value))
                  }
                />
              </label>
              <label>
                Saldo
                <input
                  type="number"
                  value={reservation.balanceAmount}
                  onChange={(event) =>
                    updateReservation(reservation.id, "balanceAmount", Number(event.target.value))
                  }
                />
              </label>
            </div>

            <label>
              Notas internas
              <textarea
                value={reservation.notes}
                onChange={(event) =>
                  updateReservation(reservation.id, "notes", event.target.value)
                }
              />
            </label>

            <div className="reservation-card__summary">
              <span>Total: {formatGuaranies(reservation.totalPrice)}</span>
              <span>Seña: {formatGuaranies(reservation.depositAmount)}</span>
              <span>Saldo: {formatGuaranies(reservation.balanceAmount)}</span>
            </div>

            <div className="reservation-card__actions">
              <button type="button">Marcar seña recibida</button>
              <button type="button">Marcar saldo pagado</button>
              <a href={buildClientWhatsappUrl(venue, reservation)} target="_blank" rel="noreferrer">
                WhatsApp
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
