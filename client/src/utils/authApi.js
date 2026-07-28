import axios from "axios"
import { signInWithPopup } from "firebase/auth"
import { auth, googleProvider } from "../firebase"
import { ServerUrl } from "../constants"

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
