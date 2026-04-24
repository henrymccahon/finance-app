import { useState, useEffect } from "react";
import "./App.css";
import s from "./styles/App.module.css";
import g from "./styles/shared.module.css";
import SavingsPage from "./pages/SavingsPage";
import ExpensesPage from "./pages/ExpensesPage";
import ReconciliationPage from "./pages/ReconciliationPage";
import SalaryPage from "./pages/SalaryPage";
import LoginPage from "./pages/LoginPage";
import { useAuth } from "./contexts/AuthContext";
import useFirestoreState from "./hooks/useFirestoreState";

const DEFAULT_PEOPLE = ["Person 1"];
const DEFAULT_CATEGORIES = [
  "Rent",
  "Utilities",
  "Transport",
  "Insurance",
  "Subscriptions",
  "Food",
  "Health",
  "Other",
];
const VALID_PAGES = ["savings", "expenses", "reconciliation", "salary"];

function getInitialPage() {
  const hash = window.location.hash.replace("#", "");
  return VALID_PAGES.includes(hash) ? hash : "savings";
}

function App() {
  const { user, loading, logout } = useAuth();
  const [page, setPage] = useState(getInitialPage);
  const uid = user?.uid;

  useEffect(() => {
    window.location.hash = page;
  }, [page]);

  useEffect(() => {
    function onHashChange() {
      const hash = window.location.hash.replace("#", "");
      if (VALID_PAGES.includes(hash)) setPage(hash);
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  // Each piece of state is its own Firestore document
  const [people, setPeople, peopleLoaded, peopleErr, peopleSaving] =
    useFirestoreState(uid, "people", DEFAULT_PEOPLE);
  const [buckets, setBuckets, bucketsLoaded, bucketsErr, bucketsSaving] =
    useFirestoreState(uid, "buckets", []);
  const [distributions, setDistributions, distLoaded, distErr, distSaving] =
    useFirestoreState(uid, "distributions", []);
  const [expenses, setExpenses, expensesLoaded, expensesErr, expensesSaving] =
    useFirestoreState(uid, "expenses", []);
  const [categories, setCategories, catLoaded, catErr, catSaving] =
    useFirestoreState(uid, "categories", DEFAULT_CATEGORIES);
  const [transactions, setTransactions, txnLoaded, txnErr, txnSaving] =
    useFirestoreState(uid, "transactions", []);
  const [
    processedHistory,
    setProcessedHistory,
    histLoaded,
    histErr,
    histSaving,
  ] = useFirestoreState(uid, "processedHistory", []);
  const [salaryConfig, setSalaryConfig, salaryLoaded, salaryErr, salarySaving] =
    useFirestoreState(uid, "salaryConfig", { salaries: [], allocations: [] });

  const loaded =
    peopleLoaded &&
    bucketsLoaded &&
    distLoaded &&
    expensesLoaded &&
    catLoaded &&
    txnLoaded &&
    histLoaded &&
    salaryLoaded;
  const saving =
    peopleSaving ||
    bucketsSaving ||
    distSaving ||
    expensesSaving ||
    catSaving ||
    txnSaving ||
    histSaving ||
    salarySaving;
  const firebaseError =
    peopleErr ||
    bucketsErr ||
    distErr ||
    expensesErr ||
    catErr ||
    txnErr ||
    histErr ||
    salaryErr;

  // UI-only state
  const [isEditingNames, setIsEditingNames] = useState(false);
  const [nameInputs, setNameInputs] = useState(DEFAULT_PEOPLE);
  const [removalWarning, setRemovalWarning] = useState(null); // { removed, dataCounts, reassignMap, trimmed }

  if (loading) return <div className={s.loading}>Loading your account…</div>;
  if (!user) return <LoginPage />;
  if (!loaded) return <div className={s.loading}>Loading your data…</div>;

  function getDataCountsForPerson(person) {
    const expenseCount = expenses.filter(
      (e) =>
        e.assignedTo === person ||
        (e.assignedTo === "Shared" && e.splits?.[person]),
    ).length;
    const txnCount = transactions.filter(
      (t) =>
        t.paidBy === person || (t.paidBy === "Shared" && t.splits?.[person]),
    ).length;
    const depositCount = buckets.reduce(
      (sum, b) =>
        sum + (b.deposits || []).filter((d) => d.person === person).length,
      0,
    );
    return {
      expenseCount,
      txnCount,
      depositCount,
      total: expenseCount + txnCount + depositCount,
    };
  }

  function handleSaveNames(e) {
    e.preventDefault();
    const trimmed = nameInputs.map((n) => n.trim()).filter(Boolean);
    if (trimmed.length < 1) return;

    const removed = people.filter((p) => !trimmed.includes(p));
    if (removed.length === 0) {
      setPeople(trimmed);
      setIsEditingNames(false);
      return;
    }

    const dataCounts = {};
    let hasData = false;
    for (const p of removed) {
      dataCounts[p] = getDataCountsForPerson(p);
      if (dataCounts[p].total > 0) hasData = true;
    }

    if (!hasData) {
      setPeople(trimmed);
      setIsEditingNames(false);
      return;
    }

    const reassignMap = {};
    for (const p of removed) {
      if (dataCounts[p].total > 0) reassignMap[p] = trimmed[0];
    }
    setRemovalWarning({ removed, dataCounts, reassignMap, trimmed });
  }

  function handleConfirmRemoval() {
    if (!removalWarning) return;
    const { reassignMap, trimmed } = removalWarning;

    // Reassign expenses
    setExpenses((prev) =>
      prev.map((exp) => {
        let updated = { ...exp };
        if (reassignMap[exp.assignedTo]) {
          updated.assignedTo = reassignMap[exp.assignedTo];
        }
        if (exp.assignedTo === "Shared" && exp.splits) {
          const newSplits = {};
          for (const [p, pct] of Object.entries(exp.splits)) {
            const target = reassignMap[p] || p;
            newSplits[target] = (newSplits[target] || 0) + pct;
          }
          updated.splits = newSplits;
        }
        return updated;
      }),
    );

    // Reassign transactions
    setTransactions((prev) =>
      prev.map((txn) => {
        let updated = { ...txn };
        if (reassignMap[txn.paidBy]) {
          updated.paidBy = reassignMap[txn.paidBy];
        }
        if (txn.paidBy === "Shared" && txn.splits) {
          const newSplits = {};
          for (const [p, pct] of Object.entries(txn.splits)) {
            const target = reassignMap[p] || p;
            newSplits[target] = (newSplits[target] || 0) + pct;
          }
          updated.splits = newSplits;
        }
        return updated;
      }),
    );

    // Reassign bucket deposits
    setBuckets((prev) =>
      prev.map((bucket) => ({
        ...bucket,
        deposits: (bucket.deposits || []).map((d) =>
          reassignMap[d.person] ? { ...d, person: reassignMap[d.person] } : d,
        ),
      })),
    );

    setPeople(trimmed);
    setRemovalWarning(null);
    setIsEditingNames(false);
  }

  function handleExportData() {
    const data = {
      exportDate: new Date().toISOString(),
      people,
      buckets,
      distributions,
      expenses,
      categories,
      transactions,
      processedHistory,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finance-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleLoadSampleData() {
    const now = new Date().toISOString();
    setPeople(["Alice", "Bob"]);
    setCategories([
      "Rent",
      "Utilities",
      "Transport",
      "Insurance",
      "Subscriptions",
      "Food",
      "Health",
      "Other",
    ]);
    setBuckets([
      {
        id: crypto.randomUUID(),
        name: "Emergency Fund",
        amount: 4200,
        deposits: [
          { amount: 2000, note: "Initial deposit", person: "Alice", date: now },
          { amount: 1500, note: "Bonus", person: "Bob", date: now },
          { amount: 700, note: "Top up", person: "Alice", date: now },
        ],
      },
      {
        id: crypto.randomUUID(),
        name: "Holiday",
        amount: 1850,
        deposits: [
          {
            amount: 1000,
            note: "Savings transfer",
            person: "Alice",
            date: now,
          },
          { amount: 850, note: "Birthday money", person: "Bob", date: now },
        ],
      },
      {
        id: crypto.randomUUID(),
        name: "Car Maintenance",
        amount: 600,
        deposits: [
          { amount: 400, note: "Monthly", person: "Bob", date: now },
          { amount: 200, note: "Monthly", person: "Alice", date: now },
        ],
      },
    ]);
    setExpenses([
      {
        id: crypto.randomUUID(),
        title: "Rent",
        amount: 2400,
        category: "Rent",
        frequency: "monthly",
        assignedTo: "Shared",
        splits: { Alice: 50, Bob: 50 },
      },
      {
        id: crypto.randomUUID(),
        title: "Electricity",
        amount: 180,
        category: "Utilities",
        frequency: "monthly",
        assignedTo: "Shared",
        splits: { Alice: 50, Bob: 50 },
      },
      {
        id: crypto.randomUUID(),
        title: "Internet",
        amount: 89,
        category: "Utilities",
        frequency: "monthly",
        assignedTo: "Shared",
        splits: { Alice: 50, Bob: 50 },
      },
      {
        id: crypto.randomUUID(),
        title: "Car Insurance",
        amount: 1200,
        category: "Insurance",
        frequency: "yearly",
        assignedTo: "Bob",
      },
      {
        id: crypto.randomUUID(),
        title: "Health Insurance",
        amount: 320,
        category: "Insurance",
        frequency: "monthly",
        assignedTo: "Shared",
        splits: { Alice: 60, Bob: 40 },
      },
      {
        id: crypto.randomUUID(),
        title: "Netflix",
        amount: 22.99,
        category: "Subscriptions",
        frequency: "monthly",
        assignedTo: "Shared",
        splits: { Alice: 50, Bob: 50 },
      },
      {
        id: crypto.randomUUID(),
        title: "Spotify",
        amount: 16.99,
        category: "Subscriptions",
        frequency: "monthly",
        assignedTo: "Alice",
      },
      {
        id: crypto.randomUUID(),
        title: "Gym Membership",
        amount: 59,
        category: "Health",
        frequency: "fortnightly",
        assignedTo: "Bob",
      },
      {
        id: crypto.randomUUID(),
        title: "Bus Pass",
        amount: 45,
        category: "Transport",
        frequency: "weekly",
        assignedTo: "Alice",
      },
      {
        id: crypto.randomUUID(),
        title: "Groceries",
        amount: 200,
        category: "Food",
        frequency: "weekly",
        assignedTo: "Shared",
        splits: { Alice: 55, Bob: 45 },
      },
    ]);
    setTransactions([
      {
        id: crypto.randomUUID(),
        description: "Woolworths groceries",
        amount: 142.5,
      },
      {
        id: crypto.randomUUID(),
        description: "Chemist Warehouse",
        amount: 38.95,
      },
      {
        id: crypto.randomUUID(),
        description: "Uber Eats Friday",
        amount: 52.0,
      },
      {
        id: crypto.randomUUID(),
        description: "Bunnings supplies",
        amount: 87.3,
      },
      {
        id: crypto.randomUUID(),
        description: "JB Hi-Fi headphones",
        amount: 129.0,
      },
      { id: crypto.randomUUID(), description: "Coffee catch-up", amount: 14.5 },
      { id: crypto.randomUUID(), description: "Petrol", amount: 95.2 },
    ]);
    setDistributions([]);
    setProcessedHistory([]);
  }

  return (
    <div>
      {firebaseError && <div className={s.errorBanner}>⚠ {firebaseError}</div>}
      {saving && <div className={s.savingIndicator}>Saving…</div>}

      {removalWarning && (
        <div className={g.overlay}>
          <div
            className={g.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="removal-warning-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="removal-warning-title">Reassign Data</h2>
            <p
              style={{
                fontSize: "0.9rem",
                color: "rgba(255,255,255,0.7)",
                margin: "0 0 1rem",
              }}
            >
              The following people have data assigned. Choose who to reassign
              their items to.
            </p>
            {removalWarning.removed
              .filter((p) => removalWarning.dataCounts[p]?.total > 0)
              .map((person) => {
                const c = removalWarning.dataCounts[person];
                const parts = [];
                if (c.expenseCount)
                  parts.push(
                    `${c.expenseCount} expense${c.expenseCount > 1 ? "s" : ""}`,
                  );
                if (c.txnCount)
                  parts.push(
                    `${c.txnCount} transaction${c.txnCount > 1 ? "s" : ""}`,
                  );
                if (c.depositCount)
                  parts.push(
                    `${c.depositCount} deposit${c.depositCount > 1 ? "s" : ""}`,
                  );
                return (
                  <div key={person} className={s.reassignRow}>
                    <div>
                      <strong>{person}</strong>
                      <span className={s.reassignCount}>
                        {parts.join(", ")}
                      </span>
                    </div>
                    <label className={s.reassignLabel}>
                      Reassign to
                      <select
                        value={removalWarning.reassignMap[person]}
                        onChange={(e) =>
                          setRemovalWarning((prev) => ({
                            ...prev,
                            reassignMap: {
                              ...prev.reassignMap,
                              [person]: e.target.value,
                            },
                          }))
                        }
                        className={g.inputBlock}
                        style={{ width: "auto", marginLeft: "0.5rem" }}
                      >
                        {removalWarning.trimmed.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                );
              })}
            <div className={g.actions}>
              <button type="button" onClick={() => setRemovalWarning(null)}>
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRemoval}
                className={g.actionBtnDangerBold}
              >
                Reassign &amp; Remove
              </button>
            </div>
          </div>
        </div>
      )}
      <nav className={s.nav} aria-label="Main navigation">
        <div className={s.tabs}>
          <button
            onClick={() => setPage("savings")}
            className={page === "savings" ? s.tabActive : s.tab}
          >
            Savings
          </button>
          <button
            onClick={() => setPage("expenses")}
            className={page === "expenses" ? s.tabActive : s.tab}
          >
            Expenses
          </button>
          <button
            onClick={() => setPage("reconciliation")}
            className={page === "reconciliation" ? s.tabActive : s.tab}
          >
            Settle Up
          </button>
          <button
            onClick={() => setPage("salary")}
            className={page === "salary" ? s.tabActive : s.tab}
          >
            Pay
          </button>
        </div>

        <div className={s.peopleBar}>
          {isEditingNames ? (
            <form onSubmit={handleSaveNames} className={s.nameForm}>
              {nameInputs.map((name, i) => (
                <span key={i} className={s.nameRow}>
                  <input
                    value={name}
                    onChange={(e) => {
                      const next = [...nameInputs];
                      next[i] = e.target.value;
                      setNameInputs(next);
                    }}
                    maxLength={30}
                    className={s.nameInput}
                  />
                  {nameInputs.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setNameInputs(nameInputs.filter((_, j) => j !== i))
                      }
                      className={s.removeBtn}
                      aria-label={`Remove ${name}`}
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
              {nameInputs.length < 10 && (
                <button
                  type="button"
                  onClick={() => setNameInputs([...nameInputs, ""])}
                  className={s.smallBtn}
                >
                  + Add
                </button>
              )}
              <button type="submit" className={s.smallBtn}>
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditingNames(false);
                  setNameInputs(people);
                }}
                className={s.smallBtn}
              >
                Cancel
              </button>
            </form>
          ) : (
            <span className={s.namesDisplay}>
              {people.length === 1
                ? people[0]
                : people.slice(0, -1).join(", ") +
                  " & " +
                  people[people.length - 1]}{" "}
              <button
                onClick={() => {
                  setNameInputs([...people]);
                  setIsEditingNames(true);
                }}
                className={s.smallBtn}
              >
                Edit
              </button>
              <button onClick={handleExportData} className={s.smallBtn}>
                Export
              </button>
              {["admin@test.com", "test@test.com"].includes(user?.email) && (
                <button onClick={handleLoadSampleData} className={s.smallBtn}>
                  Load Sample Data
                </button>
              )}
              <button onClick={logout} className={s.smallBtn}>
                Logout
              </button>
            </span>
          )}
        </div>
      </nav>

      {page === "savings" && (
        <SavingsPage
          people={people}
          buckets={buckets}
          setBuckets={setBuckets}
          distributions={distributions}
          setDistributions={setDistributions}
        />
      )}
      {page === "expenses" && (
        <ExpensesPage
          people={people}
          expenses={expenses}
          setExpenses={setExpenses}
          categories={categories}
          setCategories={setCategories}
        />
      )}
      {page === "reconciliation" && (
        <ReconciliationPage
          people={people}
          buckets={buckets}
          setBuckets={setBuckets}
          transactions={transactions}
          setTransactions={setTransactions}
          processedHistory={processedHistory}
          setProcessedHistory={setProcessedHistory}
        />
      )}
      {page === "salary" && (
        <SalaryPage
          people={people}
          salaryConfig={salaryConfig}
          setSalaryConfig={setSalaryConfig}
          buckets={buckets}
          expenses={expenses}
        />
      )}
    </div>
  );
}

export default App;
