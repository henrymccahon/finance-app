import { useState } from "react";
import g from "../styles/shared.module.css";

function TransferModal({
  isOpen,
  onClose,
  fromBucket,
  otherBuckets,
  onTransfer,
}) {
  const [toId, setToId] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");

  if (!isOpen || !fromBucket) return null;

  function handleSubmit(e) {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (!toId) {
      setError("Select a destination bucket.");
      return;
    }
    if (!parsed || parsed <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    if (parsed > fromBucket.amount) {
      setError(`Insufficient balance. Max: $${fromBucket.amount.toFixed(2)}`);
      return;
    }
    setError("");
    onTransfer(toId, parsed);
    setToId("");
    setAmount("");
  }

  return (
    <div className={g.overlay} onClick={onClose} onKeyDown={(e) => e.key === "Escape" && onClose()}>
      <div className={g.modal} role="dialog" aria-modal="true" aria-labelledby="transfer-modal-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="transfer-modal-title">Transfer from {fromBucket.name}</h2>
        <p className={g.hint}>Available: ${fromBucket.amount.toFixed(2)}</p>

        <form onSubmit={handleSubmit}>
          <label className={g.label}>
            To bucket
            <select
              value={toId}
              onChange={(e) => setToId(e.target.value)}
              required
              className={g.inputBlock}
            >
              <option value="">Select a bucket…</option>
              {otherBuckets.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} (${b.amount.toFixed(2)})
                </option>
              ))}
            </select>
          </label>

          <label className={g.label}>
            Amount
            <input
              type="number"
              min="0.01"
              step="0.01"
              max={fromBucket.amount}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
              className={g.inputBlock}
            />
          </label>

          {error && <p className={g.error}>{error}</p>}

          <div className={g.actions}>
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit">Transfer</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TransferModal;
