import { useLocation } from 'react-router-dom'

/**
 * Where the round-wise drive pages live. Inside an organization's workspace they sit under its own drives
 * (".../drives/rounds/<id>"); the older stand-alone Online Assessment area keeps its own paths.
 */
export default function useOaBase() {
    const { pathname } = useLocation()
    if (pathname.startsWith('/oa/')) return { legacy: true, prefix: '', home: '/oa/admin', drives: '/oa/admin/drives', drive: (id) => `/oa/admin/drives/${id}`, aiDrive: null }
    const prefix = pathname.startsWith('/platform/client') ? '/platform/client' : '/organization'
    return { legacy: false, prefix, home: `${prefix}/dashboard`, drives: `${prefix}/drives`, drive: (id) => `${prefix}/drives/rounds/${id}`, aiDrive: (id) => `${prefix}/drives/${id}` }
}
