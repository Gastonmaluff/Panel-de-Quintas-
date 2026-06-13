import { PERIOD_FILTERS } from "../../utils/periodFilters.js";

export default function PeriodFilter({
  value,
  onChange,
  customStartDate,
  customEndDate,
  onCustomStartDateChange,
  onCustomEndDateChange,
  range,
}) {
  return (
    <div className="admin-period-filter" aria-label="Filtro de período">
      <div className="admin-period-filter__buttons" role="group" aria-label="Seleccionar período">
        {PERIOD_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            className={value === filter.value ? "is-active" : ""}
            onClick={() => onChange(filter.value)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {value === "custom" ? (
        <div className="admin-period-filter__custom">
          <label>
            Fecha desde
            <input
              type="date"
              value={customStartDate}
              onChange={(event) => onCustomStartDateChange(event.target.value)}
            />
          </label>
          <label>
            Fecha hasta
            <input
              type="date"
              value={customEndDate}
              min={customStartDate || undefined}
              onChange={(event) => onCustomEndDateChange(event.target.value)}
            />
          </label>
        </div>
      ) : null}

      {range?.error ? <p className="admin-form-warning">{range.error}</p> : null}
    </div>
  );
}
