import axios from "axios"
import { signInWithRedirect, getRedirectResult } from "firebase/auth"
import { auth, googleProvider } from "../firebase"
import { ServerUrl } from "../constants"

// Redirect instead of a popup - popups depend on window.open + postMessage
// back to the opener, which production browsers block often enough (popup
// blockers, third-party cookie restrictions) that Google sign-in looked
// broken in prod while working fine in local dev. A full-page redirect has
// none of that and needs no COOP/cookie cooperation from the browser.
export const loginWithGoogle = () => signInWithRedirect(auth, googleProvider)

// Call on mount of any page that can be a Google sign-in redirect target.
// Returns null if the page load isn't the tail end of a redirect flow.
export const completeGoogleRedirect = async () => {
    const result = await getRedirectResult(auth)
    if (!result) return null
    const idToken = await result.user.getIdToken()
    const response = await axios.post(ServerUrl + "/api/auth/google", { idToken }, { withCredentials: true })
    return response.data
}

export const loginAsGuest = async () => {
    const response = await axios.post(ServerUrl + "/api/auth/guest", {}, { withCredentials: true })
    return response.data
}
