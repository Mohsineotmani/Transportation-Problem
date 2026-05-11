import React from "react";
import { useSolver } from "./hooks/useSolver";
import CostMatrix from "./components/CostMatrix";
import Results from "./components/Results";
import Sensitivity from "./components/Sensitivity";
import Charts from "./components/Charts";
import { exportCSV } from "./utils/solver";

const TABS = [
  { id: "input",       label: "Input" },
  { id: "results",     label: "Results & Steps" },
  { id: "sensitivity", label: "Sensitivity" },
  { id: "charts",      label: "Charts" },
];

export default function App() {
  const s = useSolver();

  const totalSupply = s.supply.reduce((a, b) => a + b, 0);
  const totalDemand = s.demand.reduce((a, b) => a + b, 0);
  const isBalanced = totalSupply === totalDemand;

  return (
    <div className="app">
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className="sidebar">
        <div className="logo">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <rect width="28" height="28" rx="7" fill="#4f8ef7" />
            <rect x="5" y="5" width="6" height="6" rx="1.5" fill="white" opacity="0.9"/>
            <rect x="11" y="5" width="6" height="6" rx="1.5" fill="white" opacity="0.6"/>
            <rect x="17" y="5" width="6" height="6" rx="1.5" fill="white" opacity="0.3"/>
            <rect x="5" y="11" width="6" height="6" rx="1.5" fill="white" opacity="0.6"/>
            <rect x="11" y="11" width="6" height="6" rx="1.5" fill="white"/>
            <rect x="17" y="11" width="6" height="6" rx="1.5" fill="white" opacity="0.4"/>
            <rect x="5" y="17" width="6" height="6" rx="1.5" fill="white" opacity="0.3"/>
            <rect x="11" y="17" width="6" height="6" rx="1.5" fill="white" opacity="0.5"/>
            <rect x="17" y="17" width="6" height="6" rx="1.5" fill="white" opacity="0.8"/>
          </svg>
          <div>
            <p className="logo-name">TransportOR</p>
            <p className="logo-version">PRO v2.0</p>
          </div>
        </div>

        <nav className="sidebar-nav" role="navigation" aria-label="Main tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`nav-item${s.activeTab === t.id ? " active" : ""}`}
              onClick={() => s.setActiveTab(t.id)}
              disabled={t.id !== "input" && !s.result}
              aria-current={s.activeTab === t.id ? "page" : undefined}
            >
              {t.label}
              {t.id !== "input" && !s.result && (
                <span className="nav-lock" title="Solve first">🔒</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-actions">
          <button className="action-btn primary" onClick={s.solve} disabled={s.loading}>
            {s.loading ? "Solving…" : "Solve"}
          </button>
          <button className="action-btn" onClick={s.reset}>Reset</button>
          <button
            className="action-btn"
            onClick={() => exportCSV(s.result, s.costs)}
            disabled={!s.result}
            title="Export shipping manifest as CSV"
          >
            Export CSV
          </button>
        </div>

        {/* Balance status */}
        <div className="sidebar-status">
          <div className={`balance-badge ${isBalanced ? "balanced" : "unbalanced"}`}>
            {isBalanced ? "✓ Balanced" : "⚠ Unbalanced"}
          </div>
          <p className="balance-detail">
            Supply: <strong>{totalSupply}</strong> · Demand: <strong>{totalDemand}</strong>
          </p>
          {!isBalanced && s.autoBalance && (
            <p className="balance-hint">Dummy {totalSupply > totalDemand ? "destination" : "source"} will be added</p>
          )}
        </div>
      </aside>

      {/* ── Main content ────────────────────────────────────── */}
      <main className="main" role="main">
        {/* ── INPUT TAB ── */}
        {s.activeTab === "input" && (
          <div className="tab-content">
            <header className="tab-header">
              <h1 className="tab-title">Problem input</h1>
              <p className="tab-sub">Enter your cost matrix, supply and demand values. Use block mode to simulate route closures.</p>
            </header>

            {/* Controls row */}
            <div className="controls-row">
              <div className="control-group">
                <label className="ctrl-label" htmlFor="rowCount">Sources</label>
                <input id="rowCount" type="number" min="2" max="10" value={s.rows}
                  className="dim-input"
                  onChange={(e) => s.setRows(+e.target.value)} />
              </div>
              <span className="dim-sep">×</span>
              <div className="control-group">
                <label className="ctrl-label" htmlFor="colCount">Destinations</label>
                <input id="colCount" type="number" min="2" max="10" value={s.cols}
                  className="dim-input"
                  onChange={(e) => s.setCols(+e.target.value)} />
              </div>

              <div className="toggle-group">
                <label className="toggle-label" htmlFor="autoBalance">
                  <span>Auto-balance</span>
                  <div className="toggle-switch">
                    <input id="autoBalance" type="checkbox" checked={s.autoBalance}
                      onChange={(e) => s.setAutoBalance(e.target.checked)} />
                    <span className="toggle-track" />
                  </div>
                </label>
              </div>

              <div className="toggle-group">
                <label className="toggle-label" htmlFor="blockMode">
                  <span>Block mode</span>
                  <div className="toggle-switch">
                    <input id="blockMode" type="checkbox" checked={s.blockMode}
                      onChange={(e) => s.setBlockMode(e.target.checked)} />
                    <span className="toggle-track" />
                  </div>
                </label>
                {s.blockMode && (
                  <span className="block-hint">Click × on a cell to block that route</span>
                )}
              </div>
            </div>

            {/* Errors */}
            {s.error && (
              <div className="error-box" role="alert">
                <span className="error-icon">⚠</span>
                <ul className="error-list">
                  {s.error.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}

            {/* Matrix */}
            <div className="card">
              <p className="card-legend">
                <span className="legend-supply">Blue</span> = supply / demand ·
                Inner cells = unit shipping cost ·
                <span className="legend-blocked"> Red</span> = blocked route (∞ cost)
              </p>
              <CostMatrix
                rows={s.rows} cols={s.cols}
                costs={s.costs} supply={s.supply} demand={s.demand}
                blocked={s.blocked} blockMode={s.blockMode}
                updateCost={s.updateCost} updateSupply={s.updateSupply}
                updateDemand={s.updateDemand}
                isBlocked={s.isBlocked} toggleBlock={s.toggleBlock}
              />
            </div>

            {/* Solve button (also in sidebar, this one is for mobile) */}
            <button className="solve-btn" onClick={s.solve} disabled={s.loading}>
              {s.loading ? "Solving…" : "Solve Transportation Problem"}
            </button>
          </div>
        )}

        {/* ── RESULTS TAB ── */}
        {s.activeTab === "results" && (
          <div className="tab-content">
            <header className="tab-header">
              <h1 className="tab-title">Results & step-by-step</h1>
              <p className="tab-sub">Three-phase process: Northwest Corner → VAM → Optimal (OR-Tools GLOP).</p>
            </header>
            <Results
              result={s.result}
              costs={s.costs}
              supply={s.supply}
              demand={s.demand}
              blocked={s.blocked}
            />
          </div>
        )}

        {/* ── SENSITIVITY TAB ── */}
        {s.activeTab === "sensitivity" && s.result && (
          <div className="tab-content">
            <header className="tab-header">
              <h1 className="tab-title">Sensitivity analysis</h1>
              <p className="tab-sub">Explore how cost changes or supply shocks affect the optimal routing in real time.</p>
            </header>
            <Sensitivity
              baseResult={s.result}
              costs={s.costs}
              supply={s.supply}
              demand={s.demand}
              blocked={s.blocked}
            />
          </div>
        )}

        {/* ── CHARTS TAB ── */}
        {s.activeTab === "charts" && s.result && (
          <div className="tab-content">
            <header className="tab-header">
              <h1 className="tab-title">Charts</h1>
              <p className="tab-sub">Visual breakdown of costs, volumes, and method comparison.</p>
            </header>
            <Charts result={s.result} supply={s.supply} demand={s.demand} />
          </div>
        )}
      </main>
    </div>
  );
}