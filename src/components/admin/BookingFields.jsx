import DateAvailabilityPicker from "../calendar/DateAvailabilityPicker.jsx";
import {
  applyBookingMode,
  bookingModeLabels,
  bookingTimes,
  normalizeBooking,
} from "../../utils/booking.js";

export default function BookingFields({ availability, value, onChange }) {
  const booking = normalizeBooking(value);

  const updateBooking = (key, nextValue) => {
    if (key === "bookingMode") {
      onChange(applyBookingMode(booking, nextValue));
      return;
    }

    if (key === "startDate") {
      onChange(applyBookingMode(booking, booking.bookingMode, nextValue));
      return;
    }

    onChange({ ...booking, [key]: nextValue });
  };

  return (
    <div className="booking-fields">
      <label>
        Tipo de reserva
        <select
          value={booking.bookingMode}
          onChange={(event) => updateBooking("bookingMode", event.target.value)}
        >
          {Object.entries(bookingModeLabels).map(([mode, label]) => (
            <option key={mode} value={mode}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <DateAvailabilityPicker
        availability={availability}
        value={booking.startDate}
        onChange={(date) => updateBooking("startDate", date)}
        label="Fecha de ingreso"
      />

      {booking.bookingMode === "multi_day" ? (
        <DateAvailabilityPicker
          availability={availability}
          value={booking.endDate}
          onChange={(date) => updateBooking("endDate", date)}
          label="Fecha de egreso"
        />
      ) : (
        <label>
          Fecha de egreso
          <input value={booking.endDate || "Se completa al elegir ingreso"} readOnly />
        </label>
      )}

      <label>
        Hora de ingreso
        <select
          value={booking.startTime}
          onChange={(event) => updateBooking("startTime", event.target.value)}
          disabled={booking.bookingMode !== "multi_day"}
        >
          {bookingTimes.map((time) => (
            <option key={time} value={time}>
              {time}
            </option>
          ))}
        </select>
      </label>

      <label>
        Hora de egreso
        <select
          value={booking.endTime}
          onChange={(event) => updateBooking("endTime", event.target.value)}
          disabled={booking.bookingMode !== "multi_day"}
        >
          {bookingTimes.map((time) => (
            <option key={time} value={time}>
              {time}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
