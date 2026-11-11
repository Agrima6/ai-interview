import React, { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Palette, Upload, Building2, Check, Sparkles, Mail } from 'lucide-react'
import OrganizationLayout from '../../components/organization/OrganizationLayout'
import { Card, Button, Input, Select, Skeleton } from '../../components/ui'
import { getOrganizationProfile, updateOrganizationBranding } from '../../api/organization/organizationApi'
import Avatar from '../../components/ui/Avatar'
import { resolveAssetUrl } from '../../api/client'
import { useAuth } from '../../hooks/useAuth.jsx'
import SmtpSettingsSection from '../../components/organization/SmtpSettingsSection'

const TYPOGRAPHY_OPTIONS = [
  { value: 'Inter, sans-serif', label: 'Inter (Modern & Clean)' },
  { value: 'Outfit, sans-serif', label: 'Outfit (Sleek Geometric)' },
  { value: '"Plus Jakarta Sans", sans-serif', label: 'Plus Jakarta Sans (Corporate Tech)' },
  { value: 'Roboto, sans-serif', label: 'Roboto (Standard Professional)' },
  { value: '"DM Sans", sans-serif', label: 'DM Sans (Editorial & Friendly)' },
]

const DEFAULT_PRIMARY = '#C4161F'
const DEFAULT_SECONDARY = '#D97706'
const HEX_COLOR = /^#[0-9a-f]{6}$/i

