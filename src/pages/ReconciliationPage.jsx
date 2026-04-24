import { useMemo, useState } from "react";
import AddTransactionModal from "../components/AddTransactionModal";
import ProcessReconciliationModal from "../components/ProcessReconciliationModal";
import { equalSplits, getSplits } from "../utils/splits";
import s from "../styles/ReconciliationPage.module.css";
import g from "../styles/shared.module.css";

function ReconciliationPage({
  people,
  buckets,
  setBuckets,
  transactions,
  setTransactions,
  processedHistory,
  setProcessedHistory,
}) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingTxn, setEditingTxn] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Settlement mode
  const [isSettling, setIsSettling] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  // Per-transaction assignment overrides while settling: { [txnId]: { paidBy, splits } }
  const [assignments, setAssignments] = useState({});
  const [isProcessOpen, setIsProcessOpen] = useState(false);

  function handleAdd(txn) {
    setTransactions((prev) => [{ ...txn, id: crypto.randomUUID() }, ...prev]);
  }

  function handleUpdate(updated) {
    setTransactions((prev) =>
      prev.map((t) => (t.id === updated.id ? updated : t)),
    );
    setEditingTxn(null);
  }

  function handleDelete(id) {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  function startSettling() {
    setIsSettling(true);
    setSelectedIds(new Set());
    // Initialize default assignments: equal split if >1 person, else sole person
    const init = {};
    for (const t of transactions) {
      init[t.id] =
        people.length > 1
          ? { paidBy: "Shared", splits: equalSplits(people) }
          : { paidBy: people[0], splits: undefined };
    }
    setAssignments(init);
  }

  function cancelSettling() {
    setIsSettling(false);
    setSelectedIds(new Set());
    setAssignments({});
  }

  function toggleSelected(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selectedIds.size === transactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(transactions.map((t) => t.id)));
    }
  }

  function updateAssignment(txnId, field, value) {
    setAssignments((prev) => ({
      ...prev,
      [txnId]: { ...prev[txnId], [field]: value },
    }));
  }

  function updateSplitPct(txnId, person, pct) {
    setAssignments((prev) => ({
      ...prev,
      [txnId]: {
        ...prev[txnId],
        splits: { ...(prev[txnId]?.splits || {}), [person]: pct },
      },
    }));
  }

  // Build summary from selected + assigned transactions
  const settleSummary = useMemo(() => {
    if (!isSettling) return null;
    const map = {};
    for (const p of people) map[p] = { total: 0, items: [] };
    for (const t of transactions) {
      if (!selectedIds.has(t.id)) continue;
      const a = assignments[t.id];
      if (!a) continue;
      if (a.paidBy === "Shared") {
        const sp = a.splits || equalSplits(people);
        for (const p of people) {
          const amt = (t.amount * (sp[p] ?? 0)) / 100;
          if (amt > 0) {
            map[p].total += amt;
            map[p].items.push({
              description: t.description,
              full: t.amount,
              owed: amt,
              shared: true,
              pct: sp[p] ?? 0,
            });
          }
        }
      } else if (map[a.paidBy]) {
        map[a.paidBy].total += t.amount;
        map[a.paidBy].items.push({
          description: t.description,
          full: t.amount,
          owed: t.amount,
          shared: false,
        });
      }
    }
    const total = Object.values(map).reduce((a, b) => a + b.total, 0);
    return { byPerson: Object.entries(map), total };
  }, [isSettling, selectedIds, assignments, transactions, people]);

  // Check all selected transactions have valid assignments
  const canSettle = useMemo(() => {
    if (selectedIds.size === 0) return false;
    for (const id of selectedIds) {
      const a = assignments[id];
      if (!a || !a.paidBy) return false;
      if (a.paidBy === "Shared" && a.splits) {
        const total = Object.values(a.splits).reduce((s, v) => s + v, 0);
        if (Math.round(total) !== 100) return false;
      }
    }
    return true;
  }, [selectedIds, assignments]);

  function handleProcess(withdrawals) {
    const settledTxns = transactions.filter((t) => selectedIds.has(t.id));
    const now = new Date().toISOString();
    const selectedTotal = settledTxns.reduce((s, t) => s + t.amount, 0);
    const record = {
      id: crypto.randomUUID(),
      date: now,
      transactions: settledTxns.map((t) => ({
        ...t,
        ...(assignments[t.id] || {}),
      })),
      withdrawals,
      grandTotal: selectedTotal,
    };
    // Withdraw from buckets
    setBuckets((prev) =>
      prev.map((bucket) => {
        const matching = withdrawals.filter((w) => w.bucketId === bucket.id);
        if (matching.length === 0) return bucket;
        const totalWithdraw = matching.reduce((s, w) => s + w.amount, 0);
        const newDeposits = matching.map((w) => ({
          amount: -w.amount,
          note: `Settle up – ${w.person}`,
          person: w.person,
          date: now,
        }));
        return {
          ...bucket,
          amount: bucket.amount - totalWithdraw,
          deposits: [...newDeposits, ...bucket.deposits],
        };
      }),
    );
    setProcessedHistory((prev) => [record, ...prev]);
    // Remove only settled transactions
    setTransactions((prev) => prev.filter((t) => !selectedIds.has(t.id)));
    cancelSettling();
  }

  const grandTotal = transactions.reduce((s, t) => s + t.amount, 0);

  return (
    <section>
      <h1>Settle Up</h1>

      <div className={s.topActions}>
        <button
          onClick={() => {
            setEditingTxn(null);
            setIsAddOpen(true);
          }}
        >
          + Add Transaction
        </button>
        {!isSettling && transactions.length > 0 && (
          <button onClick={startSettling} className={g.processBtn}>
            Settle Selected…
          </button>
        )}
        {isSettling && (
          <button onClick={cancelSettling} className={s.cancelSettleBtn}>
            Cancel Settlement
          </button>
        )}
      </div>

      <AddTransactionModal
        isOpen={isAddOpen || editingTxn !== null}
        onClose={() => {
          setIsAddOpen(false);
          setEditingTxn(null);
        }}
        onSave={editingTxn ? handleUpdate : handleAdd}
        existing={editingTxn}
      />

      <ProcessReconciliationModal
        isOpen={isProcessOpen}
        onClose={() => setIsProcessOpen(false)}
        onProcess={handleProcess}
        people={people}
        buckets={buckets}
        summaryByPerson={settleSummary?.byPerson || []}
      />

      {/* Transaction list */}
      {transactions.length === 0 ? (
        <p className={g.empty}>
          No transactions added yet. Add your credit card statement items above.
        </p>
      ) : (
        <>
          {isSettling && (
            <div className={s.settleBar}>
              <label className={s.selectAllLabel}>
                <input
                  type="checkbox"
                  checked={selectedIds.size === transactions.length}
                  onChange={toggleAll}
                />
                Select all ({selectedIds.size}/{transactions.length})
              </label>
              {people.length > 1 && selectedIds.size > 0 && (
                <div className={s.bulkAssign}>
                  <span className={s.bulkLabel}>Assign all selected to:</span>
                  {people.map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={s.bulkBtn}
                      onClick={() => {
                        const next = { ...assignments };
                        for (const id of selectedIds) {
                          next[id] = { paidBy: p, splits: undefined };
                        }
                        setAssignments(next);
                      }}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={s.bulkBtn}
                    onClick={() => {
                      const next = { ...assignments };
                      for (const id of selectedIds) {
                        next[id] = {
                          paidBy: "Shared",
                          splits: equalSplits(people),
                        };
                      }
                      setAssignments(next);
                    }}
                  >
                    Shared
                  </button>
                </div>
              )}
            </div>
          )}

          <div className={s.list}>
            {transactions.map((txn) => {
              const isSelected = selectedIds.has(txn.id);
              const a = assignments[txn.id];
              return (
                <div
                  key={txn.id}
                  className={`${s.row} ${isSettling && isSelected ? s.rowSelected : ""}`}
                >
                  <div className={s.rowMain}>
                    {isSettling && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelected(txn.id)}
                        className={s.checkbox}
                      />
                    )}
                    <div style={{ flex: 1 }}>
                      <span className={s.desc}>{txn.description}</span>
                    </div>
                    <span className={s.amount}>${txn.amount.toFixed(2)}</span>
                  </div>

                  {/* Assignment controls — only in settle mode for selected items */}
                  {isSettling && isSelected && a && (
                    <div className={s.assignRow}>
                      <select
                        value={a.paidBy}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateAssignment(txn.id, "paidBy", val);
                          if (val === "Shared") {
                            updateAssignment(
                              txn.id,
                              "splits",
                              equalSplits(people),
                            );
                          } else {
                            updateAssignment(txn.id, "splits", undefined);
                          }
                        }}
                        className={s.assignSelect}
                      >
                        {people.length > 1 && (
                          <option value="Shared">Shared (split)</option>
                        )}
                        {people.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>

                      {a.paidBy === "Shared" && people.length > 1 && (
                        <div className={s.inlineSplits}>
                          {people.map((p) => (
                            <span key={p} className={s.inlineSplitItem}>
                              <span className={s.inlineSplitName}>{p}</span>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="1"
                                value={a.splits?.[p] ?? 0}
                                onChange={(e) =>
                                  updateSplitPct(
                                    txn.id,
                                    p,
                                    Number(e.target.value),
                                  )
                                }
                                className={s.inlineSplitInput}
                              />
                              <span className={s.inlineSplitPct}>%</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Edit/Delete — only when NOT settling */}
                  {!isSettling && (
                    <div className={s.rowActions}>
                      <button
                        onClick={() => setEditingTxn(txn)}
                        className={g.actionBtnSmall}
                      >
                        Edit
                      </button>
                      {confirmDeleteId === txn.id ? (
                        <span className={g.confirmTextSmall}>
                          Sure?{" "}
                          <button
                            onClick={() => {
                              handleDelete(txn.id);
                              setConfirmDeleteId(null);
                            }}
                            className={g.actionBtnDangerBold}
                            style={{
                              padding: "0.2rem 0.5rem",
                              fontSize: "0.75rem",
                            }}
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className={g.actionBtnSmall}
                          >
                            No
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(txn.id)}
                          className={g.actionBtnDanger}
                          style={{
                            padding: "0.2rem 0.5rem",
                            fontSize: "0.75rem",
                          }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Grand total */}
          <div className={s.grandTotalBar}>
            <span>
              {isSettling
                ? `Selected: ${selectedIds.size} of ${transactions.length}`
                : `${transactions.length} transaction${transactions.length !== 1 ? "s" : ""}`}
            </span>
            <span>
              {isSettling
                ? `$${transactions
                    .filter((t) => selectedIds.has(t.id))
                    .reduce((s, t) => s + t.amount, 0)
                    .toFixed(2)}`
                : `$${grandTotal.toFixed(2)}`}
            </span>
          </div>

          {/* Settlement summary + pay button */}
          {isSettling && settleSummary && selectedIds.size > 0 && (
            <div className={g.panel} style={{ marginTop: "1rem" }}>
              <h2 style={{ margin: "0 0 0.75rem" }}>Settlement Summary</h2>
              <div className={s.receiptGrid}>
                {settleSummary.byPerson.map(([person, data]) => {
                  if (data.total <= 0) return null;
                  return (
                    <div key={person} className={s.receipt}>
                      <div className={s.receiptHeader}>{person}</div>
                      <table className={g.table}>
                        <tbody>
                          {data.items.map((item, i) => (
                            <tr key={i}>
                              <td className={s.receiptDesc}>
                                {item.description}
                                {item.shared && (
                                  <span className={s.receiptShareBadge}>
                                    {item.pct}% of ${item.full.toFixed(2)}
                                  </span>
                                )}
                              </td>
                              <td className={s.receiptAmt}>
                                ${item.owed.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td className={s.receiptTotalLabel}>Total</td>
                            <td className={s.receiptTotalValue}>
                              ${data.total.toFixed(2)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: "1rem", textAlign: "right" }}>
                <button
                  disabled={!canSettle}
                  className={!canSettle ? g.disabledBtn : g.processBtn}
                  onClick={() => setIsProcessOpen(true)}
                >
                  Pay from Savings
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Processed history */}
      {processedHistory.length > 0 && (
        <div style={{ marginTop: "2rem" }}>
          <h2>Past Settlements</h2>
          {processedHistory.map((record) => (
            <div key={record.id} className={s.historyCard}>
              <div className={s.historyHeader}>
                <span>
                  {new Date(record.date).toLocaleDateString()} –{" "}
                  {new Date(record.date).toLocaleTimeString()}
                </span>
                <span style={{ fontWeight: "bold" }}>
                  ${(record.grandTotal ?? 0).toFixed(2)}
                </span>
              </div>
              <div className={s.historyDetail}>
                {(record.withdrawals || []).map((w, i) => {
                  const bucket = buckets.find((b) => b.id === w.bucketId);
                  return (
                    <div key={i} className={s.historyRow}>
                      <span>{w.person}</span>
                      <span style={{ color: "#888" }}>
                        ${w.amount.toFixed(2)} from{" "}
                        {bucket?.name ?? "deleted account"}
                      </span>
                    </div>
                  );
                })}
              </div>
              <details className={s.historyDetails}>
                <summary
                  style={{
                    cursor: "pointer",
                    color: "#888",
                    fontSize: "0.8rem",
                  }}
                >
                  {(record.transactions || []).length} transaction
                  {(record.transactions || []).length !== 1 ? "s" : ""}
                </summary>
                <div style={{ marginTop: "0.35rem" }}>
                  {(record.transactions || []).map((t, i) => (
                    <div key={i} className={s.historyTxn}>
                      <span>{t.description}</span>
                      <span>${t.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default ReconciliationPage;
