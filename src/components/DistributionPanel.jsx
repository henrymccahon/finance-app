import { useState } from "react";
import s from "../styles/DistributionPanel.module.css";
import g from "../styles/shared.module.css";

function DistributionPanel({
  distributions,
  buckets,
  onRun,
  onEdit,
  onDelete,
}) {
  const [confirmRunId, setConfirmRunId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  if (distributions.length === 0) return null;

  function bucketName(id) {
    return buckets.find((b) => b.id === id)?.name ?? "(deleted)";
  }

  return (
    <div className={g.panel}>
      <h2 style={{ margin: "0 0 0.75rem" }}>Savings Plans</h2>

      {distributions.map((dist) => {
        const total = dist.allocations.reduce((s, a) => s + a.amount, 0);
        return (
          <div key={dist.id} className={g.cardInner}>
            <div className={s.cardHeader}>
              <strong>{dist.name}</strong>
              <span className={s.totalBadge}>${total.toFixed(2)}</span>
            </div>

            <ul className={s.allocList}>
              {dist.allocations.map((a) => (
                <li key={a.bucketId} className={s.allocItem}>
                  <span>{bucketName(a.bucketId)}</span>
                  <span>${a.amount.toFixed(2)}</span>
                </li>
              ))}
            </ul>

            <div className={s.cardActions}>
              {confirmRunId === dist.id ? (
                <span className={g.confirmText}>
                  Deposit ${total.toFixed(2)}?{" "}
                  <button
                    onClick={() => {
                      onRun(dist.id);
                      setConfirmRunId(null);
                    }}
                    className={s.confirmBtn}
                  >
                    Yes, apply
                  </button>
                  <button
                    onClick={() => setConfirmRunId(null)}
                    className={g.actionBtn}
                  >
                    No
                  </button>
                </span>
              ) : (
                <button
                  onClick={() => setConfirmRunId(dist.id)}
                  className={g.runBtn}
                >
                  ▶ Apply Plan
                </button>
              )}

              <button onClick={() => onEdit(dist.id)} className={g.actionBtn}>
                Edit
              </button>

              {confirmDeleteId === dist.id ? (
                <span className={g.confirmText}>
                  Delete?{" "}
                  <button
                    onClick={() => {
                      onDelete(dist.id);
                      setConfirmDeleteId(null);
                    }}
                    className={g.actionBtnDanger}
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className={g.actionBtn}
                  >
                    No
                  </button>
                </span>
              ) : (
                <button
                  onClick={() => setConfirmDeleteId(dist.id)}
                  className={g.actionBtnDanger}
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default DistributionPanel;
