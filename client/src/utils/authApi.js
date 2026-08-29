import axios from "axios"
import { signInWithPopup } from "firebase/auth"
import { auth, googleProvider } from "../firebase"
import { ServerUrl } from "../constants"

// Popup, not redirect: redirect relies on Firebase relaying the credential
// from authDomain (a *.firebaseapp.com origin, different site from
// workmateiq.com) back into this app's storage, which Chrome's cross-site
// storage partitioning can silently drop - no error, just lands back on the
// login page. Popup keeps everything in a same-window round trip instead.
export const loginWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider)
    const idToken = await result.user.getIdToken()
    const response = await axios.post(ServerUrl + "/api/auth/google", { idToken }, { withCredentials: true })
    return response.data
}

export const loginAsGuest = async () => {
    const response = await axios.post(ServerUrl + "/api/auth/guest", {}, { withCredentials: true })
    return response.data
}
