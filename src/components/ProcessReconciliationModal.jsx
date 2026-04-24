import { useEffect, useMemo, useState } from "react";
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
  // mode: "byItem" — assign each item to an account
  //        "byAmount" — allocate lump sums per account (legacy)
  const [mode, setMode] = useState("byItem");

  // byItem: itemAssignments[person][itemIndex] = bucketId
  const [itemAssignments, setItemAssignments] = useState({});

  // byAmount: allocations[person] = [{ bucketId, amount }]
  const [allocations, setAllocations] = useState({});

  const [confirmProcess, setConfirmProcess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const initItems = {};
      const initAlloc = {};
      const defaultBucket = buckets[0]?.id ?? "";
      for (const [person, data] of summaryByPerson) {
        initItems[person] = data.items.map(() => defaultBucket);
        initAlloc[person] = [{ bucketId: defaultBucket, amount: "" }];
      }
      setItemAssignments(initItems);
      setAllocations(initAlloc);
      setConfirmProcess(false);
      setMode("byItem");
    }
  }, [isOpen]);

  // Per-bucket running total for item mode (to show remaining balance)
  const bucketUsage = useMemo(() => {
    const usage = {};
    for (const b of buckets) usage[b.id] = 0;
    for (const [person, data] of summaryByPerson) {
      const assigns = itemAssignments[person] || [];
      for (let i = 0; i < data.items.length; i++) {
        const bId = assigns[i];
        if (bId && usage[bId] !== undefined) {
          usage[bId] += data.items[i].owed;
        }
      }
    }
    return usage;
  }, [itemAssignments, summaryByPerson, buckets]);

  if (!isOpen) return null;

  // ── By-item helpers ──

  function setItemBucket(person, itemIndex, bucketId) {
    setItemAssignments((prev) => {
      const arr = [...(prev[person] || [])];
      arr[itemIndex] = bucketId;
      return { ...prev, [person]: arr };
    });
  }

  function assignAllItems(person, bucketId) {
    setItemAssignments((prev) => {
      const data = summaryByPerson.find(([p]) => p === person)?.[1];
      if (!data) return prev;
      return { ...prev, [person]: data.items.map(() => bucketId) };
    });
  }

  // Build withdrawals from item assignments
  function getItemWithdrawals() {
    const map = {}; // key: `${person}|${bucketId}` → amount
    for (const [person, data] of summaryByPerson) {
      if (data.total <= 0) continue;
      const assigns = itemAssignments[person] || [];
      for (let i = 0; i < data.items.length; i++) {
        const bId = assigns[i];
        if (!bId) continue;
        const key = `${person}|${bId}`;
        map[key] = (map[key] || 0) + data.items[i].owed;
      }
    }
    return Object.entries(map).map(([key, amount]) => {
      const [person, bucketId] = key.split("|");
      return { person, bucketId, amount };
    });
  }

  function canProcessItems() {
    for (const [person, data] of summaryByPerson) {
      if (data.total <= 0) continue;
      const assigns = itemAssignments[person] || [];
      for (let i = 0; i < data.items.length; i++) {
        if (!assigns[i]) return false;
      }
    }
    // Check bucket balances
    const withdrawals = getItemWithdrawals();
    const bucketTotals = {};
    for (const w of withdrawals) {
      bucketTotals[w.bucketId] = (bucketTotals[w.bucketId] || 0) + w.amount;
    }
    for (const [bId, total] of Object.entries(bucketTotals)) {
      const bucket = buckets.find((b) => b.id === bId);
      if (!bucket || bucket.amount < total - 0.01) return false;
    }
    return true;
  }

  // ── By-amount helpers (existing) ──

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
      (sum, r) => sum + (parseFloat(r.amount) || 0),
      0,
    );
  }

  function fillRemaining(person, index) {
    const data = summaryByPerson.find(([p]) => p === person)?.[1];
    if (!data) return;
    const currentTotal = (allocations[person] || []).reduce(
      (sum, r, i) => sum + (i === index ? 0 : parseFloat(r.amount) || 0),
      0,
    );
    const remaining = data.total - currentTotal;
    if (remaining > 0) {
      updateRow(person, index, "amount", remaining.toFixed(2));
    }
  }

  function canProcessAmounts() {
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

  // ── Submit ──

  const canSubmit = mode === "byItem" ? canProcessItems() : canProcessAmounts();

  function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;

    let withdrawals;
    if (mode === "byItem") {
      withdrawals = getItemWithdrawals();
    } else {
      withdrawals = [];
      for (const [person] of summaryByPerson) {
        for (const row of allocations[person] || []) {
          const amt = parseFloat(row.amount);
          if (amt > 0) {
            withdrawals.push({ person, bucketId: row.bucketId, amount: amt });
          }
        }
      }
    }
    onProcess(withdrawals);
    onClose();
  }

  return (
    <div
      className={g.overlay}
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div
        className={g.modalWide}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reconciliation-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="reconciliation-modal-title" style={{ margin: "0 0 0.5rem" }}>
          Pay from Savings
        </h2>

        <div className={s.modeTabs}>
          <button
            type="button"
            className={mode === "byItem" ? s.modeTabActive : s.modeTab}
            onClick={() => setMode("byItem")}
          >
            By Item
          </button>
          <button
            type="button"
            className={mode === "byAmount" ? s.modeTabActive : s.modeTab}
            onClick={() => setMode("byAmount")}
          >
            By Amount
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {summaryByPerson.map(([person, data]) => {
            if (data.total <= 0) return null;

            if (mode === "byItem") {
              const assigns = itemAssignments[person] || [];
              return (
                <div key={person} className={s.personBlock}>
                  <div className={s.personHeader}>
                    <span>{person}</span>
                    <span>Owes ${data.total.toFixed(2)}</span>
                  </div>

                  {/* Quick-assign all to one account */}
                  {buckets.length > 0 && (
                    <div className={s.quickAssign}>
                      <span className={s.quickLabel}>Pay all from:</span>
                      {buckets.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          className={s.quickBtn}
                          onClick={() => assignAllItems(person, b.id)}
                        >
                          {b.name}
                        </button>
                      ))}
                    </div>
                  )}

                  {data.items.map((item, i) => (
                    <div key={i} className={s.itemRow}>
                      <div className={s.itemDesc}>
                        <span>{item.description}</span>
                        <span className={s.itemAmt}>
                          ${item.owed.toFixed(2)}
                        </span>
                      </div>
                      <select
                        className={s.itemSelect}
                        value={assigns[i] || ""}
                        onChange={(e) =>
                          setItemBucket(person, i, e.target.value)
                        }
                      >
                        <option value="">Select account…</option>
                        {buckets.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name} (${b.amount.toFixed(2)})
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}

                  {/* Per-account usage summary */}
                  <div className={s.usageSummary}>
                    {buckets
                      .filter((b) => {
                        const used = assigns.reduce(
                          (sum, bId, i) =>
                            sum + (bId === b.id ? data.items[i]?.owed || 0 : 0),
                          0,
                        );
                        return used > 0;
                      })
                      .map((b) => {
                        const used = assigns.reduce(
                          (sum, bId, i) =>
                            sum + (bId === b.id ? data.items[i]?.owed || 0 : 0),
                          0,
                        );
                        const over = used > b.amount + 0.01;
                        return (
                          <span
                            key={b.id}
                            className={over ? s.usageOver : s.usageOk}
                          >
                            {b.name}: ${used.toFixed(2)}
                            {over && " (insufficient)"}
                          </span>
                        );
                      })}
                  </div>
                </div>
              );
            }

            // byAmount mode
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
                        <option value="">Select account…</option>
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
                      <button
                        type="button"
                        onClick={() => fillRemaining(person, i)}
                        className={s.fillBtn}
                        title="Fill remaining amount"
                      >
                        Full
                      </button>
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
                    + Add account
                  </button>
                  <span
                    style={{
                      fontSize: "0.85rem",
                      color: Math.abs(remaining) < 0.01 ? "#81c784" : "#e57373",
                    }}
                  >
                    {Math.abs(remaining) < 0.01
                      ? "✓ Fully covered"
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
                Pay from savings?{" "}
                <button type="submit" className={g.runBtn}>
                  Yes, pay
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
                disabled={!canSubmit}
                className={!canSubmit ? g.disabledBtn : undefined}
                onClick={() => setConfirmProcess(true)}
              >
                Pay from Savings
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProcessReconciliationModal;
