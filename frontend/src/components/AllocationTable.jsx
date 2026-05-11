import React from "react";

export default function AllocationTable({
  allocation, costs, supply, demand,
  dummySource = false, dummyDest = false, blocked = [],
  label = "",
}) {
  const m = allocation.length;
  const n = m > 0 ? allocation[0].length : 0;

  const isBlk = (i, j) => blocked.some(([a, b]) => a === i && b === j);

  const cellClass = (val, i, j, isDummyR, isDummyC) => {
    if (isDummyR || isDummyC) return "alloc-cell dummy";
    if (val > 0) return "alloc-cell active";
    return "alloc-cell zero";
  };

  return (
    <div className="alloc-wrap">
      {label && <p className="alloc-label">{label}</p>}
      <div className="grid-scroll">
        <table className="alloc-table" aria-label={`Allocation table${label ? ": " + label : ""}`}>
          <thead>
            <tr>
              <th className="mat-corner" />
              {Array.from({ length: n }, (_, j) => {
                const isDummyC = dummyDest && j === n - 1;
                return (
                  <th key={j} className={`mat-col-head${isDummyC ? " dummy-head" : ""}`}>
                    {isDummyC ? "★ Dummy" : `D${j + 1}`}
                    <span className="th-sub">need {demand[j] ?? "?"}</span>
                  </th>
                );
              })}
              <th className="mat-col-head">Supply</th>
            </tr>
          </thead>
          <tbody>
            {allocation.map((row, i) => {
              const isDummyR = dummySource && i === m - 1;
              return (
                <tr key={i}>
                  <td className={`mat-row-head${isDummyR ? " dummy-head" : ""}`}>
                    {isDummyR ? "★ Dummy" : `S${i + 1}`}
                    <span className="th-sub">{supply[i] ?? "?"}</span>
                  </td>
                  {row.map((val, j) => {
                    const isDummyC = dummyDest && j === n - 1;
                    const c = costs[i]?.[j] ?? 0;
                    const blk = isBlk(i, j);
                    return (
                      <td key={j} className="mat-cell">
                        <div className={cellClass(val, i, j, isDummyR, isDummyC)}>
                          <span className="alloc-val">{val > 0 ? val : "—"}</span>
                          <span className="alloc-cost">c={blk ? "∞" : c}</span>
                        </div>
                      </td>
                    );
                  })}
                  <td className="mat-cell-center">{supply[i] ?? "?"}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td className="mat-row-head">Demand</td>
              {Array.from({ length: n }, (_, j) => (
                <td key={j} className="mat-cell-center">{demand[j] ?? "?"}</td>
              ))}
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}