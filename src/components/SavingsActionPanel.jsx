import { useState } from "react";
import g from "../styles/shared.module.css";
import s from "../styles/SavingsActionPanel.module.css";

const ACTIONS = ["Deposit", "Withdraw", "Transfer"];

function SavingsActionPanel({
  buckets,
  people,
  onDeposit,
  onWithdraw,
  onTransfer,
}) {
  const [selectedBucketId, setSelectedBucketId] = useState("");
  const [action, setAction] = useState("Deposit");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [person, setPerson] = useState(people[0] ?? "");
  const [transferToId, setTransferToId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedBucket = buckets.find((b) => b.id === selectedBucketId);

  function reset() {
    setAmount("");
    setNote("");
    setError("");
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedBucketId) {
      setError("Select an account first.");
      return;
    }

    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) {
      setError("Enter a valid amount.");
      return;
    }

    if (action === "Deposit") {
      onDeposit(selectedBucketId, {
        amount: parsed,
        note: note.trim(),
        person,
        date: new Date().toISOString(),
      });
      setSuccess(`Deposited $${parsed.toFixed(2)} into ${selectedBucket.name}`);
      reset();
    } else if (action === "Withdraw") {
      if (parsed > selectedBucket.amount) {
        setError(
          `Insufficient balance. Max: $${selectedBucket.amount.toFixed(2)}`,
        );
        return;
      }
      onWithdraw(selectedBucketId, {
        amount: parsed,
        note: note.trim() || "Withdrawal",
        person,
        date: new Date().toISOString(),
      });
      setSuccess(`Withdrew $${parsed.toFixed(2)} from ${selectedBucket.name}`);
      reset();
    } else if (action === "Transfer") {
      if (!transferToId) {
        setError("Select a destination account.");
        return;
      }
      if (parsed > selectedBucket.amount) {
        setError(
          `Insufficient balance. Max: $${selectedBucket.amount.toFixed(2)}`,
        );
        return;
      }
      onTransfer(selectedBucketId, transferToId, parsed);
      const toBucket = buckets.find((b) => b.id === transferToId);
      setSuccess(
        `Transferred $${parsed.toFixed(2)} from ${selectedBucket.name} to ${toBucket?.name}`,
      );
      reset();
      setTransferToId("");
    }
  }

  if (buckets.length === 0) return null;

  return (
    <div className={g.panel}>
      <h2 className={s.heading}>Quick Actions</h2>

      <div className={s.actionTabs}>
        {ACTIONS.map((a) => (
          <button
            key={a}
            onClick={() => {
              setAction(a);
              setError("");
              setSuccess("");
            }}
            className={action === a ? s.actionTabActive : s.actionTab}
          >
            {a}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className={s.form}>
        <div className={s.fieldRow}>
          <label className={s.fieldLabel}>
            {action === "Transfer" ? "From" : "Account"}
            <select
              value={selectedBucketId}
              onChange={(e) => {
                setSelectedBucketId(e.target.value);
                setError("");
                setSuccess("");
              }}
              className={s.select}
            >
              <option value="">Select account…</option>
              {buckets.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} (${b.amount.toFixed(2)})
                </option>
              ))}
            </select>
          </label>

          {action === "Transfer" && (
            <label className={s.fieldLabel}>
              To
              <select
                value={transferToId}
                onChange={(e) => setTransferToId(e.target.value)}
                className={s.select}
              >
                <option value="">Select bucket…</option>
                {buckets
                  .filter((b) => b.id !== selectedBucketId)
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} (${b.amount.toFixed(2)})
                    </option>
                  ))}
              </select>
            </label>
          )}
        </div>

        <div className={s.fieldRow}>
          <label className={s.fieldLabel}>
            Amount
            <input
              type="number"
              min="0.01"
              step="0.01"
              max={
                action === "Deposit"
                  ? 999999
                  : (selectedBucket?.amount ?? 999999)
              }
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
              className={s.input}
            />
          </label>

          {action !== "Transfer" && (
            <label className={s.fieldLabel}>
              Note
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional"
                maxLength={100}
                className={s.input}
              />
            </label>
          )}

          {action !== "Transfer" && (
            <label className={s.fieldLabel}>
              Person
              <select
                value={person}
                onChange={(e) => setPerson(e.target.value)}
                className={s.select}
              >
                {people.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        <div className={s.submitRow}>
          <button type="submit" className={s.submitBtn}>
            {action === "Deposit" && "+ Deposit"}
            {action === "Withdraw" && "− Withdraw"}
            {action === "Transfer" && "→ Transfer"}
          </button>
        </div>

        {error && <p className={g.error}>{error}</p>}
        {success && <p className={s.success}>{success}</p>}
      </form>
    </div>
  );
}

export default SavingsActionPanel;
