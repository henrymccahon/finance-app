import { useState, useMemo, useEffect } from "react";
import { FREQUENCY_MULTIPLIERS } from "../utils/constants";
import { getPersonShare } from "../utils/splits";
import s from "../styles/SalaryPage.module.css";
import g from "../styles/shared.module.css";

const FREQUENCIES = [
  { value: "weekly", label: "Weekly" },
  { value: "fortnightly", label: "Every 2 Weeks" },
  { value: "monthly", label: "Monthly" },
];

function SalaryPage({
  people,
  salaryConfig,
  setSalaryConfig,
  buckets,
  expenses,
}) {
  const [editingActuals, setEditingActuals] = useState({});
  const [activePerson, setActivePerson] = useState(null);

  // Build per-person salary entries with defaults
  const salaries = useMemo(() => {
    return people.map((person) => {
      const entry = (salaryConfig.salaries || []).find(
        (e) => e.person === person,
      );
      return {
        person,
        amount: entry?.amount ?? 0,
        frequency: entry?.frequency ?? "fortnightly",
      };
    });
  }, [people, salaryConfig]);

  // Per-person allocations stored as { [person]: [{ bucketId, required, actual }] }
  const personAllocations = salaryConfig.personAllocations || {};

  function getAllocsForPerson(person) {
    return personAllocations[person] || [];
  }

  function getPersonAlloc(person, bucketId) {
    return getAllocsForPerson(person).find((a) => a.bucketId === bucketId);
  }

  // Each person's expense total converted to their pay frequency
  const expensesByPerson = useMemo(() => {
    const map = {};
    for (const sal of salaries) {
      const periodMult = FREQUENCY_MULTIPLIERS[sal.frequency] || 1;
      let total = 0;
      for (const exp of expenses) {
        const monthlyShare = getPersonShare(exp, sal.person, people);
        total += monthlyShare / periodMult;
      }
      map[sal.person] = total;
    }
    return map;
  }, [salaries, expenses, people]);

  function handleSalaryChange(person, field, value) {
    const updated = salaries.map((sal) =>
      sal.person === person ? { ...sal, [field]: value } : sal,
    );
    setSalaryConfig((prev) => ({ ...prev, salaries: updated }));
  }

  function handleAllocChange(person, bucketId, field, value) {
    const num = parseFloat(value) || 0;
    const allocs = [...getAllocsForPerson(person)];
    const idx = allocs.findIndex((a) => a.bucketId === bucketId);
    if (idx >= 0) {
      allocs[idx] = { ...allocs[idx], [field]: num };
    } else {
      allocs.push({
        bucketId,
        required: field === "required" ? num : 0,
        actual: field === "actual" ? num : 0,
      });
    }
    setSalaryConfig((prev) => ({
      ...prev,
      personAllocations: { ...prev.personAllocations, [person]: allocs },
    }));
  }

  function editKey(person, bucketId) {
    return `${person}:${bucketId}`;
  }

  function handleActualEdit(person, bucketId, value) {
    setEditingActuals((prev) => ({
      ...prev,
      [editKey(person, bucketId)]: value,
    }));
  }

  function commitActualEdit(person, bucketId) {
    const key = editKey(person, bucketId);
    const raw = editingActuals[key];
    if (raw === undefined) return;
    handleAllocChange(person, bucketId, "actual", raw);
    setEditingActuals((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  // Auto-select first person with a salary
  const activeSalaries = useMemo(
    () => salaries.filter((sal) => sal.amount > 0),
    [salaries],
  );

  useEffect(() => {
    if (
      activeSalaries.length > 0 &&
      !activeSalaries.find((sal) => sal.person === activePerson)
    ) {
      setActivePerson(activeSalaries[0].person);
    }
  }, [activeSalaries, activePerson]);

  return (
    <section>
      <h1>Pay Distribution</h1>

      {/* Salary inputs */}
      <div className={g.panel}>
        <h2 style={{ margin: "0 0 0.75rem" }}>Take-Home Pay</h2>
        {salaries.map((sal) => (
          <div key={sal.person} className={s.salaryRow}>
            <span className={s.salaryName}>{sal.person}</span>
            <div className={s.salaryFields}>
              <label className={s.fieldLabel}>
                Amount
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={sal.amount || ""}
                  onChange={(e) =>
                    handleSalaryChange(
                      sal.person,
                      "amount",
                      parseFloat(e.target.value) || 0,
                    )
                  }
                  placeholder="0.00"
                  className={s.amountInput}
                />
              </label>
              <label className={s.fieldLabel}>
                Frequency
                <select
                  value={sal.frequency}
                  onChange={(e) =>
                    handleSalaryChange(sal.person, "frequency", e.target.value)
                  }
                  className={s.freqSelect}
                >
                  {FREQUENCIES.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        ))}
      </div>

      {/* Per-person tab bar + active section */}
      {(() => {
        const selected = activeSalaries.find(
          (sal) => sal.person === activePerson,
        )
          ? activePerson
          : (activeSalaries[0]?.person ?? null);
        const sal = activeSalaries.find((s) => s.person === selected);
        if (!sal || activeSalaries.length === 0) return null;

        const freq = sal.frequency;
        const freqLabel =
          FREQUENCIES.find((f) => f.value === freq)?.label ?? "period";
        const expenseTotal = expensesByPerson[sal.person] || 0;
        const allocs = getAllocsForPerson(sal.person);
        const totalRequired = allocs.reduce(
          (sum, a) => sum + (a.required || 0),
          0,
        );
        const totalActual = allocs.reduce((sum, a) => sum + (a.actual || 0), 0);
        const remaining = sal.amount - totalActual;

        return (
          <>
            {activeSalaries.length > 1 && (
              <div className={s.personTabs}>
                {activeSalaries.map((p) => (
                  <button
                    key={p.person}
                    className={`${s.personTab} ${p.person === selected ? s.personTabActive : ""}`}
                    onClick={() => setActivePerson(p.person)}
                  >
                    {p.person}
                  </button>
                ))}
              </div>
            )}

            <div
              className={
                activeSalaries.length > 1
                  ? s.personSectionTabbed
                  : s.personSection
              }
            >
              {activeSalaries.length === 1 && (
                <h2 className={s.personHeading}>{sal.person}</h2>
              )}

              {/* Summary chips */}
              <div className={s.infoBanner}>
                <div className={s.infoItem}>
                  <span className={s.infoLabel}>Take-Home</span>
                  <span className={s.infoValue}>${sal.amount.toFixed(2)}</span>
                </div>
                <div className={s.infoItem}>
                  <span className={s.infoLabel}>
                    Expenses / {freqLabel.toLowerCase()}
                  </span>
                  <span className={s.infoValue}>
                    ${expenseTotal.toFixed(2)}
                  </span>
                </div>
                <div className={s.infoItem}>
                  <span className={s.infoLabel}>After Expenses</span>
                  <span
                    className={s.infoValue}
                    style={{
                      color:
                        sal.amount - expenseTotal >= 0
                          ? "var(--color-success)"
                          : "var(--color-danger)",
                    }}
                  >
                    ${(sal.amount - expenseTotal).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Distribution table */}
              {buckets.length > 0 ? (
                <>
                  <p className={g.hint}>
                    Allocate {sal.person}'s pay across accounts. Set what's{" "}
                    <em>required</em> vs what you <em>actually</em> deposit.
                  </p>

                  <div className={s.tableWrap}>
                    <table className={g.table}>
                      <thead>
                        <tr>
                          <th className={g.th}>Account</th>
                          <th className={g.thRight}>Required</th>
                          <th className={g.thRight}>Actual</th>
                          <th className={g.thRight}>Buffer</th>
                        </tr>
                      </thead>
                      <tbody>
                        {buckets.map((bucket) => {
                          const alloc = getPersonAlloc(sal.person, bucket.id);
                          const required = alloc?.required || 0;
                          const key = editKey(sal.person, bucket.id);
                          const actual =
                            editingActuals[key] !== undefined
                              ? editingActuals[key]
                              : alloc?.actual || 0;
                          const actualNum = parseFloat(actual) || 0;
                          const buffer = actualNum - required;
                          return (
                            <tr key={bucket.id}>
                              <td className={g.td}>{bucket.name}</td>
                              <td className={g.tdRight}>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={required || ""}
                                  onChange={(e) =>
                                    handleAllocChange(
                                      sal.person,
                                      bucket.id,
                                      "required",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="0.00"
                                  className={s.cellInput}
                                />
                              </td>
                              <td className={g.tdRight}>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={
                                    editingActuals[key] !== undefined
                                      ? editingActuals[key]
                                      : alloc?.actual || ""
                                  }
                                  onChange={(e) =>
                                    handleActualEdit(
                                      sal.person,
                                      bucket.id,
                                      e.target.value,
                                    )
                                  }
                                  onBlur={() =>
                                    commitActualEdit(sal.person, bucket.id)
                                  }
                                  placeholder="0.00"
                                  className={s.cellInput}
                                />
                              </td>
                              <td
                                className={g.tdRight}
                                style={{
                                  color:
                                    buffer > 0
                                      ? "var(--color-success)"
                                      : buffer < 0
                                        ? "var(--color-danger)"
                                        : undefined,
                                  fontWeight: buffer !== 0 ? 600 : undefined,
                                }}
                              >
                                {buffer !== 0
                                  ? `${buffer > 0 ? "+" : ""}$${buffer.toFixed(2)}`
                                  : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td className={g.totalLabel}>Total</td>
                          <td className={g.totalValue}>
                            ${totalRequired.toFixed(2)}
                          </td>
                          <td className={g.totalValue}>
                            ${totalActual.toFixed(2)}
                          </td>
                          <td
                            className={g.totalValue}
                            style={{
                              color:
                                totalActual - totalRequired > 0
                                  ? "var(--color-success)"
                                  : totalActual - totalRequired < 0
                                    ? "var(--color-danger)"
                                    : undefined,
                            }}
                          >
                            {totalActual - totalRequired !== 0
                              ? `${totalActual - totalRequired > 0 ? "+" : ""}$${(totalActual - totalRequired).toFixed(2)}`
                              : "—"}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div className={s.remainingBar}>
                    <span>Remaining from {sal.person}'s pay:</span>
                    <span
                      style={{
                        fontWeight: 700,
                        color:
                          remaining >= 0
                            ? "var(--color-success)"
                            : "var(--color-danger)",
                      }}
                    >
                      ${remaining.toFixed(2)}
                    </span>
                  </div>
                </>
              ) : (
                <p className={g.empty}>
                  Create some savings accounts first on the Savings page.
                </p>
              )}
            </div>
          </>
        );
      })()}

      {/* Combined summary when multiple people */}
      {salaries.filter((sal) => sal.amount > 0).length > 1 &&
        buckets.length > 0 && (
          <div className={g.panel}>
            <h2 style={{ margin: "0 0 0.75rem" }}>Combined Summary</h2>
            <div className={s.tableWrap}>
              <table className={g.table}>
                <thead>
                  <tr>
                    <th className={g.th}>Account</th>
                    {salaries
                      .filter((sal) => sal.amount > 0)
                      .map((sal) => (
                        <th key={sal.person} className={g.thRight}>
                          {sal.person}
                        </th>
                      ))}
                    <th className={g.thRight}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {buckets.map((bucket) => {
                    let bucketTotal = 0;
                    return (
                      <tr key={bucket.id}>
                        <td className={g.td}>{bucket.name}</td>
                        {salaries
                          .filter((sal) => sal.amount > 0)
                          .map((sal) => {
                            const alloc = getPersonAlloc(sal.person, bucket.id);
                            const actual = alloc?.actual || 0;
                            bucketTotal += actual;
                            return (
                              <td key={sal.person} className={g.tdRight}>
                                {actual ? `$${actual.toFixed(2)}` : "—"}
                              </td>
                            );
                          })}
                        <td className={g.tdRight} style={{ fontWeight: 600 }}>
                          {bucketTotal ? `$${bucketTotal.toFixed(2)}` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td className={g.totalLabel}>Total</td>
                    {salaries
                      .filter((sal) => sal.amount > 0)
                      .map((sal) => {
                        const allocs = getAllocsForPerson(sal.person);
                        const personTotal = allocs.reduce(
                          (sum, a) => sum + (a.actual || 0),
                          0,
                        );
                        return (
                          <td key={sal.person} className={g.totalValue}>
                            ${personTotal.toFixed(2)}
                          </td>
                        );
                      })}
                    <td className={g.totalValue}>
                      $
                      {salaries
                        .filter((sal) => sal.amount > 0)
                        .reduce((sum, sal) => {
                          const allocs = getAllocsForPerson(sal.person);
                          return (
                            sum +
                            allocs.reduce((acc, a) => acc + (a.actual || 0), 0)
                          );
                        }, 0)
                        .toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
    </section>
  );
}

export default SalaryPage;
