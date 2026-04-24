import { useEffect, useState } from "react";
import g from "../styles/shared.module.css";

function AddTransactionModal({ isOpen, onClose, onSave, existing }) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setDescription(existing?.description ?? "");
      setAmount(existing ? String(existing.amount) : "");
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
    });
    onClose();
  }

  return (
    <div
      className={g.overlay}
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div
        className={g.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="transaction-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
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

          {error && <p className={g.error}>{error}</p>}

          <div className={g.actions}>
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit">{existing ? "Update" : "Add"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddTransactionModal;
