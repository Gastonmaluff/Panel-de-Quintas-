import { useEffect, useMemo, useState } from "react";
import DateAvailabilityPicker from "../calendar/DateAvailabilityPicker.jsx";
import {
  getDateAvailability,
  getUnavailableDatesInRange,
  isRangeAvailable,
} from "../../utils/availability.js";
import {
  applyBookingMode,
  bookingTimes,
  getBookingModeLabel,
} from "../../utils/booking.js";
import { buildWhatsappUrl } from "../../utils/whatsapp.js";
import {
  calculateQuote,
  eventTypeLabels,
  formatGuaranies,
} from "../../utils/pricing.js";

const initialQuoteValues = {
  bookingMode: "day",
  startDate: "",
  startTime: "07:00",
  endDate: "",
  endTime: "19:00",
  eventType: "cumpleanos",
  guestCount: 45,
};

export default function QuoteCalculator({ venue, rules, availability }) {
  const [values, setValues] = useState(initialQuoteValues);
  const [dateWarning, setDateWarning] = useState("");

  const selectedStartAvailability = useMemo(
    () => getDateAvailability(values.startDate, availability),
    [availability, values.startDate],
  );
  const unavailableRangeDates = useMemo(
    () => getUnavailableDatesInRange(values.startDate, values.endDate, availability),
    [availability, values.endDate, values.startDate],
  );
  const isBookingRangeValid =
    Boolean(values.startDate) &&
    Boolean(values.endDate) &&
    values.endDate >= values.startDate &&
    isRangeAvailable(values.startDate, values.endDate, availability);
  const isGuestCountValid = Number(values.guestCount) > 0;
  const isQuoteReady =
    isBookingRangeValid &&
    selectedStartAvailability.selectable &&
    isGuestCountValid &&
    Boolean(values.eventType);
  const quote = useMemo(
    () => (isQuoteReady ? calculateQuote(values, rules) : null),
    [isQuoteReady, rules, values],
  );
  const whatsappUrl = quote ? buildWhatsappUrl({ venue, quoteValues: values, quote }) : "#";

  useEffect(() => {
    if (values.startDate && !selectedStartAvailability.selectable) {
      setDateWarning(`${selectedStartAvailability.reason}. Elegí otra fecha disponible.`);
      setValues((current) => ({ ...current, startDate: "", endDate: "" }));
      return;
    }

    if (unavailableRangeDates.length) {
      setDateWarning("El rango seleccionado incluye fechas no disponibles. Elegí otras fechas.");
    }
  }, [selectedStartAvailability, unavailableRangeDates.length, values.startDate]);

  const updateValue = (key, value) => {
    setDateWarning("");
    setValues((current) => {
      if (key === "bookingMode") return applyBookingMode(current, value);
      if (key === "startDate") return applyBookingMode(current, current.bookingMode, value);
      return { ...current, [key]: value };
    });
  };

  return (
    <section className="quote-band" id="cotizador">
      <div className="section-shell quote-layout">
        <div className="quote-copy">
          <p className="eyebrow">Cotizador</p>
          <h2>Estimá tu evento antes de consultar.</h2>
          <p>
            Elegí turno día, turno noche o varios días. El rango usa la misma
            disponibilidad que el calendario público.
          </p>
        </div>

        <div className="quote-panel">
          <label className="booking-mode-field">
            <span>Tipo de reserva</span>
            <select
              value={values.bookingMode}
              onChange={(event) => updateValue("bookingMode", event.target.value)}
            >
              {["day", "night", "multi_day"].map((value) => (
                <option key={value} value={value}>
                  {getBookingModeLabel(value, "select")}
                </option>
              ))}
            </select>
          </label>

          <div className="booking-range-grid">
            <DateAvailabilityPicker
              availability={availability}
              value={values.startDate}
              onChange={(date) => updateValue("startDate", date)}
              label="Fecha de ingreso"
            />
            {values.bookingMode === "multi_day" ? (
              <DateAvailabilityPicker
                availability={availability}
                value={values.endDate}
                onChange={(date) => updateValue("endDate", date)}
                label="Fecha de egreso"
              />
            ) : (
              <label className="readonly-date-field">
                <span>Fecha de egreso</span>
                <input value={values.endDate || "Se completa al elegir ingreso"} readOnly />
              </label>
            )}
          </div>

          {dateWarning ? <p className="quote-alert">{dateWarning}</p> : null}

          <div className="form-grid">
            <label>
              <span>Hora de ingreso</span>
              <select
                value={values.startTime}
                onChange={(event) => updateValue("startTime", event.target.value)}
                disabled={values.bookingMode !== "multi_day"}
              >
                {bookingTimes.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Hora de egreso</span>
              <select
                value={values.endTime}
                onChange={(event) => updateValue("endTime", event.target.value)}
                disabled={values.bookingMode !== "multi_day"}
              >
                {bookingTimes.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Tipo de evento</span>
              <select
                value={values.eventType}
                onChange={(event) => updateValue("eventType", event.target.value)}
              >
                {Object.entries(eventTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Cantidad de personas</span>
              <input
                min="1"
                type="number"
                value={values.guestCount}
                onChange={(event) => updateValue("guestCount", event.target.value)}
              />
            </label>
          </div>

          {quote ? (
            <div className="quote-result">
              <div>
                <span>Rango elegido</span>
                <strong>{quote.daysCount} día{quote.daysCount === 1 ? "" : "s"}</strong>
              </div>
              <div>
                <span>Precio estimado</span>
                <strong>{formatGuaranies(quote.totalPrice)}</strong>
              </div>
              <div>
                <span>Seña sugerida</span>
                <strong>{formatGuaranies(quote.depositAmount)}</strong>
              </div>
              <div>
                <span>Saldo aproximado</span>
                <strong>{formatGuaranies(quote.balanceAmount)}</strong>
              </div>
            </div>
          ) : (
            <div className="quote-empty-state">
              Elegí una fecha disponible para estimar tu evento.
            </div>
          )}

          <a
            className={`primary-button primary-button--wide ${isQuoteReady ? "" : "is-disabled"}`}
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            aria-disabled={!isQuoteReady}
            tabIndex={isQuoteReady ? 0 : -1}
            onClick={(event) => {
              if (!isQuoteReady) event.preventDefault();
            }}
          >
            Consultar con este presupuesto
          </a>
        </div>
      </div>
    </section>
  );
}
