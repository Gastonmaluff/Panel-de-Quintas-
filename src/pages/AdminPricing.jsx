import { pricingRules } from "../data/venues.js";
import { extraLabels, eventTypeLabels, formatGuaranies } from "../utils/pricing.js";

export default function AdminPricing() {
  return (
    <section className="admin-section">
      <div className="admin-section-heading">
        <h2>Panel de precios</h2>
        <button type="button">Guardar reglas</button>
      </div>

      <div className="pricing-admin-grid">
        <article className="admin-table-card">
          <h3>Bases</h3>
          <p>Día de semana: {formatGuaranies(pricingRules.weekdayBasePrice)}</p>
          <p>Sábado: {formatGuaranies(pricingRules.saturdayBasePrice)}</p>
          <p>Domingo: {formatGuaranies(pricingRules.sundayBasePrice)}</p>
          <p>Feriado: {formatGuaranies(pricingRules.holidayBasePrice)}</p>
        </article>

        <article className="admin-table-card">
          <h3>Tipo de evento</h3>
          {Object.entries(pricingRules.eventTypeRules).map(([key, value]) => (
            <p key={key}>
              {eventTypeLabels[key]}: {formatGuaranies(value)}
            </p>
          ))}
        </article>

        <article className="admin-table-card">
          <h3>Extras</h3>
          {Object.entries(pricingRules.extrasRules).map(([key, value]) => (
            <p key={key}>
              {extraLabels[key]}: {formatGuaranies(value)}
            </p>
          ))}
        </article>

        <article className="admin-table-card">
          <h3>Seña</h3>
          <p>{pricingRules.depositValue}% del total estimado</p>
        </article>
      </div>
    </section>
  );
}
