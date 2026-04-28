import { useState } from "react";
import { pricingRules } from "../data/venues.js";
import { eventTypeLabels, formatGuaranies } from "../utils/pricing.js";
import { optionalExtrasMock } from "../data/adminData.js";

export default function AdminPricing() {
  const [rules, setRules] = useState(pricingRules);
  const [extras, setExtras] = useState(optionalExtrasMock);

  const updateRule = (key, value) => {
    setRules((current) => ({ ...current, [key]: Number(value) }));
  };

  const updateEventRule = (key, value) => {
    setRules((current) => ({
      ...current,
      eventTypeRules: {
        ...current.eventTypeRules,
        [key]: Number(value),
      },
    }));
  };

  const updateGuestRule = (index, key, value) => {
    setRules((current) => ({
      ...current,
      guestCountRules: current.guestCountRules.map((rule, ruleIndex) =>
        ruleIndex === index ? { ...rule, [key]: Number(value) } : rule,
      ),
    }));
  };

  const addExtra = () => {
    setExtras((current) => [
      ...current,
      {
        id: `extra-${Date.now()}`,
        name: "Nuevo extra",
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

  return (
    <section className="admin-section">
      <div className="admin-section-heading">
        <div>
          <h2>Precios y cotizador</h2>
          <p>Reglas mockeadas listas para persistir en Firestore.</p>
        </div>
        <button type="button">Guardar reglas</button>
      </div>

      <div className="pricing-admin-grid pricing-admin-grid--forms">
        <article className="admin-table-card">
          <h3>Bases por día</h3>
          <label>
            Lunes a jueves
            <input
              type="number"
              value={rules.weekdayBasePrice}
              onChange={(event) => updateRule("weekdayBasePrice", event.target.value)}
            />
          </label>
          <label>
            Viernes
            <input
              type="number"
              value={rules.fridayBasePrice}
              onChange={(event) => updateRule("fridayBasePrice", event.target.value)}
            />
          </label>
          <label>
            Sábado
            <input
              type="number"
              value={rules.saturdayBasePrice}
              onChange={(event) => updateRule("saturdayBasePrice", event.target.value)}
            />
          </label>
          <label>
            Domingo
            <input
              type="number"
              value={rules.sundayBasePrice}
              onChange={(event) => updateRule("sundayBasePrice", event.target.value)}
            />
          </label>
          <label>
            Feriado
            <input
              type="number"
              value={rules.holidayBasePrice}
              onChange={(event) => updateRule("holidayBasePrice", event.target.value)}
            />
          </label>
        </article>

        <article className="admin-table-card">
          <h3>Tipo de evento</h3>
          {Object.entries(rules.eventTypeRules).map(([key, value]) => (
            <label key={key}>
              {eventTypeLabels[key]}
              <input
                type="number"
                value={value}
                onChange={(event) => updateEventRule(key, event.target.value)}
              />
            </label>
          ))}
        </article>

        <article className="admin-table-card">
          <h3>Personas</h3>
          {rules.guestCountRules.map((rule, index) => (
            <div className="pricing-rule-row" key={rule.min}>
              <label>
                Desde
                <input
                  type="number"
                  value={rule.min}
                  onChange={(event) => updateGuestRule(index, "min", event.target.value)}
                />
              </label>
              <label>
                Recargo
                <input
                  type="number"
                  value={rule.amount}
                  onChange={(event) => updateGuestRule(index, "amount", event.target.value)}
                />
              </label>
            </div>
          ))}
        </article>

        <article className="admin-table-card">
          <h3>Seña y moneda</h3>
          <label>
            Porcentaje de seña
            <input
              type="number"
              value={rules.depositValue}
              onChange={(event) => updateRule("depositValue", event.target.value)}
            />
          </label>
          <label>
            Monto mínimo de seña
            <input
              type="number"
              value={rules.minimumDepositAmount}
              onChange={(event) => updateRule("minimumDepositAmount", event.target.value)}
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
      </div>

      <article className="admin-table-card">
        <div className="admin-section-heading">
          <div>
            <h2>Extras flexibles</h2>
            <p>
              No se muestran en la landing pública hasta que se creen y se activen.
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
                <input
                  value={extra.name}
                  onChange={(event) => updateExtra(extra.id, "name", event.target.value)}
                />
                <input
                  type="number"
                  value={extra.price}
                  onChange={(event) =>
                    updateExtra(extra.id, "price", Number(event.target.value))
                  }
                />
                <input
                  value={extra.description}
                  onChange={(event) =>
                    updateExtra(extra.id, "description", event.target.value)
                  }
                />
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
              </div>
            ))}
          </div>
        ) : (
          <p className="admin-muted-note">
            Todavía no hay extras cargados. El cotizador público no ofrece extras
            predefinidos.
          </p>
        )}
      </article>
    </section>
  );
}
