export function getScoreBand(score) {
    if (score <= 70) return 'low'
    if (score <= 89) return 'mid'
    return 'high'
}
