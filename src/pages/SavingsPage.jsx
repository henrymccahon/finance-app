import { useMemo, useState } from "react";
import BucketItem from "../components/BucketItem";
import CreateBucketModal from "../components/CreateBucketModal";
import TransferModal from "../components/TransferModal";
import CreateDistributionModal from "../components/CreateDistributionModal";
import DistributionPanel from "../components/DistributionPanel";
import g from "../styles/shared.module.css";

function SavingsPage({ people, buckets, setBuckets, distributions, setDistributions }) {
  const [isCreateBucketOpen, setIsCreateBucketOpen] = useState(false);
  const [transferFrom, setTransferFrom] = useState(null);
  const [isDistModalOpen, setIsDistModalOpen] = useState(false);
  const [editingDist, setEditingDist] = useState(null);

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

  const contributionsByPerson = useMemo(() => {
    const map = {};
    for (const p of people) map[p] = {};
    for (const bucket of buckets) {
      for (const d of bucket.deposits) {
        if (d.person && d.amount > 0 && map[d.person]) {
          map[d.person][bucket.name] =
            (map[d.person][bucket.name] || 0) + d.amount;
        }
      }
    }
    return map;
  }, [buckets, people]);

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
              note: `Distribution: ${dist.name}`,
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
      <h1>Savings</h1>

      <button onClick={() => setIsCreateBucketOpen(true)}>+ New Bucket</button>
      {buckets.length > 0 && (
        <button
          onClick={() => {
            setEditingDist(null);
            setIsDistModalOpen(true);
          }}
          style={{ marginLeft: "0.5rem" }}
        >
          + New Distribution
        </button>
      )}

      <CreateBucketModal
        isOpen={isCreateBucketOpen}
        onClose={() => setIsCreateBucketOpen(false)}
        existingNames={buckets.map((b) => b.name)}
        onCreate={({ name, description }) => {
          handleCreateBucket(name, description);
        }}
      />

      <TransferModal
        isOpen={transferFrom !== null}
        onClose={() => setTransferFrom(null)}
        fromBucket={buckets.find((b) => b.id === transferFrom)}
        otherBuckets={buckets.filter((b) => b.id !== transferFrom)}
        onTransfer={(toId, amount) => {
          handleTransfer(transferFrom, toId, amount);
          setTransferFrom(null);
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

      {buckets.length > 0 && (
        <div className={g.panel}>
          <h2 style={{ margin: "0 0 0.75rem" }}>Summary</h2>
          <table className={g.table}>
            <thead>
              <tr>
                <th className={g.th}>Bucket</th>
                <th className={g.thRight}>Balance</th>
              </tr>
            </thead>
            <tbody>
              {buckets.map((b) => (
                <tr key={b.id}>
                  <td className={g.td}>{b.name}</td>
                  <td className={g.tdRight}>
                    ${b.amount.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className={g.totalLabel}>Total</td>
                <td className={g.totalValue}>${totalSavings.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>

          {buckets.length > 0 &&
            people.some((p) =>
              buckets.some((b) => (contributionsByPerson[p]?.[b.name] || 0) > 0),
            ) && (
              <>
                <h3 className={g.subheading}>Contributions</h3>
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
                          (s, b) => s + (contributionsByPerson[person]?.[b.name] || 0),
                          0,
                        );
                        return (
                          <tr key={person}>
                            <td className={g.tdBold}>{person}</td>
                            {buckets.map((b) => {
                              const amt = contributionsByPerson[person]?.[b.name] || 0;
                              return (
                                <td key={b.id} className={g.tdRight}>
                                  {amt > 0 ? `$${amt.toFixed(2)}` : "–"}
                                </td>
                              );
                            })}
                            <td className={g.tdRight} style={{ fontWeight: "bold" }}>
                              ${rowTotal.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td className={g.totalLabel}>Total</td>
                        {buckets.map((b) => {
                          const colTotal = people.reduce(
                            (s, p) => s + (contributionsByPerson[p]?.[b.name] || 0),
                            0,
                          );
                          return (
                            <td key={b.id} className={g.totalValue}>
                              {colTotal > 0 ? `$${colTotal.toFixed(2)}` : "–"}
                            </td>
                          );
                        })}
                        <td className={g.totalValue}>
                          ${people
                            .reduce(
                              (s, p) =>
                                s +
                                buckets.reduce(
                                  (bs, b) => bs + (contributionsByPerson[p]?.[b.name] || 0),
                                  0,
                                ),
                              0,
                            )
                            .toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            )}
        </div>
      )}

      {buckets.map((bucket) => (
        <BucketItem
          key={bucket.id}
          name={bucket.name}
          description={bucket.description}
          amount={bucket.amount}
          deposits={bucket.deposits}
          onDeposit={(deposit) => handleDeposit(bucket.id, deposit)}
          onWithdraw={(withdrawal) => handleWithdraw(bucket.id, withdrawal)}
          onDelete={() => handleDelete(bucket.id)}
          onRename={(newName) => handleRename(bucket.id, newName)}
          onTransfer={() => setTransferFrom(bucket.id)}
          canTransfer={buckets.length > 1}
          people={people}
        />
      ))}
    </section>
  );
}

export default SavingsPage;
