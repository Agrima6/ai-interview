import test from "node:test"
import assert from "node:assert/strict"
import { parseFilters, previousPeriod, withDelta, buildFunnel, pct } from "../utils/dashboardMetrics.js"

const NOW = Date.parse("2026-09-25T00:00:00Z")

test("defaults to the last 30 days and validates every field", () => {
    const f = parseFilters({}, NOW)
    assert.equal(f.to.toISOString(), "2026-09-25T00:00:00.000Z")
    assert.equal(f.from.toISOString(), "2026-08-26T00:00:00.000Z")
    assert.equal(parseFilters({ interviewStatus: "completed", language: "HI", round: "2", scoreMin: "40" }, NOW).candidateStatus, "COMPLETED")
    for (const q of [{ from: "nonsense" }, { interviewStatus: "WEIRD" }, { round: "x" }, { scoreMin: "200" }, { jobId: "abc" }, { scoreMin: "80", scoreMax: "20" },
                     { from: "2026-09-25", to: "2026-01-01" }, { from: "2020-01-01", to: "2026-09-25" }, { language: "klingon" }]) {
        assert.throws(() => parseFilters(q, NOW), (e) => e.code === "INVALID_FILTER", JSON.stringify(q))
    }
})

test("unknown fields are dropped and filters the data cannot support are reported, not silently ignored", () => {
    const f = parseFilters({ recruiterId: "r1", source: "linkedin", $where: "1", department: ["Engineering", "x"] }, NOW)
    assert.deepEqual(f.unsupported, ["recruiterId", "source"])
    assert.equal(f.department, "Engineering")
    assert.equal("$where" in f, false)
})

test("previous period is the equally long window just before", () => {
    const f = parseFilters({ from: "2026-09-01", to: "2026-09-11" }, NOW)
    const p = previousPeriod(f)
    assert.equal(p.to.toISOString(), f.from.toISOString())
    assert.equal(p.to - p.from, f.to - f.from)
})

test("deltas never invent a comparison", () => {
    assert.deepEqual(withDelta(120, 100), { value: 120, previous: 100, delta: 20, deltaPct: 20 })
    assert.equal(withDelta(5, 0).deltaPct, null)             // no percentage from a zero base
    assert.equal(withDelta(5, null).delta, null)
    assert.equal(withDelta(null, 3).value, null)
    assert.equal(pct(1, 0), null)
})

test("funnel: conversion vs previous stage, drop-off, overall, and the bottleneck", () => {
    const { stages, bottleneck } = buildFunnel([{ key: "applied", count: 200 }, { key: "scheduled", count: 150 }, { key: "completed", count: 60 }, { key: "shortlisted", count: 30 }])
    assert.deepEqual(stages.map((s) => s.conversionPct), [100, 75, 40, 50])
    assert.deepEqual(stages.map((s) => s.dropOffPct), [0, 25, 60, 50])
    assert.equal(stages[3].overallPct, 15)
    assert.deepEqual(bottleneck, { key: "completed", dropOffPct: 60 })
    assert.deepEqual(buildFunnel([]), { stages: [], bottleneck: null })
    assert.equal(buildFunnel([{ key: "a", count: 0 }, { key: "b", count: 0 }]).stages[1].conversionPct, null)
})
