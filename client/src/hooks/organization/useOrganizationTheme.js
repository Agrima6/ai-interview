// Turns an organization's branding.primaryColor/secondaryColor into inline
// CSS custom-property overrides scoped to the Organization shell's wrapper
// element - not `document.documentElement`, so a mis-signed-in tab never
// bleeds this org's colors into the platform-admin side or another tab's
// global styles. Every existing component that already reads
// var(--color-accent)/var(--color-accent-cyan) (Button, StatCard, Avatar's
// gradient-brand, active NavLink state, ...) re-themes automatically -
// no component-level changes needed.
const HEX_COLOR = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i

const safeColor = (value, fallback) => (typeof value === 'string' && HEX_COLOR.test(value) ? value : fallback)

export function useOrganizationThemeStyle(profile) {
    if (!profile) return undefined
    const primary = safeColor(profile.primaryColor, null)
    const secondary = safeColor(profile.secondaryColor, null)
    if (!primary && !secondary) return undefined

    return {
        ...(primary ? { '--color-accent': primary } : {}),
        ...(secondary ? { '--color-accent-cyan': secondary, '--color-accent-dark': secondary } : {}),
    }
}
