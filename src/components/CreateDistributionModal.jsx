import { useEffect, useState } from "react";
import s from "../styles/CreateDistributionModal.module.css";
import g from "../styles/shared.module.css";

function CreateDistributionModal({
  isOpen,
  onClose,
  onCreate,
  buckets,
  existing,
}) {
  const [name, setName] = useState("");
  const [allocations, setAllocations] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setName(existing?.name ?? "");
      setAllocations(
        buckets.map((b) => {
          const prev = existing?.allocations?.find((a) => a.bucketId === b.id);
          return { bucketId: b.id, amount: prev ? String(prev.amount) : "" };
        }),
      );
    }
  }, [isOpen]);

  if (!isOpen) return null;

  function handleAmountChange(bucketId, value) {
    setAllocations((prev) =>
      prev.map((a) => (a.bucketId === bucketId ? { ...a, amount: value } : a)),
    );
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;

    const parsed = allocations
      .map((a) => ({ bucketId: a.bucketId, amount: parseFloat(a.amount) || 0 }))
      .filter((a) => a.amount > 0);

    if (parsed.length === 0) return;

    onCreate({
      id: existing?.id ?? crypto.randomUUID(),
      name: name.trim(),
      allocations: parsed,
    });

    onClose();
  }

  const total = allocations.reduce(
    (sum, a) => sum + (parseFloat(a.amount) || 0),
    0,
  );

  return (
    <div
      className={g.overlay}
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div
        className={g.modalScrollable}
        role="dialog"
        aria-modal="true"
        aria-labelledby="distribution-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="distribution-modal-title">
          {existing ? "Edit" : "Create"} Savings Plan
        </h2>

        <form onSubmit={handleSubmit}>
          <label className={g.label}>
            Plan name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='e.g. "Paycheck split"'
              required
              maxLength={100}
              className={g.inputBlock}
            />
          </label>

          <p className={g.hint}>
            Set the amount for each account. Leave blank or 0 to skip.
          </p>

          <div className={s.allocationList}>
            {buckets.map((bucket) => {
              const alloc = allocations.find((a) => a.bucketId === bucket.id);
              return (
                <div key={bucket.id} className={s.allocationRow}>
                  <span className={s.bucketName}>{bucket.name}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    max="999999"
                    value={alloc?.amount ?? ""}
                    onChange={(e) =>
                      handleAmountChange(bucket.id, e.target.value)
                    }
                    placeholder="0.00"
                    className={s.amountInput}
                  />
                </div>
              );
            })}
          </div>

          <p className={s.total}>Total: ${total.toFixed(2)}</p>

          <div className={g.actions}>
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit">{existing ? "Save" : "Create"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateDistributionModal;
