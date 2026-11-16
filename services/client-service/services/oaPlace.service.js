import axios from "axios"

// Latitude and longitude into a name a person recognises ("Sector 29, Gurugram, Haryana, India"), through OpenStreetMap's
// public lookup. Best effort: it is never allowed to slow a candidate down or to fail a request.
const cache = new Map()
const TTL = 24 * 3600 * 1000
const MAX_ENTRIES = 3000

const round = (n) => Math.round(Number(n) * 1000) / 1000   // about 100 m: enough for a place name, and good for caching

export const validCoordinates = (lat, lng) => Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)) && Math.abs(Number(lat)) <= 90 && Math.abs(Number(lng)) <= 180

export const placeName = async (latitude, longitude, { timeoutMs = 3500 } = {}) => {
    if (latitude === null || latitude === undefined || longitude === null || longitude === undefined || latitude === "" || longitude === "") return null
    if (!validCoordinates(latitude, longitude)) return null
    const key = `${round(latitude)},${round(longitude)}`
    const hit = cache.get(key)
    if (hit && Date.now() - hit.at < TTL) return hit.place
    try {
        const res = await axios.get("https://nominatim.openstreetmap.org/reverse", {
            params: { format: "jsonv2", lat: round(latitude), lon: round(longitude), zoom: 14, addressdetails: 1, "accept-language": "en" },
            headers: { "User-Agent": "WorkmateIQ/1.0 (online assessment; https://workmateiq.com)" },
            timeout: timeoutMs,
        })
        const a = res.data?.address || {}
        const local = a.suburb || a.neighbourhood || a.city_district || a.quarter || ""
        const city = a.city || a.town || a.village || a.municipality || a.county || a.state_district || ""
        const parts = [local && local !== city ? local : "", city, a.state, a.country].filter(Boolean)
        const place = (parts.length ? parts.join(", ") : String(res.data?.display_name || "").split(",").slice(0, 4).join(",").trim()).slice(0, 140) || null
        if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value)
        cache.set(key, { place, at: Date.now() })
        return place
    } catch {
        return null
    }
}
