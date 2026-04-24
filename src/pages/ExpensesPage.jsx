import { useMemo, useState } from "react";
import AddExpenseModal from "../components/AddExpenseModal";
import ExpenseItemRow from "../components/ExpenseItemRow";
import CategorySummary from "../components/CategorySummary";
import { getPersonShare } from "../utils/splits";
import { FREQUENCY_MULTIPLIERS } from "../utils/constants";
import s from "../styles/ExpensesPage.module.css";
import g from "../styles/shared.module.css";

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



function ExpensesPage({
  people,
  expenses,
  setExpenses,
  categories,
  setCategories,
}) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [filterPerson, setFilterPerson] = useState("");

  function handleAddExpense(expense) {
    setExpenses((prev) => [{ ...expense, id: crypto.randomUUID() }, ...prev]);
  }

  function handleUpdateExpense(updated) {
    setExpenses((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    setEditingExpense(null);
  }

  function handleDeleteExpense(id) {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }

  function handleAddCategory(name) {
    const trimmed = name.trim();
    if (trimmed && !categories.includes(trimmed)) {
      setCategories((prev) => [...prev, trimmed]);
    }
  }

  const monthlyTotal = useMemo(
    () =>
      expenses.reduce(
        (sum, e) => sum + e.amount * (FREQUENCY_MULTIPLIERS[e.frequency] || 1),
        0,
      ),
    [expenses],
  );

  const isSideBySide = filterPerson === "__sideBySide__";

  const filteredExpenses = useMemo(() => {
    if (!filterPerson || isSideBySide) return expenses;
    if (filterPerson === "Shared") {
      return expenses.filter((e) => e.assignedTo === "Shared");
    }
    // Show person's own expenses + shared expenses
    return expenses.filter(
      (e) => e.assignedTo === filterPerson || e.assignedTo === "Shared",
    );
  }, [expenses, filterPerson, isSideBySide]);

  function getShare(expense, person) {
    return getPersonShare(expense, person, people);
  }

  const filteredMonthlyTotal = useMemo(
    () =>
      filteredExpenses.reduce((sum, e) => {
        const amt =
          filterPerson && filterPerson !== "Shared" && !isSideBySide
            ? getShare(e, filterPerson)
            : e.amount;
        return sum + amt * (FREQUENCY_MULTIPLIERS[e.frequency] || 1);
      }, 0),
    [filteredExpenses, filterPerson, isSideBySide],
  );

  function getExpensesForPerson(person) {
    return expenses.filter(
      (e) => e.assignedTo === person || e.assignedTo === "Shared",
    );
  }

  function getMonthlyTotalForPerson(person) {
    return getExpensesForPerson(person).reduce((sum, e) => {
      const amt = getShare(e, person);
      return sum + amt * (FREQUENCY_MULTIPLIERS[e.frequency] || 1);
    }, 0);
  }

  const groupedByPerson = useMemo(() => {
    if (filterPerson && filterPerson !== "Shared") {
      // When filtered to a person, show all their expenses in one flat list
      return [[filterPerson, filteredExpenses]];
    }
    const groups = { Shared: [] };
    for (const p of people) groups[p] = [];
    for (const e of filteredExpenses) {
      const key = e.assignedTo || "Shared";
      if (!groups[key]) groups[key] = [];
      groups[key].push(e);
    }
    return Object.entries(groups).filter(([, items]) => items.length > 0);
  }, [filteredExpenses, people, filterPerson]);

  return (
    <section>
      <h1>Recurring Expenses</h1>

      <button
        onClick={() => {
          setEditingExpense(null);
          setIsAddOpen(true);
        }}
      >
        + Add Expense
      </button>

      <div className={s.filterBar}>
        <span className={s.filterLabel}>Show:</span>
        <button
          onClick={() => setFilterPerson("")}
          className={filterPerson === "" ? s.filterBtnActive : s.filterBtn}
        >
          All
        </button>
        <button
          onClick={() => setFilterPerson("Shared")}
          className={
            filterPerson === "Shared" ? s.filterBtnActive : s.filterBtn
          }
        >
          Shared
        </button>
        {people.map((p) => (
          <button
            key={p}
            onClick={() => setFilterPerson(p)}
            className={filterPerson === p ? s.filterBtnActive : s.filterBtn}
          >
            {p}
          </button>
        ))}
        <span className={s.filterLabel} style={{ marginLeft: "0.5rem" }}>
          |
        </span>
        <button
          onClick={() => setFilterPerson("__sideBySide__")}
          className={
            filterPerson === "__sideBySide__" ? s.filterBtnActive : s.filterBtn
          }
        >
          Side by Side
        </button>
      </div>

      <AddExpenseModal
        isOpen={isAddOpen || editingExpense !== null}
        onClose={() => {
          setIsAddOpen(false);
          setEditingExpense(null);
        }}
        onSave={editingExpense ? handleUpdateExpense : handleAddExpense}
        categories={categories}
        onAddCategory={handleAddCategory}
        existing={editingExpense}
        people={people}
      />

      {isSideBySide ? (
        <div className={s.sideBySide}>
          {people.map((person) => {
            const personExpenses = getExpensesForPerson(person);
            const personTotal = getMonthlyTotalForPerson(person);
            return (
              <div key={person} className={s.column}>
                <h2 className={s.columnHeading}>{person}</h2>
                <CategorySummary
                  expenses={personExpenses}
                  monthlyTotal={personTotal}
                  people={people}
                  filterPerson={person}
                  getPersonShare={getShare}
                />
                {personExpenses.length === 0 ? (
                  <p className={g.empty}>No expenses yet.</p>
                ) : (
                  <div className={s.list}>
                    {personExpenses.map((expense) => {
                      const displayAmt =
                        expense.assignedTo === "Shared"
                          ? getShare(expense, person)
                          : undefined;
                      return (
                        <ExpenseItemRow
                          key={expense.id}
                          expense={expense}
                          monthlyAmount={
                            expense.amount *
                            (FREQUENCY_MULTIPLIERS[expense.frequency] || 1)
                          }
                          displayAmount={displayAmt}
                          onEdit={() => setEditingExpense(expense)}
                          onDelete={() => handleDeleteExpense(expense.id)}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <>
          <CategorySummary
            expenses={filteredExpenses}
            monthlyTotal={filteredMonthlyTotal}
            people={people}
            filterPerson={filterPerson}
            getPersonShare={getShare}
          />

          {filteredExpenses.length === 0 ? (
            <p className={g.empty}>
              No recurring expenses{filterPerson ? ` for ${filterPerson}` : ""}{" "}
              added yet.
            </p>
          ) : (
            <div className={s.list}>
              {groupedByPerson.map(([person, items]) => (
                <div key={person}>
                  {!filterPerson && (
                    <h3 className={s.groupHeading}>{person}</h3>
                  )}
                  {items.map((expense) => {
                    const displayAmt =
                      filterPerson &&
                      filterPerson !== "Shared" &&
                      expense.assignedTo === "Shared"
                        ? getShare(expense, filterPerson)
                        : undefined;
                    return (
                      <ExpenseItemRow
                        key={expense.id}
                        expense={expense}
                        monthlyAmount={
                          expense.amount *
                          (FREQUENCY_MULTIPLIERS[expense.frequency] || 1)
                        }
                        displayAmount={displayAmt}
                        onEdit={() => setEditingExpense(expense)}
                        onDelete={() => handleDeleteExpense(expense.id)}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default ExpensesPage;
