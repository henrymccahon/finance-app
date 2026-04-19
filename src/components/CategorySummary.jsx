import { useMemo } from "react";
import { getSplits } from "../utils/splits";
import g from "../styles/shared.module.css";

function CategorySummary({ expenses, monthlyTotal, frequencyMultipliers, people, filterPerson, getPersonShare }) {
  const byCategory = useMemo(() => {
    const map = {};
    for (const e of expenses) {
      const base = filterPerson && filterPerson !== "Shared" && e.assignedTo === "Shared"
        ? getPersonShare(e, filterPerson)
        : e.amount;
      const monthly = base * (frequencyMultipliers[e.frequency] || 1);
      map[e.category] = (map[e.category] || 0) + monthly;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [expenses, frequencyMultipliers, filterPerson, getPersonShare]);

  const byPerson = useMemo(() => {
    const map = {};
    for (const p of people) map[p] = 0;
    for (const e of expenses) {
      if (e.assignedTo === "Shared") {
        const sp = getSplits(e, people);
        const monthly = e.amount * (frequencyMultipliers[e.frequency] || 1);
        for (const p of people) {
          map[p] = (map[p] || 0) + monthly * (sp[p] ?? 0) / 100;
        }
      } else {
        const monthly = e.amount * (frequencyMultipliers[e.frequency] || 1);
        map[e.assignedTo] = (map[e.assignedTo] || 0) + monthly;
      }
    }
    return Object.entries(map).filter(([, amt]) => amt > 0);
  }, [expenses, frequencyMultipliers, people]);

  if (byCategory.length === 0) return null;

  return (
    <div className={g.panel}>
      <h2 style={{ margin: "0 0 0.75rem" }}>Monthly Breakdown</h2>
      <table className={g.table}>
        <thead>
          <tr>
            <th className={g.th}>Category</th>
            <th className={g.thRight}>Monthly</th>
            <th className={g.thRight}>%</th>
          </tr>
        </thead>
        <tbody>
          {byCategory.map(([cat, amt]) => (
            <tr key={cat}>
              <td className={g.td}>{cat}</td>
              <td className={g.tdRight}>
                ${amt.toFixed(2)}
              </td>
              <td className={g.tdRight} style={{ color: "#888" }}>
                {monthlyTotal > 0 ? ((amt / monthlyTotal) * 100).toFixed(1) : 0}%
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td className={g.totalLabel}>Total / month</td>
            <td className={g.totalValueRed}>${monthlyTotal.toFixed(2)}</td>
            <td className={g.totalValueMuted}>100%</td>
          </tr>
        </tfoot>
      </table>

      {byPerson.length > 0 && !filterPerson && (
        <>
          <h3 className={g.subheading}>Per Person (incl. shared splits)</h3>
          <table className={g.table}>
            <thead>
              <tr>
                <th className={g.th}>Person</th>
                <th className={g.thRight}>Monthly</th>
              </tr>
            </thead>
            <tbody>
              {byPerson.map(([person, amt]) => (
                <tr key={person}>
                  <td className={g.td}>{person}</td>
                  <td className={g.tdRight}>
                    ${amt.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

export default CategorySummary;
