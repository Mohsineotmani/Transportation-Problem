export const INF = 1_000_000;

export function calcCost(alloc, costs) {
    return alloc.reduce(
        (t, row, i) => t + row.reduce((s, v, j) => s + v * (costs[i]?.[j] ?? 0), 0),
        0
    );
}

export function northwestCorner(supply, demand) {
    const m = supply.length, n = demand.length;
    const a = Array.from({ length: m }, () => Array(n).fill(0));
    const s = [...supply], d = [...demand];
    let i = 0, j = 0;
    while (i < m && j < n) {
        const amt = Math.min(s[i], d[j]);
        a[i][j] += amt; s[i] -= amt; d[j] -= amt;
        if (s[i] < 1e-9) i++; else j++;
    }
    return a;
}

export function vogelsApprox(costs, supply, demand) {
    const m = supply.length, n = demand.length;
    const a = Array.from({ length: m }, () => Array(n).fill(0));
    const s = [...supply], d = [...demand];
    const rd = Array(m).fill(false), cd = Array(n).fill(false);

    const pen = (vals) => {
        const sv = [...vals].sort((a, b) => a - b);
        return sv.length >= 2 ? sv[1] - sv[0] : sv[0] ?? 0;
    };

    let rem = m * n;
    while (rem > 0) {
        const rp = Array.from({ length: m }, (_, i) => {
            if (rd[i]) return -Infinity;
            const v = Array.from({ length: n }, (_, j) => !cd[j] ? costs[i][j] : null).filter(x => x !== null);
            return v.length ? pen(v) : -Infinity;
        });
        const cp = Array.from({ length: n }, (_, j) => {
            if (cd[j]) return -Infinity;
            const v = Array.from({ length: m }, (_, i) => !rd[i] ? costs[i][j] : null).filter(x => x !== null);
            return v.length ? pen(v) : -Infinity;
        });

        const maxR = Math.max(...rp.filter(v => v !== -Infinity));
        const maxC = Math.max(...cp.filter(v => v !== -Infinity));
        let bi = -1, bj = -1;

        if (maxR >= maxC) {
            bi = rp.indexOf(maxR);
            let mc = Infinity;
            for (let j = 0; j < n; j++) if (!cd[j] && costs[bi][j] < mc) { mc = costs[bi][j]; bj = j; }
        } else {
            bj = cp.indexOf(maxC);
            let mc = Infinity;
            for (let i = 0; i < m; i++) if (!rd[i] && costs[i][bj] < mc) { mc = costs[i][bj]; bi = i; }
        }
        if (bi < 0 || bj < 0) break;

        const amt = Math.min(s[bi], d[bj]);
        a[bi][bj] += amt; s[bi] -= amt; d[bj] -= amt;
        if (s[bi] < 1e-9) { rd[bi] = true; rem--; }
        if (d[bj] < 1e-9) { cd[bj] = true; rem--; }
    }
    return a;
}

export function resizeMatrix(mat, rows, cols) {
    return Array.from({ length: rows }, (_, i) =>
        Array.from({ length: cols }, (_, j) => mat[i]?.[j] ?? 1)
    );
}

export function resizeArr(arr, n, def = 50) {
    const a = [...arr];
    while (a.length < n) a.push(def);
    return a.slice(0, n);
}

export function exportCSV(result, costs) {
    if (!result) return;
    const lines = ["Route,Units,Unit Cost,Total Cost"];
    result.optimal.allocation.forEach((row, i) =>
        row.forEach((v, j) => {
            if (v > 0) lines.push(`S${i + 1}→D${j + 1},${v},${costs[i]?.[j] ?? 0},${Math.round(v * (costs[i]?.[j] ?? 0))}`);
        })
    );
    lines.push("", "Summary");
    lines.push(`NW Corner Cost,${result.nwc.total_cost}`);
    lines.push(`VAM Cost,${result.vam.total_cost}`);
    lines.push(`Optimal Cost,${result.optimal.total_cost}`);
    lines.push(`Savings from NWC,${result.savings_from_nwc}`);
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "transport_solution.csv";
    a.click();
    URL.revokeObjectURL(a.href);
}