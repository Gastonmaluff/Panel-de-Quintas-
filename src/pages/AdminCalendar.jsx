import AvailabilityCalendar from "../components/calendar/AvailabilityCalendar.jsx";
import { availabilityMock } from "../data/venues.js";

export default function AdminCalendar() {
  return (
    <section className="admin-section admin-calendar-section">
      <div className="admin-section-heading">
        <h2>Calendario interno</h2>
        <div>
          <button type="button">Bloquear fecha</button>
          <button type="button">Nueva reserva</button>
        </div>
      </div>
      <AvailabilityCalendar availability={availabilityMock} />
    </section>
  );
}
