// Turns an organization's branding.primaryColor/secondaryColor/fontFamily
// into inline style overrides scoped to the Organization shell's wrapper
// element - not `document.documentElement`, so a mis-signed-in tab never
// bleeds this org's branding into the platform-admin side or another tab's
// global styles. Every existing component that already reads
// var(--color-accent)/var(--color-accent-cyan) (Button, StatCard, Avatar's
// gradient-brand, active NavLink state, ...) re-themes automatically -
// no component-level changes needed. `fontFamily` is a plain inherited CSS
// property, so setting it here cascades to every page under the shell the
// same way - previously it was only ever applied inside Settings' own
// live-preview panel, never to the app the admin actually uses
// (integration.md section 4: "the user's selected typography must
// actually be reflected in the UI").
const HEX_COLOR = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i

const safeColor = (value, fallback) => (typeof value === 'string' && HEX_COLOR.test(value) ? value : fallback)

export function useOrganizationThemeStyle(profile) {
    if (!profile) return undefined
    const primary = safeColor(profile.primaryColor, null)
    const secondary = safeColor(profile.secondaryColor, null)
    const fontFamily = typeof profile.fontFamily === 'string' && profile.fontFamily.trim() ? profile.fontFamily : null
    if (!primary && !secondary && !fontFamily) return undefined

    return {
        ...(primary ? { '--color-accent': primary } : {}),
        ...(secondary ? { '--color-accent-cyan': secondary, '--color-accent-dark': secondary } : {}),
        ...(fontFamily ? { fontFamily } : {}),
    }
}
