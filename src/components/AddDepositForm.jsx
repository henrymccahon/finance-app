import { useState } from "react";
import g from "../styles/shared.module.css";

function AddDepositForm({ onDeposit, people }) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [person, setPerson] = useState(people[0] ?? "");

  function handleSubmit(e) {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) return;

    onDeposit({
      amount: parsed,
      note: note.trim(),
      person,
      date: new Date().toISOString(),
    });

    setAmount("");
    setNote("");
  }

  return (
    <form onSubmit={handleSubmit} className={g.formRow}>
      <input
        type="number"
        min="0.01"
        step="0.01"
        max="999999"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount"
        required
      />
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (optional)"
        maxLength={100}
      />
      <select
        value={person}
        onChange={(e) => setPerson(e.target.value)}
        className={g.selectInline}
      >
        {people.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
      <button type="submit">+ Deposit</button>
    </form>
  );
}

export default AddDepositForm;
