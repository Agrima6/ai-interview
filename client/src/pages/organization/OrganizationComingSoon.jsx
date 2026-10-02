import React from 'react'
import { Construction } from 'lucide-react'
import OrganizationLayout from '../../components/organization/OrganizationLayout'
import { EmptyState } from '../../components/ui'

// Placeholder for the nav destinations built in later phases (Drives,
// Candidates, Team, Templates, Settings) - keeps the sidebar fully
// navigable today instead of 404ing on unbuilt sections.
function OrganizationComingSoon({ title, description }) {
    return (
        <OrganizationLayout title={title} description={description}>
            <EmptyState icon={Construction} title={`${title} is coming soon`} description="This section is being built next." />
        </OrganizationLayout>
    )
}

export default OrganizationComingSoon
