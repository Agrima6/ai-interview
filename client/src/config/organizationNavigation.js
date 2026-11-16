import { LayoutDashboard, ListChecks, FileQuestion, UsersRound, Mail, BarChart3, Settings, ClipboardCheck } from 'lucide-react'
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

    const isCollege = prefix === '/college'
    const drivesLabel = isCollege ? 'Exam Drives' : prefix === '/candidate' ? 'My Drives' : 'Interview Drives'
    const teamLabel = prefix === '/college' ? 'Faculty & Team' : prefix === '/candidate' ? 'Profile' : 'Team'

    // Online Assessment is its own room; candidates applying for jobs never see it.
    const onlineAssessment = prefix === '/candidate' ? [] : [{ key: 'online-assessment', label: 'Online Assessment', path: '/oa/admin', icon: ClipboardCheck, permission: organizationPermissions.drives }]

    return [
        { key: 'dashboard', label: 'Dashboard', path: `${prefix}/dashboard`, icon: LayoutDashboard, permission: organizationPermissions.dashboard },
        { key: 'drives', label: drivesLabel, path: `${prefix}/drives`, icon: ListChecks, permission: organizationPermissions.drives },
        ...onlineAssessment,
        { key: 'question-sets', label: 'Question Sets', path: `${prefix}/question-sets`, icon: FileQuestion, permission: organizationPermissions.drives },
        { key: 'candidates', label: isCollege ? 'Students' : 'Candidates', path: `${prefix}/candidates`, icon: UsersRound, permission: organizationPermissions.candidates },
        { key: 'team', label: teamLabel, path: `${prefix}/team`, icon: UsersRound, permission: organizationPermissions.team },
        { key: 'templates', label: 'Templates', path: `${prefix}/templates`, icon: Mail, permission: organizationPermissions.templates },
        { key: 'reports', label: isCollege ? 'Results' : 'Reports', path: `${prefix}/reports`, icon: BarChart3, permission: organizationPermissions.reports },
        { key: 'settings', label: 'Settings', path: `${prefix}/settings`, icon: Settings, permission: organizationPermissions.settings },
    ]
}

export const organizationNavigation = getNavigationForPath('/platform/client')

