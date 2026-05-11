import { useState, useCallback } from "react";
import { resizeMatrix, resizeArr, INF } from "../utils/solver";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

const DEFAULT = {
  costs: [[2, 3, 1, 4], [5, 4, 8, 1], [5, 6, 8, 2]],
  supply: [120, 80, 80],
  demand: [150, 70, 100, 60],
};

export function useSolver() {
  const [rows, setRowsState] = useState(3);
  const [cols, setColsState] = useState(4);
  const [costs, setCosts] = useState(DEFAULT.costs.map((r) => [...r]));
  const [supply, setSupply] = useState([...DEFAULT.supply]);
  const [demand, setDemand] = useState([...DEFAULT.demand]);
  const [blocked, setBlocked] = useState([]);
  const [autoBalance, setAutoBalance] = useState(true);
  const [blockMode, setBlockMode] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("input");

  const setRows = useCallback((n) => {
    const r = Math.min(Math.max(n, 2), 10);
    setRowsState(r);
    setCosts((c) => resizeMatrix(c, r, cols));
    setSupply((s) => resizeArr(s, r, 50));
    setBlocked((b) => b.filter(([i]) => i < r));
  }, [cols]);

  const setCols_ = useCallback((n) => {
    const c = Math.min(Math.max(n, 2), 10);
    setColsState(c);
    setCosts((m) => resizeMatrix(m, rows, c));
    setDemand((d) => resizeArr(d, c, 50));
    setBlocked((b) => b.filter(([, j]) => j < c));
  }, [rows]);

  const updateCost = useCallback((i, j, val) => {
    setCosts((prev) => {
      const next = prev.map((r) => [...r]);
      next[i][j] = Math.max(0, val);
      return next;
    });
  }, []);

  const updateSupply = useCallback((i, val) => {
    setSupply((prev) => { const n = [...prev]; n[i] = Math.max(1, val); return n; });
  }, []);

  const updateDemand = useCallback((j, val) => {
    setDemand((prev) => { const n = [...prev]; n[j] = Math.max(1, val); return n; });
  }, []);

  const isBlocked = useCallback((i, j) =>
    blocked.some(([a, b]) => a === i && b === j), [blocked]);

  const toggleBlock = useCallback((i, j) => {
    setBlocked((prev) => {
      const idx = prev.findIndex(([a, b]) => a === i && b === j);
      return idx >= 0 ? prev.filter((_, k) => k !== idx) : [...prev, [i, j]];
    });
  }, []);

  const validate = useCallback(() => {
    const errs = [];
    if (supply.some((v) => v <= 0)) errs.push("All supply values must be > 0.");
    if (demand.some((v) => v <= 0)) errs.push("All demand values must be > 0.");
    costs.forEach((row, i) =>
      row.forEach((v, j) => {
        if (!isBlocked(i, j) && v < 0)
          errs.push(`Negative cost at S${i + 1}→D${j + 1}.`);
      })
    );
    if (!autoBalance) {
      const ts = supply.reduce((a, b) => a + b, 0);
      const td = demand.reduce((a, b) => a + b, 0);
      if (ts !== td) errs.push(`Unbalanced: supply ${ts} ≠ demand ${td}. Enable auto-balance.`);
    }
    return errs;
  }, [costs, supply, demand, blocked, autoBalance, isBlocked]);

  const solve = useCallback(async () => {
    const errs = validate();
    if (errs.length) { setError(errs); return; }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API}/solve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ costs, supply, demand, blocked, auto_balance: autoBalance }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Server error");
      }
      const data = await res.json();
      setResult(data);
      setActiveTab("results");
    } catch (e) {
      setError([e.message || "Failed to reach the API."]);
    } finally {
      setLoading(false);
    }
  }, [costs, supply, demand, blocked, autoBalance, validate]);

  const reset = useCallback(() => {
    setRowsState(3); setColsState(4);
    setCosts(DEFAULT.costs.map((r) => [...r]));
    setSupply([...DEFAULT.supply]);
    setDemand([...DEFAULT.demand]);
    setBlocked([]);
    setAutoBalance(true);
    setBlockMode(false);
    setResult(null);
    setError(null);
    setActiveTab("input");
  }, []);

  const totalSupply = supply.reduce((a, b) => a + b, 0);
  const totalDemand = demand.reduce((a, b) => a + b, 0);

  return {
    rows, cols, costs, supply, demand, blocked, autoBalance, blockMode,
    result, loading, error, activeTab, totalSupply, totalDemand,
    setRows, setCols: setCols_, updateCost, updateSupply, updateDemand,
    isBlocked, toggleBlock, setAutoBalance, setBlockMode,
    solve, reset, setActiveTab, setError,
  };
}