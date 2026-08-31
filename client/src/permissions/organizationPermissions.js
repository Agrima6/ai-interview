// Organization-side (client-portal) permission constants. Mirrors the
// naming convention of featurePermissions.js/actionPermissions.js on the
// platform-admin side, but auth-service does not issue any of these yet -
// the only role seeded for this portal today (CLIENT_ADMIN) only carries
// CLIENT_SELF_READ (see auth-service/scripts/seed.js). organizationNav.js
// therefore treats a missing/unrecognized permission as visible rather than
// hiding the whole nav, with a TODO at the one place that matters once
// auth-service starts issuing these.
export const organizationPermissions = {
    dashboard: 'organization.dashboard.view',
    drives: 'organization.drives.view',
    driveCreate: 'organization.drives.create',
    driveUpdate: 'organization.drives.update',
    candidates: 'organization.candidates.view',
    candidatesExport: 'organization.candidates.export',
    team: 'organization.team.manage',
    templates: 'organization.templates.view',
    settings: 'organization.settings.update',
}
