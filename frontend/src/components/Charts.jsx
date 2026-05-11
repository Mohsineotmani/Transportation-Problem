import React from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, CartesianGrid,
} from "recharts";

const COLORS = ["#4f8ef7", "#22c993", "#f5a623", "#e05c5c", "#9b7fe8", "#5cc8f5", "#f76b8a", "#73d97a"];

const fmt = (n) => typeof n === "number" ? n.toLocaleString() : n;

export default function Charts({ result, supply, demand }) {
  if (!result) return null;

  const { nwc, vam, optimal } = result;

  const methodData = [
    { name: "NW Corner", cost: nwc.total_cost, fill: "#94a3b8" },
    { name: "VAM", cost: vam.total_cost, fill: "#4f8ef7" },
    { name: "Optimal", cost: optimal.total_cost, fill: "#22c993" },
  ];

  const supplyDemandData = [
    ...supply.map((v, i) => ({ name: `S${i + 1}`, value: v, type: "Supply" })),
    ...demand.map((v, j) => ({ name: `D${j + 1}`, value: v, type: "Demand" })),
  ];

  const srcVolume = optimal.allocation.map((row, i) => ({
    name: `S${i + 1}`,
    value: row.reduce((a, b) => a + b, 0),
  })).filter((d) => d.value > 0);

  const dstVolume = demand.map((_, j) => ({
    name: `D${j + 1}`,
    value: optimal.allocation.reduce((t, row) => t + (row[j] ?? 0), 0),
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length)
      return (
        <div className="chart-tooltip">
          <p className="ct-label">{label}</p>
          {payload.map((p, k) => (
            <p key={k} style={{ color: p.fill || p.color }}>{p.name}: {fmt(p.value)}</p>
          ))}
        </div>
      );
    return null;
  };

  return (
    <div className="charts-grid">
      {/* Method comparison */}
      <div className="chart-card span2">
        <h3 className="chart-title">Method cost comparison</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={methodData} margin={{ top: 8, right: 16, bottom: 0, left: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--c-grid)" />
            <XAxis dataKey="name" tick={{ fill: "var(--c-text-muted)", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "var(--c-text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={fmt} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="cost" radius={[4, 4, 0, 0]}>
              {methodData.map((d, i) => <Cell key={i} fill={d.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Supply vs Demand */}
      <div className="chart-card">
        <h3 className="chart-title">Supply &amp; demand by node</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={supplyDemandData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--c-grid)" />
            <XAxis dataKey="name" tick={{ fill: "var(--c-text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "var(--c-text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" radius={[3, 3, 0, 0]}>
              {supplyDemandData.map((d, i) => (
                <Cell key={i} fill={d.type === "Supply" ? "#4f8ef7" : "#22c993"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="chart-legend">
          <span><span className="leg-dot" style={{ background: "#4f8ef7" }} />Supply</span>
          <span><span className="leg-dot" style={{ background: "#22c993" }} />Demand</span>
        </div>
      </div>

      {/* Volume by source - pie */}
      <div className="chart-card">
        <h3 className="chart-title">Volume handled by source</h3>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={srcVolume} dataKey="value" nameKey="name" cx="50%" cy="50%"
              innerRadius={55} outerRadius={85} paddingAngle={3}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={false}>
              {srcVolume.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v) => [fmt(v), "Units"]} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Destination volumes */}
      <div className="chart-card span2">
        <h3 className="chart-title">Units received per destination</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={dstVolume} margin={{ top: 8, right: 16, bottom: 0, left: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--c-grid)" />
            <XAxis dataKey="name" tick={{ fill: "var(--c-text-muted)", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "var(--c-text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" fill="#9b7fe8" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}