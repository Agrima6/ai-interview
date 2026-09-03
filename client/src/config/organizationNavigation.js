import { LayoutDashboard, ListChecks, FileQuestion, UsersRound, Mail, Settings } from 'lucide-react'
import { organizationPermissions } from '../permissions/organizationPermissions'

export function getNavigationForPath(pathname = '', profileType = '') {
    let prefix = '/platform/client'
    if (pathname.startsWith('/college')) {
        prefix = '/college'
    } else if (pathname.startsWith('/candidate')) {
        prefix = '/candidate'
    } else if (pathname.startsWith('/organization')) {
        prefix = '/organization'
    } else if (pathname.startsWith('/platform/client')) {
        prefix = '/platform/client'
    } else if (profileType === 'COLLEGE') {
        prefix = '/college'
    } else if (profileType === 'CANDIDATE') {
        prefix = '/candidate'
    } else if (profileType === 'ORGANIZATION') {
        prefix = '/organization'
    }

    const drivesLabel = prefix === '/college' ? 'Campus Drives' : prefix === '/candidate' ? 'My Drives' : 'Interview Drives'
    const teamLabel = prefix === '/college' ? 'Faculty & Team' : prefix === '/candidate' ? 'Profile' : 'Team'

    return [
        { key: 'dashboard', label: 'Dashboard', path: `${prefix}/dashboard`, icon: LayoutDashboard, permission: organizationPermissions.dashboard },
        { key: 'drives', label: drivesLabel, path: `${prefix}/drives`, icon: ListChecks, permission: organizationPermissions.drives },
        { key: 'question-sets', label: 'Question Sets', path: `${prefix}/question-sets`, icon: FileQuestion, permission: organizationPermissions.drives },
        { key: 'team', label: teamLabel, path: `${prefix}/team`, icon: UsersRound, permission: organizationPermissions.team },
        { key: 'templates', label: 'Templates', path: `${prefix}/templates`, icon: Mail, permission: organizationPermissions.templates },
        { key: 'settings', label: 'Settings', path: `${prefix}/settings`, icon: Settings, permission: organizationPermissions.settings },
    ]
}

export const organizationNavigation = getNavigationForPath('/platform/client')

