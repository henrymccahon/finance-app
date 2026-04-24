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
 */
export function getPersonShare(item, person, people) {
  const assignedField = item.assignedTo ?? item.paidBy;
  if (assignedField !== "Shared") return item.amount;
  const splits = getSplits(item, people);
  return (item.amount * (splits[person] ?? 0)) / 100;
}
