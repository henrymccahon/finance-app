import { useMemo, useState } from "react";
import AddTransactionModal from "../components/AddTransactionModal";
import ProcessReconciliationModal from "../components/ProcessReconciliationModal";
import s from "../styles/ReconciliationPage.module.css";
import g from "../styles/shared.module.css";

function ReconciliationPage({ people, buckets, setBuckets, transactions, setTransactions, processedHistory, setProcessedHistory }) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingTxn, setEditingTxn] = useState(null);
  const [isProcessOpen, setIsProcessOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  function handleAdd(txn) {
    setTransactions((prev) => [
      { ...txn, id: crypto.randomUUID() },
      ...prev,
    ]);
  }

  function handleUpdate(updated) {
    setTransactions((prev) =>
      prev.map((t) => (t.id === updated.id ? updated : t)),
    );
    setEditingTxn(null);
  }

  function handleDelete(id) {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  }

  const summary = useMemo(() => {
    const map = {};
    for (const p of people) map[p] = { total: 0, items: [] };
    for (const t of transactions) {
      if (t.paidBy === "Shared") {
        const pct = t.splitPercent ?? 50;
        const amt0 = (t.amount * pct) / 100;
        const amt1 = (t.amount * (100 - pct)) / 100;
        map[people[0]].total += amt0;
        map[people[0]].items.push({
          description: t.description,
          full: t.amount,
          owed: amt0,
          shared: true,
          pct,
        });
        map[people[1]].total += amt1;
        map[people[1]].items.push({
          description: t.description,
          full: t.amount,
          owed: amt1,
          shared: true,
          pct: 100 - pct,
        });
      } else if (map[t.paidBy]) {
        map[t.paidBy].total += t.amount;
        map[t.paidBy].items.push({
          description: t.description,
          full: t.amount,
          owed: t.amount,
          shared: false,
        });
      }
    }
    const total = Object.values(map).reduce((a, b) => a + b.total, 0);
    return { byPerson: Object.entries(map), total };
  }, [transactions, people]);

  const grandTotal = transactions.reduce((s, t) => s + t.amount, 0);

  function handleProcess(withdrawals) {
    const now = new Date().toISOString();
    const record = {
      id: crypto.randomUUID(),
      date: now,
      transactions: [...transactions],
      withdrawals,
      grandTotal,
    };
    // Withdraw from buckets
    setBuckets((prev) =>
      prev.map((bucket) => {
        const matching = withdrawals.filter((w) => w.bucketId === bucket.id);
        if (matching.length === 0) return bucket;
        const totalWithdraw = matching.reduce((s, w) => s + w.amount, 0);
        const newDeposits = matching.map((w) => ({
          amount: -w.amount,
          note: `CC Reconciliation – ${w.person}`,
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
    setTransactions([]);
  }

  return (
    <section>
      <h1>Credit Card Reconciliation</h1>

      <button
        onClick={() => {
          setEditingTxn(null);
          setIsAddOpen(true);
        }}
      >
        + Add Transaction
      </button>
      {transactions.length > 0 && (
        <button
          onClick={() => setIsProcessOpen(true)}
          className={g.processBtn}
        >
          Process Reconciliation
        </button>
      )}

      <AddTransactionModal
        isOpen={isAddOpen || editingTxn !== null}
        onClose={() => {
          setIsAddOpen(false);
          setEditingTxn(null);
        }}
        onSave={editingTxn ? handleUpdate : handleAdd}
        existing={editingTxn}
        people={people}
      />

      <ProcessReconciliationModal
        isOpen={isProcessOpen}
        onClose={() => setIsProcessOpen(false)}
        onProcess={handleProcess}
        people={people}
        buckets={buckets}
        summaryByPerson={summary.byPerson}
      />

      {/* Summary panel */}
      {transactions.length > 0 && (
        <div className={g.panel}>
          <h2 style={{ margin: "0 0 0.75rem" }}>Summary</h2>

          <div className={s.receiptGrid}>
            {summary.byPerson.map(([person, data]) => (
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
            ))}
          </div>

          <div className={s.grandTotalBar}>
            <span>Grand Total</span>
            <span>${grandTotal.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Transaction list */}
      {transactions.length === 0 ? (
        <p className={g.empty}>
          No transactions added yet. Add your credit card statement items above.
        </p>
      ) : (
        <div className={s.list}>
          {transactions.map((txn) => (
            <div key={txn.id} className={s.row}>
              <div className={s.rowMain}>
                <div>
                  <span className={s.desc}>{txn.description}</span>
                  <span className={g.badge}>
                    {txn.paidBy === "Shared"
                      ? `Split ${txn.splitPercent ?? 50}/${100 - (txn.splitPercent ?? 50)}`
                      : txn.paidBy}
                  </span>
                </div>
                <span className={s.amount}>${txn.amount.toFixed(2)}</span>
              </div>
              {txn.paidBy === "Shared" && (
                <div className={s.splitDetail}>
                  {people[0]}: $
                  {((txn.amount * (txn.splitPercent ?? 50)) / 100).toFixed(2)}
                  {" · "}
                  {people[1]}: $
                  {(
                    (txn.amount * (100 - (txn.splitPercent ?? 50))) /
                    100
                  ).toFixed(2)}
                </div>
              )}
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
                      style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem" }}
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
                    style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem" }}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Processed history */}
      {processedHistory.length > 0 && (
        <div style={{ marginTop: "2rem" }}>
          <h2>Processed Reconciliations</h2>
          {processedHistory.map((record) => (
            <div key={record.id} className={s.historyCard}>
              <div className={s.historyHeader}>
                <span>
                  {new Date(record.date).toLocaleDateString()} –{" "}
                  {new Date(record.date).toLocaleTimeString()}
                </span>
                <span style={{ fontWeight: "bold" }}>
                  ${record.grandTotal.toFixed(2)}
                </span>
              </div>
              <div className={s.historyDetail}>
                {record.withdrawals.map((w, i) => {
                  const bucket = buckets.find((b) => b.id === w.bucketId);
                  return (
                    <div key={i} className={s.historyRow}>
                      <span>{w.person}</span>
                      <span style={{ color: "#888" }}>
                        ${w.amount.toFixed(2)} from{" "}
                        {bucket?.name ?? "deleted bucket"}
                      </span>
                    </div>
                  );
                })}
              </div>
              <details className={s.historyDetails}>
                <summary style={{ cursor: "pointer", color: "#888", fontSize: "0.8rem" }}>
                  {record.transactions.length} transaction{record.transactions.length !== 1 ? "s" : ""}
                </summary>
                <div style={{ marginTop: "0.35rem" }}>
                  {record.transactions.map((t, i) => (
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
