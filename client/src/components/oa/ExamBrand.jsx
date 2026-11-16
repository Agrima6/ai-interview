import React, { useState } from 'react'
import { resolveAssetUrl } from '../../api/client'
import workmateLogo from '../../assets/landing/logo.webp'

/** Logo and name side by side. With no organization known yet it shows WorkmateIQ. `brand` is `{ name, logoPath }`. */
export default function ExamBrand({ brand, size = 36, className = '' }) {
    const [broken, setBroken] = useState(false)
    const name = brand?.name
    if (!name) {
        return <span className={`inline-flex items-center gap-2.5 ${className}`}><img src={workmateLogo} alt='' style={{ width: size, height: size }} className='rounded-full' /><span className='text-[19px] font-medium tracking-tight text-ink'>WorkmateIQ</span></span>
    }
    const logo = brand.logoPath && !broken ? resolveAssetUrl(brand.logoPath) : null
    return (
        <span className={`inline-flex items-center gap-2.5 min-w-0 ${className}`}>
            {logo
                ? <img src={logo} alt='' onError={() => setBroken(true)} style={{ height: size, maxWidth: size * 4 }} className='w-auto object-contain shrink-0' />
                : <span style={{ width: size, height: size }} className='rounded-full bg-accent text-white flex items-center justify-center font-bold shrink-0' aria-hidden='true'>{name.charAt(0).toUpperCase()}</span>}
            <span className='text-[17px] font-semibold tracking-tight text-ink truncate'>{name}</span>
        </span>
    )
}
