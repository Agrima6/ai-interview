import React from 'react'
import OrganizationLayout from '../../components/organization/OrganizationLayout'
import OaSessionGate from '../../components/oa/OaSessionGate'
import OaDrivePage from '../oa/OaDrivePage'

/** A round-wise drive (online tests and AI interviews as rounds), inside the organization's own workspace. */
export default function HiringDrivePage() {
    return (
        <OrganizationLayout title='Drives' description=' '>
            <div className='max-w-[1280px] mx-auto'>
                <OaSessionGate><OaDrivePage /></OaSessionGate>
            </div>
        </OrganizationLayout>
    )
}
