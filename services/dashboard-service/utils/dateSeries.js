// Fills in zero-count days so a line chart never shows gaps/warped spacing
// on days with no activity. Shared by the platform-admin dashboard and the
// per-organization dashboard so both charts behave identically.
export const RANGE_TO_DAYS = { "7d": 7, "30d": 30, "90d": 90 }

export const fillDailySeries = (days, sparse) => {
    const byDate = Object.fromEntries(sparse.map((r) => [r.date, r.count]))
    const series = []
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
        const date = d.toISOString().slice(0, 10)
        series.push({ date, count: byDate[date] || 0 })
    }
    return series
}
