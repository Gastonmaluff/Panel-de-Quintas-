import { useState } from "react";
import { optionalExtrasMock } from "../data/adminData.js";
import { pricingRules } from "../data/venues.js";
import { eventTypeLabels, formatGuaranies } from "../utils/pricing.js";

const numberFormatter = new Intl.NumberFormat("es-PY", {
  maximumFractionDigits: 0,
});

function formatAdminNumber(value) {
  return numberFormatter.format(Number(value || 0));
}

function parseAdminNumber(value) {
  return Number(String(value).replace(/\D/g, "")) || 0;
}

function MoneyInput({ value, onChange, ariaLabel }) {
  return (
    <input
      aria-label={ariaLabel}
      inputMode="numeric"
      value={formatAdminNumber(value)}
      onChange={(event) => onChange(parseAdminNumber(event.target.value))}
    />
  );
}

function buildInitialEventTypes() {
  return Object.entries(pricingRules.eventTypeRules).map(([id, amount]) => ({
    id,
    name: eventTypeLabels[id] || id,
    amount,
  }));
}

export default function AdminPricing() {
  const [rules, setRules] = useState(pricingRules);
  const [eventTypes, setEventTypes] = useState(buildInitialEventTypes);
  const [extras, setExtras] = useState(optionalExtrasMock);
  const sortedGuestRules = rules.guestCountRules
    .map((rule, index) => ({ ...rule, index }))
    .sort((a, b) => a.min - b.min);

  const updateRule = (key, value) => {
    setRules((current) => ({ ...current, [key]: value }));
  };

  const updateGuestRule = (index, key, value) => {
    setRules((current) => ({
      ...current,
      guestCountRules: current.guestCountRules.map((rule, ruleIndex) =>
        ruleIndex === index ? { ...rule, [key]: value } : rule,
      ),
    }));
  };

  const addGuestRule = () => {
    setRules((current) => ({
      ...current,
      guestCountRules: [...current.guestCountRules, { min: 12, amount: 0 }],
    }));
  };

  const removeGuestRule = (index) => {
    setRules((current) => ({
      ...current,
      guestCountRules: current.guestCountRules.filter((_, ruleIndex) => ruleIndex !== index),
    }));
  };

  const addEventType = () => {
    setEventTypes((current) => [
      ...current,
      { id: `event-${Date.now()}`, name: "Nuevo tipo de evento", amount: 0 },
    ]);
  };

  const updateEventType = (id, key, value) => {
    setEventTypes((current) =>
      current.map((eventType) =>
        eventType.id === id ? { ...eventType, [key]: value } : eventType,
      ),
    );
  };

  const removeEventType = (id) => {
    setEventTypes((current) => current.filter((eventType) => eventType.id !== id));
  };

  const addExtra = () => {
    setExtras((current) => [
      ...current,
      {
        id: `extra-${Date.now()}`,
        name: "Nuevo adicional",
        price: 0,
        description: "",
        active: false,
      },
    ]);
  };

  const updateExtra = (id, key, value) => {
    setExtras((current) =>
      current.map((extra) => (extra.id === id ? { ...extra, [key]: value } : extra)),
    );
  };

  const removeExtra = (id) => {
    setExtras((current) => current.filter((extra) => extra.id !== id));
  };

  return (
    <section className="admin-section">
      <div className="admin-section-heading">
        <div>
          <h2>Precios y cotizador</h2>
          <p>Definí las tarifas que se usan para estimar una reserva.</p>
        </div>
        <button type="button">Guardar cambios</button>
      </div>

      <article className="admin-pricing-explain">
        <strong>Cómo se calcula el precio</strong>
        <span>
          Tarifa base del día + adicional por tipo de evento + recargo por cantidad de personas
          + extras activos, si decidís ofrecerlos.
        </span>
      </article>

      <div className="pricing-admin-grid pricing-admin-grid--forms">
        <article className="admin-table-card">
          <h3>Tarifa base por día</h3>
          <label>
            Lunes a jueves
            <MoneyInput value={rules.weekdayBasePrice} onChange={(value) => updateRule("weekdayBasePrice", value)} ariaLabel="Precio de lunes a jueves" />
          </label>
          <label>
            Viernes
            <MoneyInput value={rules.fridayBasePrice} onChange={(value) => updateRule("fridayBasePrice", value)} ariaLabel="Precio de viernes" />
          </label>
          <label>
            Sábado
            <MoneyInput value={rules.saturdayBasePrice} onChange={(value) => updateRule("saturdayBasePrice", value)} ariaLabel="Precio de sábado" />
          </label>
          <label>
            Domingo
            <MoneyInput value={rules.sundayBasePrice} onChange={(value) => updateRule("sundayBasePrice", value)} ariaLabel="Precio de domingo" />
          </label>
          <label>
            Feriado
            <MoneyInput value={rules.holidayBasePrice} onChange={(value) => updateRule("holidayBasePrice", value)} ariaLabel="Precio de feriado" />
          </label>
        </article>

        <article className="admin-table-card admin-table-card--wide">
          <div className="admin-section-heading">
            <div>
              <h3>Tipos de evento</h3>
              <p>Este valor se suma a la tarifa base cuando el visitante elige ese evento.</p>
            </div>
            <button type="button" onClick={addEventType}>
              Agregar tipo
            </button>
          </div>
          <div className="admin-event-type-list">
            {eventTypes.map((eventType) => (
              <div key={eventType.id}>
                <label>
                  Nombre
                  <input
                    value={eventType.name}
                    onChange={(event) => updateEventType(eventType.id, "name", event.target.value)}
                  />
                </label>
                <label>
                  Se suma al precio base
                  <MoneyInput
                    value={eventType.amount}
                    onChange={(value) => updateEventType(eventType.id, "amount", value)}
                    ariaLabel={`Adicional para ${eventType.name}`}
                  />
                </label>
                <button type="button" className="admin-danger-button" onClick={() => removeEventType(eventType.id)}>
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        </article>

        <article className="admin-table-card admin-guest-rules-card">
          <div className="admin-section-heading admin-section-heading--compact">
            <div>
              <h3>Cantidad de personas</h3>
              <p>Agregá recargos cuando el evento supere cierta cantidad de invitados.</p>
            </div>
            <button type="button" onClick={addGuestRule}>
              Agregar recargo
            </button>
          </div>
          <div className="pricing-guest-rules">
            <div className="pricing-rule-row pricing-rule-row--header" aria-hidden="true">
              <span>Desde cuántas personas</span>
              <span>Se suma al precio base</span>
              <span>Acción</span>
            </div>
            {sortedGuestRules.map((rule) => (
              <div className="pricing-rule-row" key={`${rule.min}-${rule.index}`}>
                <label>
                  <span>Desde cuántas personas</span>
                  <input
                    inputMode="numeric"
                    value={formatAdminNumber(rule.min)}
                    onChange={(event) => updateGuestRule(rule.index, "min", parseAdminNumber(event.target.value))}
                  />
                </label>
                <label>
                  <span>Se suma al precio base</span>
                  <MoneyInput
                    value={rule.amount}
                    onChange={(value) => updateGuestRule(rule.index, "amount", value)}
                    ariaLabel="Recargo por cantidad de personas"
                  />
                </label>
                <button type="button" className="admin-danger-button" onClick={() => removeGuestRule(rule.index)}>
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        </article>

        <article className="admin-table-card">
          <h3>Seña y moneda</h3>
          <label>
            Porcentaje de seña
            <input
              inputMode="numeric"
              value={rules.depositValue}
              onChange={(event) => updateRule("depositValue", Number(event.target.value) || 0)}
            />
          </label>
          <label>
            Monto mínimo de seña
            <MoneyInput
              value={rules.minimumDepositAmount}
              onChange={(value) => updateRule("minimumDepositAmount", value)}
              ariaLabel="Monto mínimo de seña"
            />
          </label>
          <label>
            Moneda
            <input
              value={rules.currency}
              onChange={(event) =>
                setRules((current) => ({ ...current, currency: event.target.value }))
              }
            />
          </label>
          <p>Vista previa: {formatGuaranies(rules.weekdayBasePrice)}</p>
        </article>
        <article className="admin-table-card admin-extras-card">
        <div className="admin-section-heading">
          <div>
            <h2>Extras opcionales</h2>
            <p>
              Desde acá podés crear servicios o adicionales para sumar al presupuesto.
              Si no querés ofrecer extras, dejá esta sección vacía.
            </p>
          </div>
          <button type="button" onClick={addExtra}>
            Agregar extra
          </button>
        </div>

        {extras.length ? (
          <div className="admin-extra-list">
            {extras.map((extra) => (
              <div key={extra.id}>
                <label>
                  Nombre
                  <input
                    value={extra.name}
                    onChange={(event) => updateExtra(extra.id, "name", event.target.value)}
                  />
                </label>
                <label>
                  Precio
                  <MoneyInput
                    value={extra.price}
                    onChange={(value) => updateExtra(extra.id, "price", value)}
                    ariaLabel={`Precio de ${extra.name}`}
                  />
                </label>
                <label>
                  Descripción
                  <input
                    value={extra.description}
                    onChange={(event) =>
                      updateExtra(extra.id, "description", event.target.value)
                    }
                  />
                </label>
                <label className="admin-toggle">
                  <input
                    type="checkbox"
                    checked={extra.active}
                    onChange={(event) =>
                      updateExtra(extra.id, "active", event.target.checked)
                    }
                  />
                  <span>Activo</span>
                </label>
                <button type="button" className="admin-danger-button" onClick={() => removeExtra(extra.id)}>
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="admin-muted-note">
            No hay extras creados. El presupuesto se calcula solo con fecha, tipo de evento,
            cantidad de personas y horario.
          </p>
        )}
        </article>
      </div>
    </section>
  );
}
