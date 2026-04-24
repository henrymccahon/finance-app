import { useState } from "react";
import s from "../styles/ExpenseItemRow.module.css";
import g from "../styles/shared.module.css";

function ExpenseItemRow({
  expense,
  monthlyAmount,
  onEdit,
  onDelete,
  displayAmount,
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const shown = displayAmount ?? expense.amount;
  const shownMonthly =
    displayAmount != null
      ? monthlyAmount * (displayAmount / expense.amount)
      : monthlyAmount;

  return (
    <div className={s.row}>
      <div className={s.main}>
        <div>
          <strong>{expense.title}</strong>
          <span className={g.badge}>{expense.category}</span>
          <span className={g.badgePerson}>{expense.assignedTo}</span>
          {expense.assignedTo === "Shared" &&
            expense.splitPercent != null &&
            expense.splitPercent !== 50 && (
              <span className={g.badgeSplit}>
                {expense.splitPercent}/{100 - expense.splitPercent}
              </span>
            )}
        </div>
        <div className={s.amounts}>
          <span className={s.amount}>${shown.toFixed(2)}</span>
          {displayAmount != null && displayAmount !== expense.amount && (
            <span className={s.fullAmount}>
              of ${expense.amount.toFixed(2)}
            </span>
          )}
          <span className={s.frequency}>
            {{
              weekly: "Weekly",
              fortnightly: "Every 2 Weeks",
              monthly: "Monthly",
              quarterly: "Quarterly",
              yearly: "Yearly",
            }[expense.frequency] || expense.frequency}
          </span>
        </div>
      </div>

      <div className={s.meta}>
        <span className={s.monthly}>${shownMonthly.toFixed(2)}/mo</span>

        <div className={s.actions}>
          <button onClick={onEdit} className={g.actionBtnSmall}>
            Edit
          </button>
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className={g.actionBtnDanger}
              style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem" }}
            >
              Delete
            </button>
          ) : (
            <span className={g.confirmTextSmall}>
              Sure?{" "}
              <button
                onClick={onDelete}
                className={g.actionBtnDangerBold}
                style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem" }}
              >
                Yes
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className={g.actionBtnSmall}
              >
                No
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default ExpenseItemRow;
