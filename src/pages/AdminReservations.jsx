import { buildBaseWhatsappUrl } from "../utils/whatsapp.js";
import { venues } from "../data/venues.js";

const reservations = [
  {
    customerName: "Laura Benítez",
    customerPhone: "+595 981 111 222",
    eventDate: "2026-05-03",
    timeSlot: "Día completo",
    eventType: "Casamiento",
    guestCount: 95,
    extras: "Limpieza, sonido, seguridad",
    totalPrice: "Gs. 2.850.000",
    deposit: "Gs. 855.000",
    balance: "Gs. 1.995.000",
    status: "confirmada",
    notes: "Requiere ingreso para catering a las 10:00.",
  },
  {
    customerName: "Martín Rojas",
    customerPhone: "+595 981 333 444",
    eventDate: "2026-05-09",
    timeSlot: "Noche",
    eventType: "Cumpleaños",
    guestCount: 45,
    extras: "Mesas y sillas",
    totalPrice: "Gs. 1.750.000",
    deposit: "Gs. 525.000",
    balance: "Gs. 1.225.000",
    status: "pre-reserva",
    notes: "Esperando confirmación de seña.",
  },
];

export default function AdminReservations() {
  const venue = venues[0];

  return (
    <section className="admin-section">
      <div className="admin-section-heading">
        <h2>Reservas</h2>
        <button type="button">Crear reserva manual</button>
      </div>

      <div className="reservation-grid">
        {reservations.map((reservation) => (
          <article className="reservation-card" key={reservation.customerPhone}>
            <div>
              <h3>{reservation.customerName}</h3>
              <span>{reservation.status}</span>
            </div>
            <dl>
              <dt>Fecha</dt>
              <dd>{reservation.eventDate}</dd>
              <dt>Horario</dt>
              <dd>{reservation.timeSlot}</dd>
              <dt>Evento</dt>
              <dd>{reservation.eventType}</dd>
              <dt>Personas</dt>
              <dd>{reservation.guestCount}</dd>
              <dt>Extras</dt>
              <dd>{reservation.extras}</dd>
              <dt>Precio total</dt>
              <dd>{reservation.totalPrice}</dd>
              <dt>Seña</dt>
              <dd>{reservation.deposit}</dd>
              <dt>Saldo</dt>
              <dd>{reservation.balance}</dd>
              <dt>Notas internas</dt>
              <dd>{reservation.notes}</dd>
            </dl>
            <a href={buildBaseWhatsappUrl(venue)} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}
