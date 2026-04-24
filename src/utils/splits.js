/**
 * Build an equal-split map for the given people.
 */
export function equalSplits(people) {
  const base = Math.floor((100 / people.length) * 100) / 100;
  const splits = {};
  people.forEach((p, i) => {
    splits[p] =
      i === people.length - 1
        ? Math.round((100 - base * (people.length - 1)) * 100) / 100
        : base;
  });
  return splits;
}

/**
 * Resolve the per-person split percentages for an item.
 * Handles both the new `splits` format and legacy `splitPercent`.
 */
export function getSplits(item, people) {
  if (item.splits) return item.splits;
  if (item.splitPercent != null && people.length >= 2) {
    return {
      [people[0]]: item.splitPercent,
      [people[1]]: 100 - item.splitPercent,
    };
  }
  return equalSplits(people);
}

/**
 * Get one person's dollar share of a shared item.
 * Uses floor-and-remainder to avoid double-rounding pennies.
 */
export function getPersonShare(item, person, people) {
  const assignedField = item.assignedTo ?? item.paidBy;
  if (assignedField !== "Shared") return item.amount;
  const splits = getSplits(item, people);
  const pct = splits[person] ?? 0;

  // Find all people in this split, sorted so the remainder goes to the last
  const entries = Object.entries(splits).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  const lastPerson = entries[entries.length - 1]?.[0];

  if (person === lastPerson) {
    // Last person absorbs remainder so total === item.amount exactly
    const othersTotal = entries
      .filter(([p]) => p !== lastPerson)
      .reduce(
        (sum, [, pctVal]) =>
          sum + Math.floor(item.amount * pctVal) / 100,
        0,
      );
    return Math.round((item.amount - othersTotal) * 100) / 100;
  }

  return Math.floor(item.amount * pct) / 100;
}
