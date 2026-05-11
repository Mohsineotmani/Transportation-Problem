import React, { useState, useCallback } from "react";
import AllocationTable from "./AllocationTable";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function Sensitivity({ baseResult, costs, supply, demand, blocked }) {
  const [costDeltas, setCostDeltas] = useState(() =>
    costs.map((row) => row.map(() => 0))
  );
  const [supplyMods, setSupplyMods] = useState(() => supply.map((v) => v));
  const [sensResult, setSensResult] = useState(null);
  const [supplyResult, setSupplyResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const recalc = useCallback(async (modCosts, modSupply) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/solve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          costs: modCosts,
          supply: modSupply,
          demand,
          blocked,
          auto_balance: true,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).detail);
      return await res.json();
    } catch (e) {
      return { error: e.message };
    } finally {
      setLoading(false);
    }
  }, [demand, blocked]);

  const handleCostSlider = async (i, j, pct) => {
    const next = costDeltas.map((r) => [...r]);
    next[i][j] = pct;
    setCostDeltas(next);
    const modCosts = costs.map((row, ri) =>
      row.map((c, ci) => Math.max(0, Math.round(c * (1 + next[ri][ci] / 100) * 10) / 10))
    );
    const r = await recalc(modCosts, supply);
    if (!r.error) setSensResult({ result: r, modCosts, delta: next });
  };

  const handleSupplySlider = async (i, val) => {
    const next = [...supplyMods];
    next[i] = val;
    setSupplyMods(next);
    const r = await recalc(costs, next);
    if (!r.error) setSupplyResult({ result: r, modSupply: next });
  };

  return (
    <div className="sens-container">
      {/* Cost sensitivity */}
      <div className="card">
        <h2 className="card-title">
          <span className="card-icon">📈</span> Cost sensitivity
        </h2>
        <p className="card-sub">Drag a slider to see how a price change affects the optimal routing.</p>
        <div className="sens-sliders">
          {costs.map((row, i) =>
            row.map((c, j) => {
              const pct = costDeltas[i]?.[j] ?? 0;
              const newCost = Math.max(0, Math.round(c * (1 + pct / 100) * 10) / 10);
              return (
                <div key={`${i}-${j}`} className="slider-row">
                  <span className="slider-label">S{i + 1}→D{j + 1}</span>
                  <span className="slider-base">{c}</span>
                  <input
                    type="range" min={-50} max={100} step={5} value={pct}
                    className="range-input"
                    onChange={(e) => handleCostSlider(i, j, +e.target.value)}
                    aria-label={`Cost sensitivity S${i+1} to D${j+1}`}
                  />
                  <span className={`slider-val ${pct > 0 ? "up" : pct < 0 ? "down" : ""}`}>
                    {pct >= 0 ? "+" : ""}{pct}% → {newCost}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {sensResult && (
          <div className="sens-result">
            <div className="sens-metrics">
              <div className="sens-metric">
                <span className="sm-label">New optimal cost</span>
                <span className="sm-val">{sensResult.result.optimal.total_cost.toLocaleString()}</span>
              </div>
              <div className={`sens-metric ${sensResult.result.optimal.total_cost > baseResult.optimal.total_cost ? "worse" : "better"}`}>
                <span className="sm-label">vs baseline</span>
                <span className="sm-val">
                  {sensResult.result.optimal.total_cost >= baseResult.optimal.total_cost ? "+" : ""}
                  {(sensResult.result.optimal.total_cost - baseResult.optimal.total_cost).toLocaleString()}
                </span>
              </div>
            </div>
            <AllocationTable
              allocation={sensResult.result.optimal.allocation}
              costs={sensResult.modCosts}
              supply={supply}
              demand={demand}
              label="Recalculated optimal allocation"
            />
          </div>
        )}
      </div>

      {/* Supply shock */}
      <div className="card">
        <h2 className="card-title">
          <span className="card-icon">🏭</span> Supply shock — warehouse closure simulator
        </h2>
        <p className="card-sub">Reduce a source's supply to 0 to simulate closure. The remaining network redistributes.</p>
        <div className="sens-sliders">
          {supply.map((s, i) => (
            <div key={i} className="slider-row">
              <span className="slider-label">S{i + 1} supply</span>
              <span className="slider-base">{s}</span>
              <input
                type="range" min={0} max={s * 2} step={1} value={supplyMods[i] ?? s}
                className="range-input"
                onChange={(e) => handleSupplySlider(i, +e.target.value)}
                aria-label={`Supply for source ${i + 1}`}
              />
              <span className={`slider-val ${supplyMods[i] < s ? "down" : supplyMods[i] > s ? "up" : ""}`}>
                {supplyMods[i] ?? s}
              </span>
            </div>
          ))}
        </div>

        {supplyResult && (
          <div className="sens-result">
            <div className="sens-metrics">
              <div className="sens-metric">
                <span className="sm-label">New optimal cost</span>
                <span className="sm-val">{supplyResult.result.optimal.total_cost.toLocaleString()}</span>
              </div>
              <div className="sens-metric">
                <span className="sm-label">Total supply</span>
                <span className="sm-val">{supplyResult.modSupply.reduce((a, b) => a + b, 0).toLocaleString()}</span>
              </div>
            </div>
            <AllocationTable
              allocation={supplyResult.result.optimal.allocation}
              costs={costs}
              supply={supplyResult.modSupply}
              demand={demand}
              label="Redistribution after supply shock"
            />
          </div>
        )}
      </div>

      {loading && <div className="sens-loading">Recalculating…</div>}
    </div>
  );
}