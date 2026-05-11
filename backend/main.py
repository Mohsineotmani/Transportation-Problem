from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator, model_validator
from typing import List, Optional
from ortools.linear_solver import pywraplp
import math

app = FastAPI(title="Transportation Solver Pro", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

INF_COST = 1_000_000


# ─── Input / Output Models ────────────────────────────────────────────────────

class SolveRequest(BaseModel):
    costs: List[List[float]]
    supply: List[float]
    demand: List[float]
    blocked: Optional[List[List[int]]] = []   # [[i,j], …]
    auto_balance: Optional[bool] = True

    @field_validator("costs")
    @classmethod
    def validate_costs(cls, v):
        if not v or not v[0]:
            raise ValueError("Cost matrix cannot be empty")
        n = len(v[0])
        for row in v:
            if len(row) != n:
                raise ValueError("All rows in cost matrix must have equal length")
            if any(c < 0 for c in row):
                raise ValueError("Cost values must be non-negative")
        return v

    @field_validator("supply")
    @classmethod
    def validate_supply(cls, v):
        if not v:
            raise ValueError("Supply list cannot be empty")
        if any(s <= 0 for s in v):
            raise ValueError("All supply values must be > 0")
        return v

    @field_validator("demand")
    @classmethod
    def validate_demand(cls, v):
        if not v:
            raise ValueError("Demand list cannot be empty")
        if any(d <= 0 for d in v):
            raise ValueError("All demand values must be > 0")
        return v

    @model_validator(mode="after")
    def validate_dimensions(self):
        if len(self.supply) != len(self.costs):
            raise ValueError(
                f"Supply length ({len(self.supply)}) must match rows in cost matrix ({len(self.costs)})"
            )
        if len(self.demand) != len(self.costs[0]):
            raise ValueError(
                f"Demand length ({len(self.demand)}) must match columns in cost matrix ({len(self.costs[0])})"
            )
        return self


class AllocationResult(BaseModel):
    allocation: List[List[float]]
    total_cost: float


class SolveResponse(BaseModel):
    nwc: AllocationResult
    vam: AllocationResult
    optimal: AllocationResult
    is_balanced: bool
    total_supply: float
    total_demand: float
    dummy_source: bool
    dummy_destination: bool
    savings_from_nwc: float
    savings_vam_to_opt: float
    active_routes: int
    status: str


# ─── NW Corner ────────────────────────────────────────────────────────────────

def northwest_corner(supply: list, demand: list) -> List[List[float]]:
    m, n = len(supply), len(demand)
    alloc = [[0.0] * n for _ in range(m)]
    s, d = supply[:], demand[:]
    i = j = 0
    while i < m and j < n:
        amt = min(s[i], d[j])
        alloc[i][j] += amt
        s[i] -= amt
        d[j] -= amt
        if s[i] < 1e-9:
            i += 1
        elif d[j] < 1e-9:
            j += 1
        else:
            i += 1
    return alloc


# ─── Vogel's Approximation ────────────────────────────────────────────────────

def vogels_approximation(costs: list, supply: list, demand: list) -> List[List[float]]:
    m, n = len(supply), len(demand)
    alloc = [[0.0] * n for _ in range(m)]
    s, d = supply[:], demand[:]
    row_done = [False] * m
    col_done = [False] * n

    def penalty(vals):
        sv = sorted(vals)
        return (sv[1] - sv[0]) if len(sv) >= 2 else (sv[0] if sv else 0)

    remaining = m * n
    while remaining > 0:
        rpen, cpen = [], []
        for i in range(m):
            if row_done[i]:
                rpen.append(-math.inf)
                continue
            vals = [costs[i][j] for j in range(n) if not col_done[j]]
            rpen.append(penalty(vals) if vals else -math.inf)
        for j in range(n):
            if col_done[j]:
                cpen.append(-math.inf)
                continue
            vals = [costs[i][j] for i in range(m) if not row_done[i]]
            cpen.append(penalty(vals) if vals else -math.inf)

        maxR = max((v for v in rpen if v != -math.inf), default=-math.inf)
        maxC = max((v for v in cpen if v != -math.inf), default=-math.inf)

        bi = bj = -1
        if maxR >= maxC:
            bi = next(i for i, v in enumerate(rpen) if v == maxR)
            bj = min((j for j in range(n) if not col_done[j]), key=lambda j: costs[bi][j], default=-1)
        else:
            bj = next(j for j, v in enumerate(cpen) if v == maxC)
            bi = min((i for i in range(m) if not row_done[i]), key=lambda i: costs[i][bj], default=-1)

        if bi < 0 or bj < 0:
            break

        amt = min(s[bi], d[bj])
        alloc[bi][bj] += amt
        s[bi] -= amt
        d[bj] -= amt
        if s[bi] < 1e-9:
            row_done[bi] = True
            remaining -= 1
        if d[bj] < 1e-9:
            col_done[bj] = True
            remaining -= 1

    return alloc


# ─── Cost calculator ──────────────────────────────────────────────────────────

def calc_cost(alloc: list, costs: list) -> float:
    return sum(
        alloc[i][j] * costs[i][j]
        for i in range(len(alloc))
        for j in range(len(alloc[0]))
    )


# ─── OR-Tools LP Solver ───────────────────────────────────────────────────────

def lp_solve(costs: list, supply: list, demand: list) -> List[List[float]]:
    m, n = len(supply), len(demand)
    solver = pywraplp.Solver.CreateSolver("GLOP")
    if not solver:
        raise RuntimeError("Could not create GLOP solver")

    x = {(i, j): solver.NumVar(0.0, solver.infinity(), f"x[{i},{j}]")
         for i in range(m) for j in range(n)}

    obj = solver.Objective()
    for (i, j), var in x.items():
        obj.SetCoefficient(var, costs[i][j])
    obj.SetMinimization()

    for i in range(m):
        ct = solver.Constraint(supply[i], supply[i])
        for j in range(n):
            ct.SetCoefficient(x[i, j], 1)

    for j in range(n):
        ct = solver.Constraint(demand[j], demand[j])
        for i in range(m):
            ct.SetCoefficient(x[i, j], 1)

    status = solver.Solve()
    if status not in (pywraplp.Solver.OPTIMAL, pywraplp.Solver.FEASIBLE):
        raise ValueError("No feasible solution found — check if blocked routes make the problem infeasible")

    return [
        [round(x[i, j].solution_value(), 4) for j in range(n)]
        for i in range(m)
    ]


# ─── Endpoint ─────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"message": "Transportation Solver Pro API", "version": "2.0.0"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/solve", response_model=SolveResponse)
def solve(req: SolveRequest):
    orig_costs = [row[:] for row in req.costs]
    supply = list(req.supply)
    demand = list(req.demand)
    orig_m, orig_n = len(supply), len(demand)

    # Apply blocked routes
    for bi, bj in (req.blocked or []):
        if 0 <= bi < orig_m and 0 <= bj < orig_n:
            orig_costs[bi][bj] = INF_COST

    total_supply = sum(supply)
    total_demand = sum(demand)
    is_balanced = abs(total_supply - total_demand) < 1e-6

    dummy_src = False
    dummy_dst = False

    costs = [row[:] for row in orig_costs]

    if not is_balanced and req.auto_balance:
        if total_supply > total_demand:
            diff = total_supply - total_demand
            demand.append(diff)
            for row in costs:
                row.append(0.0)
            dummy_dst = True
        else:
            diff = total_demand - total_supply
            supply.append(diff)
            costs.append([0.0] * len(demand))
            dummy_src = True
    elif not is_balanced and not req.auto_balance:
        raise HTTPException(
            status_code=400,
            detail=f"Problem is unbalanced (supply={total_supply}, demand={total_demand}). "
                   "Enable auto_balance or fix supply/demand values."
        )

    # NWC on balanced problem
    try:
        nwc_alloc = northwest_corner(supply[:], demand[:])
        nwc_cost = round(calc_cost(nwc_alloc, costs), 4)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"NWC error: {e}")

    # VAM on balanced problem
    try:
        vam_alloc = vogels_approximation(costs, supply[:], demand[:])
        vam_cost = round(calc_cost(vam_alloc, costs), 4)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"VAM error: {e}")

    # LP optimal
    try:
        opt_alloc = lp_solve(costs, supply, demand)
        opt_cost = round(calc_cost(opt_alloc, costs), 4)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Solver error: {e}")

    # Trim to original dimensions
    def trim(alloc):
        return [
            [round(alloc[i][j], 4) for j in range(orig_n)]
            for i in range(orig_m)
        ]

    # Cost on original (not dummy) routes
    def orig_cost(alloc):
        return round(sum(
            alloc[i][j] * orig_costs[i][j]
            for i in range(orig_m)
            for j in range(orig_n)
        ), 4)

    nwc_trim = trim(nwc_alloc)
    vam_trim = trim(vam_alloc)
    opt_trim = trim(opt_alloc)

    active_routes = sum(1 for row in opt_trim for v in row if v > 1e-6)

    return SolveResponse(
        nwc=AllocationResult(allocation=nwc_trim, total_cost=orig_cost(nwc_alloc)),
        vam=AllocationResult(allocation=vam_trim, total_cost=orig_cost(vam_alloc)),
        optimal=AllocationResult(allocation=opt_trim, total_cost=orig_cost(opt_alloc)),
        is_balanced=is_balanced,
        total_supply=total_supply,
        total_demand=total_demand,
        dummy_source=dummy_src,
        dummy_destination=dummy_dst,
        savings_from_nwc=round(orig_cost(nwc_alloc) - orig_cost(opt_alloc), 4),
        savings_vam_to_opt=round(orig_cost(vam_alloc) - orig_cost(opt_alloc), 4),
        active_routes=active_routes,
        status="OPTIMAL",
    )