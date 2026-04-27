import { useMemo, useState } from "react";
import { buildWhatsappUrl } from "../../utils/whatsapp.js";
import {
  calculateQuote,
  eventTypeLabels,
  extraLabels,
  formatGuaranies,
  timeSlotLabels,
} from "../../utils/pricing.js";

const initialQuoteValues = {
  date: "2026-05-18",
  eventType: "cumpleanos",
  guestCount: 45,
  timeSlot: "dia_completo",
  extras: ["limpieza", "mesas_sillas"],
};

export default function QuoteCalculator({ venue, rules }) {
  const [values, setValues] = useState(initialQuoteValues);
  const quote = useMemo(() => calculateQuote(values, rules), [rules, values]);
  const whatsappUrl = buildWhatsappUrl({ venue, quoteValues: values, quote });

  const updateValue = (key, value) => {
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
            Las reglas iniciales viven en datos locales y quedan listas para
            reemplazarse por `pricingRules` desde Firestore.
          </p>
        </div>

        <div className="quote-panel">
          <div className="form-grid">
            <label>
              <span>Fecha</span>
              <input
                type="date"
                value={values.date}
                onChange={(event) => updateValue("date", event.target.value)}
              />
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

          <a className="primary-button primary-button--wide" href={whatsappUrl} target="_blank" rel="noreferrer">
            Consultar con este presupuesto
          </a>
        </div>
      </div>
    </section>
  );
}
