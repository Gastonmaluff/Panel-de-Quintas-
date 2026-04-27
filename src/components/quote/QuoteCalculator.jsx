import { useEffect, useMemo, useState } from "react";
import DateAvailabilityPicker from "../calendar/DateAvailabilityPicker.jsx";
import { getDateAvailability } from "../../utils/availability.js";
import { buildWhatsappUrl } from "../../utils/whatsapp.js";
import {
  calculateQuote,
  eventTypeLabels,
  extraLabels,
  formatGuaranies,
  timeSlotLabels,
} from "../../utils/pricing.js";

const initialQuoteValues = {
  date: "",
  eventType: "cumpleanos",
  guestCount: 45,
  timeSlot: "dia_completo",
  extras: ["limpieza", "mesas_sillas"],
};

export default function QuoteCalculator({ venue, rules, availability }) {
  const [values, setValues] = useState(initialQuoteValues);
  const [dateWarning, setDateWarning] = useState("");

  const selectedDateAvailability = useMemo(
    () => getDateAvailability(values.date, availability),
    [availability, values.date],
  );
  const isGuestCountValid = Number(values.guestCount) > 0;
  const isQuoteReady =
    Boolean(values.date) &&
    selectedDateAvailability.selectable &&
    isGuestCountValid &&
    Boolean(values.eventType) &&
    Boolean(values.timeSlot);
  const quote = useMemo(
    () => (isQuoteReady ? calculateQuote(values, rules) : null),
    [isQuoteReady, rules, values],
  );
  const whatsappUrl = quote ? buildWhatsappUrl({ venue, quoteValues: values, quote }) : "#";

  useEffect(() => {
    if (values.date && !selectedDateAvailability.selectable) {
      setDateWarning(`${selectedDateAvailability.reason}. Elegí otra fecha disponible.`);
      setValues((current) => ({ ...current, date: "" }));
    }
  }, [selectedDateAvailability, values.date]);

  const updateValue = (key, value) => {
    if (key === "date") setDateWarning("");
    setValues((current) => ({ ...current, [key]: value }));
  };

  const toggleExtra = (extra) => {
    setValues((current) => ({
      ...current,
      extras: current.extras.includes(extra)
        ? current.extras.filter((item) => item !== extra)
        : [...current.extras, extra],
    }));
  };

  return (
    <section className="quote-band" id="cotizador">
      <div className="section-shell quote-layout">
        <div className="quote-copy">
          <p className="eyebrow">Cotizador</p>
          <h2>Estimá tu evento antes de consultar.</h2>
          <p>
            La fecha usa la misma disponibilidad que el calendario público. No se
            puede cotizar una fecha reservada, pre-reservada, bloqueada o pasada.
          </p>
        </div>

        <div className="quote-panel">
          <DateAvailabilityPicker
            availability={availability}
            value={values.date}
            onChange={(date) => updateValue("date", date)}
          />

          {dateWarning ? <p className="quote-alert">{dateWarning}</p> : null}

          <div className="form-grid">
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

            <label>
              <span>Horario</span>
              <select
                value={values.timeSlot}
                onChange={(event) => updateValue("timeSlot", event.target.value)}
              >
                {Object.entries(timeSlotLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <fieldset className="extras-fieldset">
            <legend>Extras</legend>
            <div className="extras-grid">
              {Object.entries(extraLabels).map(([value, label]) => (
                <label className="check-pill" key={value}>
                  <input
                    type="checkbox"
                    checked={values.extras.includes(value)}
                    onChange={() => toggleExtra(value)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {quote ? (
            <div className="quote-result">
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
