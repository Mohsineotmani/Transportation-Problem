import React from "react";
import AllocationTable from "./AllocationTable";

const fmt = (n) => (typeof n === "number" ? n.toLocaleString() : n);

function MetricCard({ label, value, sub, highlight }) {
  return (
    <div className={`metric-card${highlight ? " highlight" : ""}`}>
      <p className="mc-label">{label}</p>
      <p className="mc-val">{fmt(value)}</p>
      {sub && <p className="mc-sub">{sub}</p>}
    </div>
  );
}

export default function Results({ result, costs, supply, demand, blocked }) {
  if (!result) return <p className="placeholder">Solve the problem first to see results.</p>;

  const { nwc, vam, optimal, savings_from_nwc, savings_vam_to_opt,
    is_balanced, dummy_source, dummy_destination, active_routes } = result;

  return (
    <div className="results-container">
      {/* Savings banner */}
      <div className="savings-banner">
        <div>
          <p className="sb-title">Optimization savings vs Northwest Corner</p>
          <p className="sb-sub">Moving from basic feasible solution to MODI-optimal</p>
        </div>
        <div className="sb-value">−{fmt(savings_from_nwc)}</div>
      </div>

      {/* Metrics row */}
      <div className="metrics-row">
        <MetricCard label="NW Corner" value={nwc.total_cost} sub="initial BFS" />
        <MetricCard label="VAM" value={vam.total_cost} sub="Vogel's approx." />
        <MetricCard label="Optimal" value={optimal.total_cost} sub="OR-Tools GLOP" highlight />
        <MetricCard
          label="VAM → Optimal"
          value={(savings_vam_to_opt >= 0 ? "−" : "+") + fmt(Math.abs(savings_vam_to_opt))}
          sub={savings_vam_to_opt === 0 ? "VAM was optimal" : "further saved"}
        />
        <MetricCard label="Active routes" value={active_routes} sub="non-zero allocations" />
      </div>

      {/* Dummy info */}
      {(dummy_source || dummy_destination) && (
        <div className="info-banner">
          <span className="info-icon">ℹ</span>
          <span>
            <strong>Dummy {dummy_source ? "source" : "destination"} added</strong> to balance the
            problem. It appears as <strong>★ Dummy</strong> in the tables below with zero cost.
          </span>
        </div>
      )}

      {/* Step comparison */}
      <h2 className="section-title">Step-by-step process</h2>
      <div className="step-grid">
        <div className="step-col">
          <div className="step-badge step-1">Step 1</div>
          <h3 className="step-title">Northwest Corner Rule</h3>
          <p className="step-desc">Mechanical starting point — fills top-left to bottom-right regardless of costs.</p>
          <div className="step-cost">{fmt(nwc.total_cost)}</div>
          <AllocationTable
            allocation={nwc.allocation}
            costs={costs}
            supply={supply}
            demand={demand}
            dummySource={dummy_source}
            dummyDest={dummy_destination}
            blocked={blocked}
          />
        </div>

        <div className="step-col">
          <div className="step-badge step-2">Step 2</div>
          <h3 className="step-title">Vogel's Approximation (VAM)</h3>
          <p className="step-desc">Penalty-based heuristic — assigns highest-penalty routes first for a better start.</p>
          <div className="step-cost vam">{fmt(vam.total_cost)}</div>
          <AllocationTable
            allocation={vam.allocation}
            costs={costs}
            supply={supply}
            demand={demand}
            dummySource={dummy_source}
            dummyDest={dummy_destination}
            blocked={blocked}
          />
        </div>
      </div>

      <div className="optimal-section">
        <div className="step-badge step-3">Step 3 — Final</div>
        <h3 className="step-title">Optimal Solution <span className="badge-optimal">MODI / OR-Tools GLOP</span></h3>
        <p className="step-desc">Linear programming solver finds the mathematically optimal allocation.</p>
        <div className="step-cost optimal">{fmt(optimal.total_cost)}</div>
        <AllocationTable
          allocation={optimal.allocation}
          costs={costs}
          supply={supply}
          demand={demand}
          dummySource={dummy_source}
          dummyDest={dummy_destination}
          blocked={blocked}
        />
      </div>

      {/* Shipping manifest */}
      <h2 className="section-title">Shipping manifest</h2>
      <div className="manifest-grid">
        {optimal.allocation.flatMap((row, i) =>
          row
            .map((val, j) => ({ i, j, val, cost: costs[i]?.[j] ?? 0 }))
            .filter((d) => d.val > 0)
            .map(({ i, j, val, cost }) => (
              <div key={`${i}-${j}`} className="manifest-card">
                <div className="mc-route">S{i + 1} → D{j + 1}</div>
                <div className="mc-detail">{fmt(val)} units</div>
                <div className="mc-detail">@{cost} / unit</div>
                <div className="mc-total">{fmt(Math.round(val * cost))}</div>
              </div>
            ))
        )}
      </div>
    </div>
  );
}