import React, { useRef } from "react";

export default function CostMatrix({
  rows, cols, costs, supply, demand, blocked, blockMode,
  updateCost, updateSupply, updateDemand, isBlocked, toggleBlock,
}) {
  const inputRefs = useRef({});

  const handleCostChange = (i, j, raw) => {
    const v = parseFloat(raw);
    if (!isNaN(v)) updateCost(i, j, v);
  };

  return (
    <div className="grid-scroll">
      <table className="mat-table" aria-label="Cost matrix">
        <thead>
          <tr>
            <th className="mat-corner" />
            {demand.map((_, j) => (
              <th key={j} className="mat-col-head">D{j + 1}</th>
            ))}
            <th className="mat-col-head supply-head">Supply</th>
          </tr>
        </thead>
        <tbody>
          {costs.map((row, i) => (
            <tr key={i}>
              <td className="mat-row-head">S{i + 1}</td>
              {row.map((val, j) => {
                const blk = isBlocked(i, j);
                return (
                  <td key={j} className="mat-cell">
                    <div className="cell-wrap">
                      <input
                        type="number"
                        min="0"
                        disabled={blk}
                        value={blk ? "" : val}
                        placeholder={blk ? "∞" : ""}
                        className={`num-input${blk ? " blocked" : ""}`}
                        onChange={(e) => handleCostChange(i, j, e.target.value)}
                        aria-label={`Cost S${i + 1} to D${j + 1}`}
                      />
                      {blockMode && (
                        <button
                          className={`block-btn${blk ? " active" : ""}`}
                          onClick={() => toggleBlock(i, j)}
                          title={blk ? `Unblock route S${i+1}→D${j+1}` : `Block route S${i+1}→D${j+1}`}
                          aria-label={blk ? "Unblock route" : "Block route"}
                        >
                          {blk ? "✓" : "×"}
                        </button>
                      )}
                    </div>
                  </td>
                );
              })}
              <td className="mat-cell">
                <input
                  type="number"
                  min="1"
                  value={supply[i]}
                  className="num-input supply-input"
                  onChange={(e) => updateSupply(i, Math.max(1, +e.target.value))}
                  aria-label={`Supply for source ${i + 1}`}
                />
              </td>
            </tr>
          ))}
          <tr>
            <td className="mat-row-head">Demand</td>
            {demand.map((val, j) => (
              <td key={j} className="mat-cell">
                <input
                  type="number"
                  min="1"
                  value={val}
                  className="num-input demand-input"
                  onChange={(e) => updateDemand(j, Math.max(1, +e.target.value))}
                  aria-label={`Demand for destination ${j + 1}`}
                />
              </td>
            ))}
            <td />
          </tr>
        </tbody>
      </table>
    </div>
  );
}