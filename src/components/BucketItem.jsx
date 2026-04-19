import { useState } from "react";
import s from "../styles/BucketItem.module.css";
import g from "../styles/shared.module.css";

function BucketItem({
  name,
  description,
  amount,
  deposits,
  onDelete,
  onRename,
}) {
  const [expanded, setExpanded] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(name);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleRenameSubmit(e) {
    e.preventDefault();
    if (newName.trim() && newName.trim() !== name) {
      onRename(newName.trim());
    }
    setIsRenaming(false);
  }

  return (
    <div className={g.card}>
      <div className={s.header} onClick={() => setExpanded(!expanded)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setExpanded(!expanded))} role="button" tabIndex={0} aria-expanded={expanded}>
        <div>
          {isRenaming ? (
            <form
              onSubmit={handleRenameSubmit}
              onClick={(e) => e.stopPropagation()}
              style={{ display: "flex", gap: "0.5rem" }}
            >
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                maxLength={50}
                autoFocus
              />
              <button type="submit">Save</button>
              <button
                type="button"
                onClick={() => {
                  setIsRenaming(false);
                  setNewName(name);
                }}
              >
                Cancel
              </button>
            </form>
          ) : (
            <h3 style={{ margin: 0 }}>{name}</h3>
          )}
          {description && !isRenaming && <p className={s.desc}>{description}</p>}
        </div>
        <span className={s.amount}>${amount.toFixed(2)}</span>
      </div>

      {expanded && (
        <div className={s.body}>
          {/* Action buttons */}
          <div className={g.actionsRow}>
            <button
              onClick={() => {
                setIsRenaming(true);
                setNewName(name);
              }}
              className={g.actionBtn}
            >
              Rename
            </button>
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className={g.actionBtnDanger}
              >
                Delete
              </button>
            ) : (
              <span className={g.confirmText}>
                Are you sure?{" "}
                <button
                  onClick={onDelete}
                  className={g.actionBtnDangerBold}
                >
                  Yes, delete
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className={g.actionBtn}
                >
                  No
                </button>
              </span>
            )}
          </div>

          {/* Transaction history */}
          {deposits.length > 0 && (
            <>
              <h4 className={g.sectionLabel}>History</h4>
              <ul className={s.historyList}>
                {deposits.map((d, i) => (
                  <li key={i} className={s.deposit}>
                    <span className={d.amount >= 0 ? s.positive : s.negative}>
                      {d.amount >= 0 ? "+" : "−"}$
                      {Math.abs(d.amount).toFixed(2)}
                    </span>
                    <span className={s.note}>
                      {d.person && <strong>{d.person}</strong>}
                      {d.person && (d.note || d.date) && " · "}
                      {d.note && `${d.note} · `}
                      {new Date(d.date).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default BucketItem;
