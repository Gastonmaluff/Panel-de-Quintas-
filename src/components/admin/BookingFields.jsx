import DateAvailabilityPicker from "../calendar/DateAvailabilityPicker.jsx";
import {
  applyBookingMode,
  bookingTimes,
  getBookingModeLabel,
  normalizeBooking,
} from "../../utils/booking.js";

const bookingModes = ["day", "night", "multi_day"];

export default function BookingFields({ availability, value, onChange, eventField = null }) {
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
          {bookingModes.map((mode) => (
            <option key={mode} value={mode}>
              {getBookingModeLabel(mode, "select")}
            </option>
          ))}
        </select>
      </label>

      {eventField}

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
          label="Fecha de salida"
        />
      ) : (
        <label>
          Fecha de salida
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
        Hora de salida
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