// <input type="color"> only accepts 6-digit hex; the API also stores #abc.
const expandHex = (c) => (/^#[0-9a-f]{3}$/i.test(c) ? `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}` : c)

const SETTINGS_TABS = [
  { id: 'branding', label: 'Branding & Typography', sub: 'Logo, colours, font and contact', icon: Palette },
  { id: 'email', label: 'Email (SMTP)', sub: 'Sender identity and delivery', icon: Mail },
]

function SettingsPage() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [activeSection, setActiveSection] = useState('branding')
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [error, setError] = useState('')

  // Form states
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_PRIMARY)
  const [secondaryColor, setSecondaryColor] = useState(DEFAULT_SECONDARY)
  const [fontFamily, setFontFamily] = useState('Inter, sans-serif')
  const [logoPreview, setLogoPreview] = useState('')
  const [logoChanged, setLogoChanged] = useState(false)

  useEffect(() => {
    getOrganizationProfile()
      .then((data) => {
        setProfile(data)
        if (data?.name) setName(data.name)
        // GET /organizations/me returns branding as flat fields (primaryColor,
        // fontFamily, ...), not nested under `branding` - reading the nested
        // shape left every field at its default, so a save overwrote the real
        // colours. The contact email defaults to the signed-in account.
        const contactEmail = data?.primaryContact?.email || data?.email || user?.email
        if (contactEmail) setEmail(contactEmail)
        const savedPrimary = data?.primaryColor || data?.branding?.primaryColor
        const savedSecondary = data?.secondaryColor || data?.branding?.secondaryColor
        const savedFont = data?.fontFamily || data?.branding?.fontFamily
        if (savedPrimary) setPrimaryColor(expandHex(savedPrimary))
        if (savedSecondary) setSecondaryColor(expandHex(savedSecondary))
        if (savedFont) setFontFamily(savedFont)
        if (data?.logoUrl || data?.branding?.logoUrl) setLogoPreview(resolveAssetUrl(data.logoUrl || data.branding?.logoUrl))
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => { setLogoPreview(event.target?.result || ''); setLogoChanged(true) }
      reader.readAsDataURL(file)
    }
  }

  const handleSaveSettings = async (e) => {
    e.preventDefault()
    setError('')
    if (!HEX_COLOR.test(primaryColor) || !HEX_COLOR.test(secondaryColor)) {
      setError('Colours must be 6-digit hex values like #C4161F.')
      return
    }
    setSaving(true)
    try {
      // The logo is only sent when a new file was picked: the preview of an
      // existing one is a resolved/signed URL, and echoing it back would
      // overwrite the stored logo (or clear it when the preview is empty).
      await updateOrganizationBranding({
        name,
        ...(email ? { email } : {}),
        primaryColor,
        secondaryColor,
        fontFamily,
        ...(logoChanged ? { logoUrl: logoPreview } : {}),
      })
      setLogoChanged(false)

      // The Organization shell (OrganizationLayout) reads branding through
      // its own useOrganizationProfile() query and re-themes automatically
      // once it refetches - invalidating here (rather than writing to
      // document.documentElement directly) means the new colors apply only
      // within this organization's own shell, never bleeding into another
      // tab/tenant that happens to share the same browser process.
      queryClient.invalidateQueries({ queryKey: ['organization', 'profile'] })

      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 2500)
    } catch (err) {
      setError(err.message || 'Could not save settings.')
    } finally {
      setSaving(false)
    }
  }

  // A font saved earlier that is no longer in the preset list still has to
  // show as selected, otherwise the dropdown looks empty and saving swaps it.
  const fontOptions = TYPOGRAPHY_OPTIONS.some((f) => f.value === fontFamily)
    ? TYPOGRAPHY_OPTIONS
    : [{ value: fontFamily, label: fontFamily.split(',')[0].replace(/"/g, '') }, ...TYPOGRAPHY_OPTIONS]

  const resetColors = () => { setPrimaryColor(DEFAULT_PRIMARY); setSecondaryColor(DEFAULT_SECONDARY) }

  if (loading) {
    return (
      <OrganizationLayout title="Settings" description="Your organization, branding, typography and email delivery.">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6"><Skeleton className="h-64" /><Skeleton className="h-96" /></div>
          <Skeleton className="h-72" />
        </div>
      </OrganizationLayout>
    )
  }

  return (
    <OrganizationLayout
      title="Settings"
      description="Your organization, branding, typography and email delivery."
    >
      <div className="grid lg:grid-cols-[260px_minmax(0,1fr)] gap-5 items-start">
        <nav aria-label="Settings sections" className="ui-rise flex lg:flex-col gap-1.5 p-2 rounded-[20px] bg-card border border-line overflow-x-auto lg:sticky lg:top-6">
          {SETTINGS_TABS.map((t) => {
            const on = activeSection === t.id
            return (
              <button
                key={t.id}
                type="button"
                aria-current={on ? 'page' : undefined}
                onClick={() => setActiveSection(t.id)}
                className={`flex items-center gap-3 text-left px-3.5 py-3 rounded-[14px] transition-all shrink-0 lg:shrink ${on ? 'bg-accent text-white shadow-[0_10px_22px_-12px_var(--color-accent)]' : 'text-[#3a4262] hover:bg-accent/[0.06]'}`}
              >
                <t.icon size={19} className="shrink-0" />
                <span className="flex flex-col">
                  <span className="font-bold text-[14px]">{t.label}</span>
                  <span className={`hidden lg:block text-[12px] ${on ? 'text-white/80' : 'text-text-secondary'}`}>{t.sub}</span>
                </span>
              </button>
            )
          })}
        </nav>

        <div key={activeSection} className="ui-fade min-w-0">
      {activeSection === 'email' ? (
        <SmtpSettingsSection />
      ) : (
      <div className="grid xl:grid-cols-[minmax(0,1fr)_300px] gap-6">
        {/* Main Settings Form */}
        <div className="space-y-6">
          <form onSubmit={handleSaveSettings} className="space-y-6">
            {/* Organization Info Card */}
            <Card className="p-6">
              <h2 className="text-[16px] font-bold text-ink mb-4 flex items-center gap-2">
                <Building2 size={18} className="text-accent" /> Organization & Account Details
              </h2>
              <div className="space-y-4">
                <Input
                  label="Organization Name *"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Acme Tech Corporation"
                  required
                />
                <div className="grid gap-4">
                  <Input
                    label="Primary Contact Email Address *"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@acme.com"
                    required
                  />
                </div>
              </div>
            </Card>

            {/* Custom Branding & Typography Card */}
            <Card className="p-6 space-y-5">
              <h2 className="text-[16px] font-bold text-ink mb-4 flex items-center gap-2">
                <Palette size={18} className="text-accent" /> Visual Branding & Typography
              </h2>

              {/* Logo Upload */}
              <div>
                <label className="block text-[13px] font-semibold text-ink mb-2">Organization Logo</label>
                <div className="flex items-center gap-4">
                  <Avatar src={logoPreview} name={name || 'Org'} size="lg" />
                  <div>
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line bg-black/[0.03] dark:bg-white/[0.05] text-[13px] font-semibold text-ink hover:bg-black/[0.06] transition-colors">
                      <Upload size={14} /> Upload New Logo
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>
                    <p className="text-[12px] text-text-secondary mt-1">PNG or SVG format (min 120x120px)</p>
                  </div>
                </div>
              </div>

              {/* Typography Font Picker */}
              <div className="pt-2 border-t border-line">
                <Select
                  label="Portal Typography / Font Style"
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  options={fontOptions}
                />
              </div>

              {/* Color Pickers */}
              <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-line">
                <div>
                  <label className="block text-[13px] font-semibold text-ink mb-1.5">Primary Accent Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={HEX_COLOR.test(primaryColor) ? primaryColor : DEFAULT_PRIMARY}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-10 h-10 rounded-lg border border-line cursor-pointer p-0.5"
                    />
                    <Input
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      placeholder="#C4161F" maxLength={7}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-ink mb-1.5">Secondary Accent Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={HEX_COLOR.test(secondaryColor) ? secondaryColor : DEFAULT_SECONDARY}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-10 h-10 rounded-lg border border-line cursor-pointer p-0.5"
                    />
                    <Input
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      placeholder="#D97706" maxLength={7}
                    />
                  </div>
                </div>
              </div>

              <button type="button" onClick={resetColors} className="text-[13px] font-semibold text-accent hover:underline">Reset colours to default</button>

              {error && <p className="text-[13px] text-red-500 font-medium">{error}</p>}

              <div className="pt-3">
                <Button type="submit" disabled={saving}>
                  {savedSuccess ? <Check size={14} /> : <Sparkles size={14} />} {saving ? 'Saving...' : savedSuccess ? 'Settings Saved Successfully!' : 'Save Settings & Branding'}
                </Button>
              </div>
            </Card>
          </form>
        </div>

        {/* Live Preview Panel */}
        <div>
          <Card className="p-6 xl:sticky xl:top-6">
            <h3 className="text-[14px] font-bold text-ink mb-4 flex items-center gap-2">
              <Sparkles size={16} className="text-accent" /> Live Brand Preview
            </h3>
            <div className="p-4 rounded-xl border border-line bg-black/[0.02] dark:bg-white/[0.04] space-y-4" style={{ fontFamily }}>
              <div className="flex items-center gap-3">
                <Avatar src={logoPreview} name={name || 'Org'} size="md" />
                <div>
                  <div className="font-bold text-[14px] text-ink">{name || 'Your Organization'}</div>
                  <div className="text-[11px] text-text-secondary">{email || 'admin@organization.com'}</div>
                </div>
              </div>

              <div className="p-3 rounded-lg text-white font-semibold text-[13px] flex items-center justify-between shadow-sm" style={{ backgroundColor: primaryColor }}>
                <span>Primary Accent Action</span>
                <Check size={14} />
              </div>

              <div className="p-3 rounded-lg font-semibold text-[13px] flex items-center justify-between border" style={{ borderColor: secondaryColor, color: secondaryColor }}>
                <span>Secondary Highlight</span>
                <Sparkles size={14} />
              </div>

              <div className="p-3 rounded-lg border border-line bg-card text-[12.5px] text-ink">
                <span className="font-bold block mb-1">Selected Font Style:</span>
                <span className="text-text-secondary">{fontOptions.find((f) => f.value === fontFamily)?.label}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
      )}
        </div>
      </div>
    </OrganizationLayout>
  )
}

export default SettingsPage
