import { useEffect, useState } from "react";
import g from "../styles/shared.module.css";

function AddTransactionModal({ isOpen, onClose, onSave, existing, people }) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState("Shared");
  const [splitPercent, setSplitPercent] = useState(50);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setDescription(existing?.description ?? "");
      setAmount(existing ? String(existing.amount) : "");
      setPaidBy(existing?.paidBy ?? "Shared");
      setSplitPercent(existing?.splitPercent ?? 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  function handleSubmit(e) {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (!description.trim()) {
      setError("Description is required.");
      return;
    }
    if (isNaN(parsed) || parsed <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    setError("");
    onSave({
      ...(existing || {}),
      description: description.trim(),
      amount: parsed,
      paidBy,
      splitPercent: paidBy === "Shared" ? splitPercent : null,
    });
    onClose();
  }

  return (
    <div className={g.overlay} onClick={onClose} onKeyDown={(e) => e.key === "Escape" && onClose()}>
      <div className={g.modal} role="dialog" aria-modal="true" aria-labelledby="transaction-modal-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="transaction-modal-title" style={{ margin: "0 0 1rem" }}>
          {existing ? "Edit" : "Add"} Transaction
        </h2>
        <form onSubmit={handleSubmit}>
          <label className={g.label}>
            Description
            <input
              className={g.inputBlock}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Groceries at Woolworths"
              maxLength={100}
              autoFocus
            />
          </label>

          <label className={g.label}>
            Amount ($)
            <input
              className={g.inputBlock}
              type="number"
              min="0.01"
              step="0.01"
              max="999999"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </label>

          <label className={g.label}>
            Responsible
            <select
              className={g.inputBlock}
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
            >
              <option value="Shared">Shared (split)</option>
              {people.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>

          {paidBy === "Shared" && (
            <div className={g.splitBox}>
              <div className={g.splitPreview}>
                <span>{people[0]}: {splitPercent}%</span>
                <span>{people[1]}: {100 - splitPercent}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={splitPercent}
                onChange={(e) => setSplitPercent(Number(e.target.value))}
                className={g.rangeInput}
              />
              {amount && !isNaN(parseFloat(amount)) && (
                <div className={g.splitPreview}>
                  <span>
                    ${((parseFloat(amount) * splitPercent) / 100).toFixed(2)}
                  </span>
                  <span>
                    ${(
                      (parseFloat(amount) * (100 - splitPercent)) /
                      100
                    ).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )}

          {error && <p className={g.error}>{error}</p>}

          <div className={g.actions}>
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit">
              {existing ? "Update" : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddTransactionModal;
