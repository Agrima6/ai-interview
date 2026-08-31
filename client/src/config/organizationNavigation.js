import { LayoutDashboard, ListChecks, Users, UsersRound, Mail, Settings } from 'lucide-react'
import { organizationPermissions } from '../permissions/organizationPermissions'

// Drive-specific navigation (rounds, questions, rankings, ...) lives inside
// the Drive experience itself, not here - this is only the top-level
// Organization shell nav.
export const organizationNavigation = [
    { key: 'dashboard', label: 'Dashboard', path: '/platform/client/dashboard', icon: LayoutDashboard, permission: organizationPermissions.dashboard },
    { key: 'drives', label: 'Interview Drives', path: '/platform/client/drives', icon: ListChecks, permission: organizationPermissions.drives },
    { key: 'candidates', label: 'Candidates', path: '/platform/client/candidates', icon: Users, permission: organizationPermissions.candidates },
    { key: 'team', label: 'Team', path: '/platform/client/team', icon: UsersRound, permission: organizationPermissions.team },
    { key: 'templates', label: 'Templates', path: '/platform/client/templates', icon: Mail, permission: organizationPermissions.templates },
    { key: 'settings', label: 'Settings', path: '/platform/client/settings', icon: Settings, permission: organizationPermissions.settings },
]
