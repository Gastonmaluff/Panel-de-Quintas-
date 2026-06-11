import { useMemo, useState } from "react";
import { useAdminData } from "../admin/AdminDataProvider.jsx";
import { formatGuaranies } from "../utils/pricing.js";

const categories = ["Limpieza", "Mantenimiento", "Jardinería", "Piscina", "Luz", "Agua", "Personal", "Compra de insumos", "Reparaciones", "Otros"];
const methods = ["Transferencia", "Efectivo", "Tarjeta", "Otro"];

function createExpenseDraft() {
  return {
    date: new Date().toISOString().slice(0, 10),
    category: "Limpieza",
    description: "",
    amount: 0,
    method: "Transferencia",
    receiptName: "",
    receiptPreview: "",
    notes: "",
  };
}

export default function AdminExpenses() {
  const { expenses, addExpense } = useAdminData();
  const [draft, setDraft] = useState(null);
  const monthTotal = useMemo(
    () => expenses.reduce((total, expense) => total + Number(expense.amount || 0), 0),
    [expenses],
  );

  const handleReceipt = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setDraft((current) => ({
      ...current,
      receiptName: file.name,
      receiptPreview: file.type.startsWith("image/") ? URL.createObjectURL(file) : "",
    }));
  };

  const saveExpense = () => {
    if (!draft?.description || !draft.amount) return;
    addExpense(draft);
    setDraft(null);
  };

  return (
    <section className="admin-section">
      <div className="admin-section-heading">
        <div>
          <h2>Gastos</h2>
          <p>Registro de egresos operativos con comprobantes.</p>
        </div>
        <button type="button" onClick={() => setDraft(createExpenseDraft())}>Agregar gasto</button>
      </div>

      <div className="admin-grid">
        <article className="admin-card admin-card--compact-value">
          <span>Gastos cargados</span>
          <strong>{expenses.length}</strong>
        </article>
        <article className="admin-card admin-card--compact-value">
          <span>Total de gastos</span>
          <strong>{formatGuaranies(monthTotal)}</strong>
        </article>
      </div>

      <div className="admin-reservations-table-wrap">
        <table className="admin-reservations-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Categoría</th>
              <th>Descripción</th>
              <th>Método</th>
              <th className="money-column">Monto</th>
              <th>Comprobante</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((expense) => (
              <tr key={expense.id}>
                <td>{expense.date}</td>
                <td>{expense.category}</td>
                <td>{expense.description}</td>
                <td>{expense.method}</td>
                <td className="money-column">{formatGuaranies(expense.amount)}</td>
                <td>{expense.receiptName || "Sin comprobante"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {draft ? (
        <div className="admin-modal-backdrop" role="presentation">
          <div className="admin-modal" role="dialog" aria-modal="true">
            <div className="admin-modal__header">
              <div>
                <p className="eyebrow">Gasto</p>
                <h3>Agregar gasto</h3>
              </div>
              <button type="button" onClick={() => setDraft(null)}>Cerrar</button>
            </div>
            <div className="reservation-edit-form">
              <label>Fecha<input type="date" value={draft.date} onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))} /></label>
              <label>Categoría<select value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
              <label>Descripción<input value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} /></label>
              <label>Monto<input type="number" value={draft.amount} onChange={(event) => setDraft((current) => ({ ...current, amount: Number(event.target.value) }))} /></label>
              <label>Método<select value={draft.method} onChange={(event) => setDraft((current) => ({ ...current, method: event.target.value }))}>{methods.map((method) => <option key={method} value={method}>{method}</option>)}</select></label>
              <label className="reservation-edit-form__notes">Notas<textarea value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} /></label>
              <label className="admin-upload-button">Subir comprobante<input type="file" accept="image/*,.pdf" onChange={handleReceipt} /></label>
              {draft.receiptName ? <p className="admin-empty-note">{draft.receiptName}</p> : null}
            </div>
            <div className="admin-modal__actions">
              <button type="button" onClick={saveExpense}>Guardar gasto</button>
              <button type="button" onClick={() => setDraft(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
