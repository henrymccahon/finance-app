import { useEffect, useState } from "react";
import s from "../styles/ProcessReconciliationModal.module.css";
import g from "../styles/shared.module.css";

function ProcessReconciliationModal({
  isOpen,
  onClose,
  onProcess,
  people,
  buckets,
  summaryByPerson,
}) {
  // allocations[personName] = [{ bucketId, amount }, ...]
  const [allocations, setAllocations] = useState({});
  const [confirmProcess, setConfirmProcess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const init = {};
      for (const [person] of summaryByPerson) {
        init[person] = [{ bucketId: buckets[0]?.id ?? "", amount: "" }];
      }
      setAllocations(init);
      setConfirmProcess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  function updateRow(person, index, field, value) {
    setAllocations((prev) => {
      const rows = [...prev[person]];
      rows[index] = { ...rows[index], [field]: value };
      return { ...prev, [person]: rows };
    });
  }

  function addRow(person) {
    setAllocations((prev) => ({
      ...prev,
      [person]: [
        ...prev[person],
        { bucketId: buckets[0]?.id ?? "", amount: "" },
      ],
    }));
  }

  function removeRow(person, index) {
    setAllocations((prev) => ({
      ...prev,
      [person]: prev[person].filter((_, i) => i !== index),
    }));
  }

  function getAllocatedTotal(person) {
    return (allocations[person] || []).reduce(
      (s, r) => s + (parseFloat(r.amount) || 0),
      0,
    );
  }

  function canProcess() {
    for (const [person, data] of summaryByPerson) {
      if (data.total <= 0) continue;
      const allocated = getAllocatedTotal(person);
      if (Math.abs(allocated - data.total) > 0.01) return false;
      for (const row of allocations[person] || []) {
        const amt = parseFloat(row.amount);
        if (!row.bucketId || isNaN(amt) || amt <= 0) return false;
        const bucket = buckets.find((b) => b.id === row.bucketId);
        if (!bucket || bucket.amount < amt) return false;
      }
    }
    return true;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!canProcess()) return;
    // Build withdrawal instructions: [{ person, bucketId, amount }]
    const withdrawals = [];
    for (const [person] of summaryByPerson) {
      for (const row of allocations[person] || []) {
        const amt = parseFloat(row.amount);
        if (amt > 0) {
          withdrawals.push({ person, bucketId: row.bucketId, amount: amt });
        }
      }
    }
    onProcess(withdrawals);
    onClose();
  }

  return (
    <div className={g.overlay} onClick={onClose} onKeyDown={(e) => e.key === "Escape" && onClose()}>
      <div className={g.modalWide} role="dialog" aria-modal="true" aria-labelledby="reconciliation-modal-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="reconciliation-modal-title" style={{ margin: "0 0 1rem" }}>Process Reconciliation</h2>
        <p className={g.hint} style={{ margin: "0 0 1rem" }}>
          Choose which savings bucket(s) each person should pay from.
        </p>
        <form onSubmit={handleSubmit}>
          {summaryByPerson.map(([person, data]) => {
            if (data.total <= 0) return null;
            const allocated = getAllocatedTotal(person);
            const remaining = data.total - allocated;
            return (
              <div key={person} className={s.personBlock}>
                <div className={s.personHeader}>
                  <span>{person}</span>
                  <span>Owes ${data.total.toFixed(2)}</span>
                </div>

                {(allocations[person] || []).map((row, i) => {
                  const bucket = buckets.find((b) => b.id === row.bucketId);
                  return (
                    <div key={i} className={s.allocRow}>
                      <select
                        className={s.selectFlex}
                        value={row.bucketId}
                        onChange={(e) =>
                          updateRow(person, i, "bucketId", e.target.value)
                        }
                      >
                        <option value="">Select bucket…</option>
                        {buckets.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name} (${b.amount.toFixed(2)})
                          </option>
                        ))}
                      </select>
                      <input
                        className={s.amtInput}
                        type="number"
                        min="0.01"
                        step="0.01"
                        max={bucket?.amount ?? 0}
                        placeholder="0.00"
                        value={row.amount}
                        onChange={(e) =>
                          updateRow(person, i, "amount", e.target.value)
                        }
                      />
                      {(allocations[person] || []).length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRow(person, i)}
                          className={s.removeBtn}
                          title="Remove"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  );
                })}

                <div className={s.allocFooter}>
                  <button
                    type="button"
                    onClick={() => addRow(person)}
                    className={s.addRowBtn}
                  >
                    + Add bucket
                  </button>
                  <span
                    style={{
                      fontSize: "0.85rem",
                      color: Math.abs(remaining) < 0.01 ? "#81c784" : "#e57373",
                    }}
                  >
                    {Math.abs(remaining) < 0.01
                      ? "✓ Fully allocated"
                      : `$${remaining.toFixed(2)} remaining`}
                  </span>
                </div>
              </div>
            );
          })}

          <div className={g.actions}>
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            {confirmProcess ? (
              <span className={g.confirmText}>
                Withdraw from savings?{" "}
                <button
                  type="submit"
                  className={g.runBtn}
                >
                  Yes, process
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmProcess(false)}
                  className={g.actionBtn}
                >
                  No
                </button>
              </span>
            ) : (
              <button
                type="button"
                disabled={!canProcess()}
                className={!canProcess() ? g.disabledBtn : undefined}
                onClick={() => setConfirmProcess(true)}
              >
                Process
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProcessReconciliationModal;
