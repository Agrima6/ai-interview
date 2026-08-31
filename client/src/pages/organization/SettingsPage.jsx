import React, { useState, useEffect } from 'react'
import { Palette, Upload, Globe, Building2, Check, Sparkles, Type, Mail } from 'lucide-react'
import OrganizationLayout from '../../components/organization/OrganizationLayout'
import { Card, Button, Input, Select } from '../../components/ui'
import { getOrganizationProfile, updateOrganizationBranding } from '../../api/organization/organizationApi'
import Avatar from '../../components/ui/Avatar'

const TYPOGRAPHY_OPTIONS = [
  { value: 'Inter, sans-serif', label: 'Inter (Modern & Clean)' },
  { value: 'Outfit, sans-serif', label: 'Outfit (Sleek Geometric)' },
  { value: '"Plus Jakarta Sans", sans-serif', label: 'Plus Jakarta Sans (Corporate Tech)' },
  { value: 'Roboto, sans-serif', label: 'Roboto (Standard Professional)' },
  { value: '"DM Sans", sans-serif', label: 'DM Sans (Editorial & Friendly)' },
]

function SettingsPage() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [error, setError] = useState('')

  // Form states
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#2563EB')
  const [secondaryColor, setSecondaryColor] = useState('#06B6D4')
  const [fontFamily, setFontFamily] = useState('Inter, sans-serif')
  const [logoPreview, setLogoPreview] = useState('')

  useEffect(() => {
    getOrganizationProfile()
      .then((data) => {
        setProfile(data)
        if (data?.name) setName(data.name)
        if (data?.primaryContact?.email) setEmail(data.primaryContact.email)
        if (data?.branding?.primaryColor) setPrimaryColor(data.branding.primaryColor)
        if (data?.branding?.secondaryColor) setSecondaryColor(data.branding.secondaryColor)
        if (data?.branding?.fontFamily) setFontFamily(data.branding.fontFamily)
        if (data?.logoUrl || data?.branding?.logoUrl) setLogoPreview(data.logoUrl || data.branding?.logoUrl)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => setLogoPreview(event.target?.result || '')
      reader.readAsDataURL(file)
    }
  }

  const handleSaveSettings = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await updateOrganizationBranding({
        name,
        email,
        primaryColor,
        secondaryColor,
        fontFamily,
        logoUrl: logoPreview,
      })

      // Apply CSS dynamic theme updates live to document root
      document.documentElement.style.setProperty('--color-accent', primaryColor)
      document.documentElement.style.setProperty('--accent', primaryColor)
      document.documentElement.style.setProperty('--color-accent-cyan', secondaryColor)
      document.body.style.fontFamily = fontFamily

      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 2500)
    } catch (err) {
      setError(err.message || 'Could not save settings.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <OrganizationLayout
      title="Portal & Branding Settings"
      description="Customize portal organization details, email, branding logo, colors, and typography."
    >
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Settings Form */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSaveSettings} className="space-y-6">
            {/* Organization Info Card */}
            <Card className="p-6">
              <h2 className="font-display text-[16px] font-bold text-ink mb-4 flex items-center gap-2">
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
                <div className="grid sm:grid-cols-2 gap-4">
                  <Input
                    label="Primary Contact Email Address *"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@acme.com"
                    required
                  />
                  <Input
                    label="Portal Domain Prefix"
                    value={`${(name || 'myorg').toLowerCase().replace(/[^a-z0-9]+/g, '')}.workmateiq.com`}
                    readOnly
                  />
                </div>
              </div>
            </Card>

            {/* Custom Branding & Typography Card */}
            <Card className="p-6 space-y-5">
              <h2 className="font-display text-[16px] font-bold text-ink mb-4 flex items-center gap-2">
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
                  options={TYPOGRAPHY_OPTIONS}
                />
              </div>

              {/* Color Pickers */}
              <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-line">
                <div>
                  <label className="block text-[13px] font-semibold text-ink mb-1.5">Primary Accent Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-10 h-10 rounded-lg border border-line cursor-pointer p-0.5"
                    />
                    <Input
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      placeholder="#2563EB"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-ink mb-1.5">Secondary Accent Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-10 h-10 rounded-lg border border-line cursor-pointer p-0.5"
                    />
                    <Input
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      placeholder="#06B6D4"
                    />
                  </div>
                </div>
              </div>

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
          <Card className="p-6 sticky top-6">
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
                <span className="text-text-secondary">{TYPOGRAPHY_OPTIONS.find((f) => f.value === fontFamily)?.label}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </OrganizationLayout>
  )
}

export default SettingsPage
