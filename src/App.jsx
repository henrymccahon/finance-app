import { useState, useEffect } from "react";
import "./App.css";
import s from "./styles/App.module.css";
import SavingsPage from "./pages/SavingsPage";
import ExpensesPage from "./pages/ExpensesPage";
import ReconciliationPage from "./pages/ReconciliationPage";
import LoginPage from "./pages/LoginPage";
import { useAuth } from "./contexts/AuthContext";
import useFirestoreState from "./hooks/useFirestoreState";

const DEFAULT_PEOPLE = ["Person 1", "Person 2"];
const DEFAULT_CATEGORIES = ["Rent", "Utilities", "Transport", "Insurance", "Subscriptions", "Food", "Health", "Other"];
const VALID_PAGES = ["savings", "expenses", "reconciliation"];

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
  const [people, setPeople, peopleLoaded, peopleErr, peopleSaving] = useFirestoreState(uid, "people", DEFAULT_PEOPLE);
  const [buckets, setBuckets, bucketsLoaded, bucketsErr, bucketsSaving] = useFirestoreState(uid, "buckets", []);
  const [distributions, setDistributions, distLoaded, distErr, distSaving] = useFirestoreState(uid, "distributions", []);
  const [expenses, setExpenses, expensesLoaded, expensesErr, expensesSaving] = useFirestoreState(uid, "expenses", []);
  const [categories, setCategories, catLoaded, catErr, catSaving] = useFirestoreState(uid, "categories", DEFAULT_CATEGORIES);
  const [transactions, setTransactions, txnLoaded, txnErr, txnSaving] = useFirestoreState(uid, "transactions", []);
  const [processedHistory, setProcessedHistory, histLoaded, histErr, histSaving] = useFirestoreState(uid, "processedHistory", []);

  const loaded = peopleLoaded && bucketsLoaded && distLoaded && expensesLoaded && catLoaded && txnLoaded && histLoaded;
  const saving = peopleSaving || bucketsSaving || distSaving || expensesSaving || catSaving || txnSaving || histSaving;
  const firebaseError = peopleErr || bucketsErr || distErr || expensesErr || catErr || txnErr || histErr;

  // UI-only state
  const [isEditingNames, setIsEditingNames] = useState(false);
  const [nameInputs, setNameInputs] = useState(DEFAULT_PEOPLE);

  if (loading) return <div className={s.loading}>Loading your account…</div>;
  if (!user) return <LoginPage />;
  if (!loaded) return <div className={s.loading}>Loading your data…</div>;

  function handleSaveNames(e) {
    e.preventDefault();
    const trimmed = nameInputs.map((n) => n.trim()).filter(Boolean);
    if (trimmed.length === 2) {
      setPeople(trimmed);
    }
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
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finance-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      {firebaseError && (
        <div className={s.errorBanner}>⚠ {firebaseError}</div>
      )}
      {saving && (
        <div className={s.savingIndicator}>Saving…</div>
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
            Reconciliation
          </button>
        </div>

        <div className={s.peopleBar}>
          {isEditingNames ? (
            <form onSubmit={handleSaveNames} className={s.nameForm}>
              <input
                value={nameInputs[0]}
                onChange={(e) =>
                  setNameInputs([e.target.value, nameInputs[1]])
                }
                maxLength={30}
                className={s.nameInput}
              />
              <input
                value={nameInputs[1]}
                onChange={(e) =>
                  setNameInputs([nameInputs[0], e.target.value])
                }
                maxLength={30}
                className={s.nameInput}
              />
              <button type="submit" className={s.smallBtn}>Save</button>
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
              {people[0]} &amp; {people[1]}{" "}
              <button
                onClick={() => {
                  setNameInputs(people);
                  setIsEditingNames(true);
                }}
                className={s.smallBtn}
              >
                Edit
              </button>
              <button onClick={handleExportData} className={s.smallBtn}>
                Export
              </button>
              <button onClick={logout} className={s.smallBtn}>
                Logout
              </button>
            </span>
          )}
        </div>
      </nav>

      {page === "savings" && <SavingsPage people={people} buckets={buckets} setBuckets={setBuckets} distributions={distributions} setDistributions={setDistributions} />}
      {page === "expenses" && <ExpensesPage people={people} expenses={expenses} setExpenses={setExpenses} categories={categories} setCategories={setCategories} />}
      {page === "reconciliation" && <ReconciliationPage people={people} buckets={buckets} setBuckets={setBuckets} transactions={transactions} setTransactions={setTransactions} processedHistory={processedHistory} setProcessedHistory={setProcessedHistory} />}
    </div>
  );
}

export default App;