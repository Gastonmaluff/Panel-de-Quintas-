import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Eye, ReceiptText, X } from "lucide-react";
import { useAdminData } from "../admin/AdminDataProvider.jsx";
import { formatGuaranies } from "../utils/pricing.js";
import { formatAmountInput, parseAmountInput } from "../utils/formatters.js";

const categories = ["Limpieza", "Mantenimiento", "Jardinería", "Piscina", "Luz", "Agua", "Personal", "Compra de insumos", "Reparaciones", "Otros"];
const methods = ["Transferencia", "Efectivo", "Tarjeta", "Otro"];

function createExpenseDraft() {
  return {
    date: new Date().toISOString().slice(0, 10),
    category: "Limpieza",
    description: "",
    amount: "",
    method: "Transferencia",
    receiptName: "",
    receiptPreview: "",
    notes: "",
  };
}

function ModalPortal({ children }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

function ExpenseReceiptAction({ expense }) {
  if (!expense.receiptUrl) {
    return <span className="admin-empty-note">Sin comprobante</span>;
  }

  return (
    <a
      className="admin-receipt-link"
      href={expense.receiptUrl}
      target="_blank"
      rel="noreferrer"
      title={expense.receiptName ? `Abrir ${expense.receiptName}` : "Ver comprobante"}
    >
      <Eye size={15} strokeWidth={1.9} aria-hidden="true" />
      Ver comprobante
    </a>
  );
}

export default function AdminExpenses() {
  const { expenses, addExpense } = useAdminData();
  const [draft, setDraft] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const monthTotal = useMemo(
    () => expenses.reduce((total, expense) => total + Number(expense.amount || 0), 0),
    [expenses],
  );

  useEffect(() => {
    if (!draft || typeof document === "undefined") return undefined;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [draft]);

  const handleReceipt = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setDraft((current) => ({
      ...current,
      receiptName: file.name,
      receiptPreview: file.type.startsWith("image/") ? URL.createObjectURL(file) : "",
      receiptFile: file,
    }));
  };

  const saveExpense = async () => {
    if (!draft?.description || !draft.amount || isSaving) return;
    setIsSaving(true);
    try {
      await addExpense({ ...draft, amount: Number(draft.amount || 0) });
      setDraft(null);
    } finally {
      setIsSaving(false);
    }
  };

  const closeDraft = () => setDraft(null);

  return (
    <section className="admin-section">
      <div className="admin-section-heading">
        <div>
          <h2>Gastos</h2>
          <p>Registro de gastos operativos con comprobantes.</p>
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

      <div className="admin-expense-card-list">
        {expenses.map((expense) => (
          <article className="admin-expense-card" key={expense.id}>
            <header>
              <strong>{expense.category}</strong>
              <span>{formatGuaranies(expense.amount)}</span>
            </header>
            <p>{expense.description}</p>
            <dl>
              <div><dt>Fecha</dt><dd>{expense.date}</dd></div>
              <div><dt>Método</dt><dd>{expense.method}</dd></div>
              <div><dt>Comprobante</dt><dd><ExpenseReceiptAction expense={expense} /></dd></div>
            </dl>
          </article>
        ))}
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
                <td><ExpenseReceiptAction expense={expense} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {draft ? (
        <ModalPortal>
          <div className="admin-modal-backdrop admin-modal-backdrop--sheet" role="presentation">
            <div className="admin-modal admin-modal--sheet admin-modal--expense" role="dialog" aria-modal="true" aria-labelledby="expense-modal-title">
              <div className="admin-modal__header admin-modal__header--premium">
                <div className="admin-modal-title">
                  <i aria-hidden="true"><ReceiptText size={20} strokeWidth={1.8} /></i>
                  <div>
                    <h3 id="expense-modal-title">Agregar gasto</h3>
                    <small>Registrar gasto operativo con comprobante.</small>
                  </div>
                </div>
                <button type="button" className="admin-modal-close" onClick={closeDraft} aria-label="Cerrar">
                  <X size={18} strokeWidth={1.8} aria-hidden="true" />
                </button>
              </div>

              <div className="admin-modal__body admin-modal__body--sheet">
                <div className="reservation-edit-form">
                  <label>Fecha<input type="date" value={draft.date} onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))} /></label>
                  <label>Categoría<select value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
                  <label>Descripción<input value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} /></label>
                  <label>Monto<input inputMode="numeric" value={formatAmountInput(draft.amount)} onFocus={() => Number(draft.amount || 0) === 0 && setDraft((current) => ({ ...current, amount: "" }))} onChange={(event) => setDraft((current) => ({ ...current, amount: parseAmountInput(event.target.value) || "" }))} /></label>
                  <label>Método<select value={draft.method} onChange={(event) => setDraft((current) => ({ ...current, method: event.target.value }))}>{methods.map((method) => <option key={method} value={method}>{method}</option>)}</select></label>
                  <label className="reservation-edit-form__notes">Notas<textarea value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} /></label>
                  <label className="admin-upload-button">Subir comprobante<input type="file" accept="image/*,.pdf" onChange={handleReceipt} /></label>
                  {draft.receiptName ? <p className="admin-empty-note">{draft.receiptName}</p> : null}
                </div>
              </div>

              <div className="admin-modal__actions admin-modal__actions--sheet">
                <button type="button" className="admin-secondary-button" onClick={closeDraft}>Cancelar</button>
                <button type="button" className="admin-primary-button" onClick={saveExpense} disabled={isSaving}>{isSaving ? "Guardando..." : "Guardar gasto"}</button>
              </div>
            </div>
          </div>
        </ModalPortal>
      ) : null}
    </section>
  );
}
