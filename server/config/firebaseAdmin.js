import { initializeApp } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"

let app

// verifyIdToken() only needs projectId to check the token's `aud` claim - it
// verifies the signature against Google's public certs, so no service
// account credential is required here.
export const getFirebaseAuth = () => {
    if (!app) {
        app = initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID })
    }
    return getAuth(app)
}
