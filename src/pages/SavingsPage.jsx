import { useMemo, useState } from "react";
import CreateBucketModal from "../components/CreateBucketModal";
import CreateDistributionModal from "../components/CreateDistributionModal";
import DistributionPanel from "../components/DistributionPanel";
import SavingsActionPanel from "../components/SavingsActionPanel";
import EmptyState from "../components/EmptyState";
import g from "../styles/shared.module.css";
import s from "../styles/SavingsPage.module.css";

function SavingsPage({
  people,
  buckets,
  setBuckets,
  distributions,
  setDistributions,
}) {
  const [isCreateBucketOpen, setIsCreateBucketOpen] = useState(false);
  const [isDistModalOpen, setIsDistModalOpen] = useState(false);
  const [editingDist, setEditingDist] = useState(null);
  const [showManage, setShowManage] = useState(false);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [expandedHistory, setExpandedHistory] = useState(null);
  const [showChangeLog, setShowChangeLog] = useState(false);

  function handleCreateBucket(name, description) {
    if (!name.trim()) return;

    const newBucket = {
      id: crypto.randomUUID(),
      name: name.trim(),
      description: description.trim(),
      amount: 0,
      deposits: [],
    };

    setBuckets((prev) => [...prev, newBucket]);
  }

  function handleDeposit(bucketId, deposit) {
    setBuckets((prev) =>
      prev.map((bucket) =>
        bucket.id === bucketId
          ? {
              ...bucket,
              amount: bucket.amount + deposit.amount,
              deposits: [deposit, ...bucket.deposits],
            }
          : bucket,
      ),
    );
  }

  function handleWithdraw(bucketId, withdrawal) {
    setBuckets((prev) =>
      prev.map((bucket) =>
        bucket.id === bucketId
          ? {
              ...bucket,
              amount: bucket.amount - withdrawal.amount,
              deposits: [
                { ...withdrawal, amount: -withdrawal.amount },
                ...bucket.deposits,
              ],
            }
          : bucket,
      ),
    );
  }

  function handleDelete(bucketId) {
    setBuckets((prev) => prev.filter((b) => b.id !== bucketId));
  }

  function handleRename(bucketId, newName) {
    setBuckets((prev) =>
      prev.map((b) => (b.id === bucketId ? { ...b, name: newName } : b)),
    );
  }

  function handleTransfer(fromId, toId, amount) {
    const now = new Date().toISOString();
    const toBucket = buckets.find((b) => b.id === toId);
    const fromBucket = buckets.find((b) => b.id === fromId);
    setBuckets((prev) =>
      prev.map((bucket) => {
        if (bucket.id === fromId) {
          return {
            ...bucket,
            amount: bucket.amount - amount,
            deposits: [
              {
                amount: -amount,
                note: `Transfer to ${toBucket?.name}`,
                date: now,
              },
              ...bucket.deposits,
            ],
          };
        }
        if (bucket.id === toId) {
          return {
            ...bucket,
            amount: bucket.amount + amount,
            deposits: [
              { amount, note: `Transfer from ${fromBucket?.name}`, date: now },
              ...bucket.deposits,
            ],
          };
        }
        return bucket;
      }),
    );
  }

  const totalSavings = useMemo(
    () => buckets.reduce((sum, bucket) => sum + bucket.amount, 0),
    [buckets],
  );

  const allocationsByPerson = useMemo(() => {
    const map = {};
    for (const p of people) map[p] = {};
    for (const bucket of buckets) {
      for (const d of bucket.deposits || []) {
        if (d.person && map[d.person]) {
          map[d.person][bucket.name] =
            (map[d.person][bucket.name] || 0) + d.amount;
        }
      }
    }
    return map;
  }, [buckets, people]);

  const changeLog = useMemo(() => {
    const entries = [];
    for (const bucket of buckets) {
      for (const d of bucket.deposits || []) {
        entries.push({
          account: bucket.name,
          amount: d.amount,
          person: d.person || null,
          note: d.note || "",
          date: d.date || null,
        });
      }
    }
    entries.sort((a, b) => {
      if (a.date && b.date) return new Date(b.date) - new Date(a.date);
      if (a.date) return -1;
      return 1;
    });
    return entries;
  }, [buckets]);

  function handleSaveDistribution(dist) {
    setDistributions((prev) => {
      const idx = prev.findIndex((d) => d.id === dist.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = dist;
        return updated;
      }
      return [...prev, dist];
    });
    setEditingDist(null);
  }

  function handleRunDistribution(distId) {
    const dist = distributions.find((d) => d.id === distId);
    if (!dist) return;
    const now = new Date().toISOString();
    setBuckets((prev) =>
      prev.map((bucket) => {
        const alloc = dist.allocations.find((a) => a.bucketId === bucket.id);
        if (!alloc) return bucket;
        return {
          ...bucket,
          amount: bucket.amount + alloc.amount,
          deposits: [
            {
              amount: alloc.amount,
              note: `Savings plan: ${dist.name}`,
              date: now,
            },
            ...bucket.deposits,
          ],
        };
      }),
    );
  }

  function handleDeleteDistribution(distId) {
    setDistributions((prev) => prev.filter((d) => d.id !== distId));
  }

  return (
    <section>
      <div className={s.topBar}>
        <h1 style={{ margin: 0, flex: 1 }}>Savings</h1>
        <button onClick={() => setIsCreateBucketOpen(true)}>
          + New Account
        </button>
        {buckets.length > 0 && (
          <button
            onClick={() => {
              setEditingDist(null);
              setIsDistModalOpen(true);
            }}
          >
            + New Savings Plan
          </button>
        )}
      </div>

      <CreateBucketModal
        isOpen={isCreateBucketOpen}
        onClose={() => setIsCreateBucketOpen(false)}
        existingNames={buckets.map((b) => b.name)}
        onCreate={({ name, description }) => {
          handleCreateBucket(name, description);
        }}
      />

      <CreateDistributionModal
        isOpen={isDistModalOpen}
        onClose={() => {
          setIsDistModalOpen(false);
          setEditingDist(null);
        }}
        buckets={buckets}
        existing={editingDist}
        onCreate={handleSaveDistribution}
      />

      {buckets.length === 0 && (
        <EmptyState
          icon="🏦"
          title="No savings accounts yet"
          description="Create your first account to start tracking where your money goes."
        />
      )}

      {buckets.length > 0 && (
        <>
          {/* Summary banner — full width */}
          <div className={`${g.panel} ${s.summaryPanel}`}>
            <p className={s.totalLabel}>Total Savings</p>
            <p className={s.totalBanner}>${totalSavings.toFixed(2)}</p>
            <div className={s.bucketGrid}>
              {buckets.map((b) => (
                <div key={b.id} className={s.bucketChip}>
                  <span className={s.bucketChipName}>{b.name}</span>
                  <span className={s.bucketChipAmount}>
                    ${b.amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {people.some((p) =>
              buckets.some(
                (b) => (allocationsByPerson[p]?.[b.name] || 0) !== 0,
              ),
            ) && (
              <>
                <h3 className={s.allocHeading}>Balance by Person</h3>
                <div className={g.overflowX}>
                  <table className={g.table}>
                    <thead>
                      <tr>
                        <th className={g.th}></th>
                        {buckets.map((b) => (
                          <th key={b.id} className={g.thRight}>
                            {b.name}
                          </th>
                        ))}
                        <th className={g.thRight}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {people.map((person) => {
                        const rowTotal = buckets.reduce(
                          (sum, b) =>
                            sum + (allocationsByPerson[person]?.[b.name] || 0),
                          0,
                        );
                        return (
                          <tr key={person}>
                            <td className={g.tdBold}>{person}</td>
                            {buckets.map((b) => {
                              const amt =
                                allocationsByPerson[person]?.[b.name] || 0;
                              return (
                                <td key={b.id} className={g.tdRight}>
                                  {amt !== 0 ? `$${amt.toFixed(2)}` : "–"}
                                </td>
                              );
                            })}
                            <td
                              className={g.tdRight}
                              style={{ fontWeight: "bold" }}
                            >
                              ${rowTotal.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {/* Change log — hideable */}
          {changeLog.length > 0 && (
            <div className={s.changeLogSection}>
              <button
                className={s.changeLogToggle}
                onClick={() => setShowChangeLog(!showChangeLog)}
              >
                {showChangeLog ? "Hide" : "Show"} Change History (
                {changeLog.length})
              </button>

              {showChangeLog && (
                <div className={g.overflowX}>
                  <table className={g.table}>
                    <thead>
                      <tr>
                        <th className={g.th}>Date</th>
                        <th className={g.th}>Account</th>
                        <th className={g.th}>Person</th>
                        <th className={g.th}>Note</th>
                        <th className={g.thRight}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {changeLog.map((entry, i) => (
                        <tr key={i}>
                          <td className={g.td} style={{ whiteSpace: "nowrap" }}>
                            {entry.date
                              ? new Date(entry.date).toLocaleDateString()
                              : "–"}
                          </td>
                          <td className={g.td}>{entry.account}</td>
                          <td className={g.td}>{entry.person || "–"}</td>
                          <td className={g.td}>{entry.note || "–"}</td>
                          <td
                            className={g.tdRight}
                            style={{
                              color: entry.amount >= 0 ? "#81c784" : "#e57373",
                              fontWeight: 600,
                            }}
                          >
                            {entry.amount >= 0 ? "+" : "−"}$
                            {Math.abs(entry.amount).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Actions side by side */}
          <div className={s.columns}>
            <SavingsActionPanel
              buckets={buckets}
              people={people}
              onDeposit={handleDeposit}
              onWithdraw={handleWithdraw}
              onTransfer={handleTransfer}
            />
            <div />
          </div>

          {/* Manage buckets — collapsible */}
          <div className={s.manageSection}>
            <button
              className={s.manageToggle}
              onClick={() => setShowManage(!showManage)}
            >
              {showManage ? "Hide" : "Manage"} Accounts ▾
            </button>

            {showManage && (
              <div className={g.panel} style={{ marginTop: "0.5rem" }}>
                {buckets.map((bucket) => (
                  <div key={bucket.id}>
                    <div className={s.bucketRow}>
                      {renamingId === bucket.id ? (
                        <form
                          className={s.renameForm}
                          onSubmit={(e) => {
                            e.preventDefault();
                            if (
                              renameValue.trim() &&
                              renameValue.trim() !== bucket.name
                            ) {
                              handleRename(bucket.id, renameValue.trim());
                            }
                            setRenamingId(null);
                          }}
                        >
                          <input
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            maxLength={50}
                            autoFocus
                          />
                          <button type="submit" className={g.actionBtn}>
                            Save
                          </button>
                          <button
                            type="button"
                            className={g.actionBtn}
                            onClick={() => setRenamingId(null)}
                          >
                            Cancel
                          </button>
                        </form>
                      ) : (
                        <>
                          <div className={s.bucketName}>
                            {bucket.name}
                            {bucket.description && (
                              <span className={s.bucketDesc}>
                                {" "}
                                — {bucket.description}
                              </span>
                            )}
                          </div>
                          <span className={s.bucketBalance}>
                            ${bucket.amount.toFixed(2)}
                          </span>
                          <div className={s.bucketActions}>
                            <button
                              className={g.actionBtn}
                              onClick={() => {
                                setRenamingId(bucket.id);
                                setRenameValue(bucket.name);
                              }}
                            >
                              Rename
                            </button>
                            <button
                              className={s.historyToggle}
                              onClick={() =>
                                setExpandedHistory(
                                  expandedHistory === bucket.id
                                    ? null
                                    : bucket.id,
                                )
                              }
                            >
                              History
                            </button>
                            {confirmDeleteId === bucket.id ? (
                              <>
                                <button
                                  className={g.actionBtnDangerBold}
                                  onClick={() => {
                                    handleDelete(bucket.id);
                                    setConfirmDeleteId(null);
                                  }}
                                >
                                  Yes, delete
                                </button>
                                <button
                                  className={g.actionBtn}
                                  onClick={() => setConfirmDeleteId(null)}
                                >
                                  No
                                </button>
                              </>
                            ) : (
                              <button
                                className={g.actionBtnDanger}
                                onClick={() => setConfirmDeleteId(bucket.id)}
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {expandedHistory === bucket.id &&
                      bucket.deposits.length > 0 && (
                        <ul
                          style={{
                            listStyle: "none",
                            padding: "0 0 0.5rem 0.5rem",
                            margin: 0,
                            fontSize: "0.8rem",
                          }}
                        >
                          {bucket.deposits.slice(0, 10).map((d, i) => (
                            <li
                              key={i}
                              style={{
                                padding: "0.2rem 0",
                                color: "rgba(255,255,255,0.5)",
                              }}
                            >
                              <span
                                style={{
                                  color: d.amount >= 0 ? "#2a7d2a" : "#c00",
                                }}
                              >
                                {d.amount >= 0 ? "+" : "−"}$
                                {Math.abs(d.amount).toFixed(2)}
                              </span>{" "}
                              {d.person && <strong>{d.person}</strong>}
                              {d.person && d.note && " · "}
                              {d.note}
                              {d.date &&
                                ` · ${new Date(d.date).toLocaleDateString()}`}
                            </li>
                          ))}
                          {bucket.deposits.length > 10 && (
                            <li
                              style={{
                                color: "rgba(255,255,255,0.3)",
                                padding: "0.2rem 0",
                              }}
                            >
                              …and {bucket.deposits.length - 10} more
                            </li>
                          )}
                        </ul>
                      )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <DistributionPanel
            distributions={distributions}
            buckets={buckets}
            onRun={handleRunDistribution}
            onEdit={(id) => {
              const dist = distributions.find((d) => d.id === id);
              setEditingDist(dist);
              setIsDistModalOpen(true);
            }}
            onDelete={handleDeleteDistribution}
          />
        </>
      )}
    </section>
  );
}

export default SavingsPage;
