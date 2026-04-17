import { useEffect, useState } from "react";
import s from "../styles/AddExpenseModal.module.css";
import g from "../styles/shared.module.css";

const FREQUENCIES = [
  { value: "weekly", label: "Weekly" },
  { value: "fortnightly", label: "Fortnightly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];

function AddExpenseModal({
  isOpen,
  onClose,
  onSave,
  categories,
  onAddCategory,
  existing,
  people,
}) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [frequency, setFrequency] = useState("monthly");
  const [assignedTo, setAssignedTo] = useState("Shared");
  const [splitPercent, setSplitPercent] = useState(50);
  const [newCategory, setNewCategory] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setTitle(existing?.title ?? "");
      setAmount(existing ? String(existing.amount) : "");
      setCategory(existing?.category ?? categories[0] ?? "");
      setFrequency(existing?.frequency ?? "monthly");
      setAssignedTo(existing?.assignedTo ?? "Shared");
      setSplitPercent(existing?.splitPercent ?? 50);
      setNewCategory("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  function handleAddCategory(e) {
    e.preventDefault();
    if (newCategory.trim()) {
      onAddCategory(newCategory.trim());
      setCategory(newCategory.trim());
      setNewCategory("");
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!parsed || parsed <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    if (!category) {
      setError("Select a category.");
      return;
    }
    setError("");

    onSave({
      ...(existing && { id: existing.id }),
      title: title.trim(),
      amount: parsed,
      category,
      frequency,
      assignedTo,
      splitPercent: assignedTo === "Shared" ? splitPercent : 100,
    });

    onClose();
  }

  return (
    <div className={g.overlay} onClick={onClose} onKeyDown={(e) => e.key === "Escape" && onClose()}>
      <div className={g.modal} role="dialog" aria-modal="true" aria-labelledby="expense-modal-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="expense-modal-title">{existing ? "Edit" : "Add"} Recurring Expense</h2>

        <form onSubmit={handleSubmit}>
          <label className={g.label}>
            Title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Netflix, Rent, Bus pass"
              required
              maxLength={100}
              className={g.inputBlock}
            />
          </label>

          <label className={g.label}>
            Amount
            <input
              type="number"
              min="0.01"
              step="0.01"
              max="999999"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
              className={g.inputBlock}
            />
          </label>

          <label className={g.label}>
            Frequency
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className={g.inputBlock}
            >
              {FREQUENCIES.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>

          <label className={g.label}>
            Assigned to
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className={g.inputBlock}
            >
              <option value="Shared">Shared</option>
              {people.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>

          {assignedTo === "Shared" && (
            <div className={g.splitBox}>
              <label className={g.label}>
                Split: {people[0]} pays {splitPercent}% · {people[1]} pays{" "}
                {100 - splitPercent}%
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={splitPercent}
                  onChange={(e) => setSplitPercent(Number(e.target.value))}
                  className={g.rangeInput}
                />
              </label>
              <div className={g.splitPreview}>
                <span>
                  {people[0]}: $
                  {((parseFloat(amount) || 0) * splitPercent / 100).toFixed(2)}
                </span>
                <span>
                  {people[1]}: $
                  {((parseFloat(amount) || 0) * (100 - splitPercent) / 100).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <label className={g.label}>
            Category
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={g.inputBlock}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <div className={s.addCatRow}>
            <input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="New category name"
              maxLength={50}
              className={g.inputBlock}
              style={{ flex: 1 }}
            />
            <button type="button" onClick={handleAddCategory}>
              + Add
            </button>
          </div>

          {error && <p className={g.error}>{error}</p>}

          <div className={g.actions}>
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit">{existing ? "Save" : "Add"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddExpenseModal;
