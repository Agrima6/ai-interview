import genToken from "../config/token.js"
import User from "../models/user.model.js"
import { getFirebaseAuth } from "../config/firebaseAdmin.js"

const isProd = process.env.NODE_ENV === "production"
const authCookieOptions = {
    httpOnly:true,
    secure:isProd,
    // "strict"/"lax" won't be sent on cross-origin XHR at all, which breaks
    // login once the frontend and backend are on different domains in
    // production. "none" requires secure:true, which is already the case above.
    sameSite:isProd ? "none" : "strict",
    maxAge:7 * 24 * 60 * 60 * 1000
}

export const googleAuth = async (req,res) => {
    try {
        const {idToken} = req.body
        if(!idToken){
            return res.status(400).json({message:"idToken is required"})
        }

        let decoded
        try {
            decoded = await getFirebaseAuth().verifyIdToken(idToken)
        } catch (error) {
            return res.status(401).json({message:"Invalid or expired Google sign-in token"})
        }

        const email = decoded.email
        if(!email){
            return res.status(400).json({message:"Google account has no email"})
        }
        const name = decoded.name || email.split("@")[0]

        let user = await User.findOne({email})
        if(!user){
            user = await User.create({
                name ,
                email
            })
        }
        let token = await genToken(user._id)
        res.cookie("token" , token , authCookieOptions)

        return res.status(200).json(user)



    } catch (error) {
        return res.status(500).json({message:`Google auth error ${error}`})
    }

}

export const guestAuth = async (req,res) => {
    try {
        const email = "guest@ats-pro.local"
        let user = await User.findOne({email})
        if(!user){
            user = await User.create({
                name:"Guest",
                email
            })
        }
        let token = await genToken(user._id)
        res.cookie("token" , token , authCookieOptions)

        return res.status(200).json(user)

    } catch (error) {
        return res.status(500).json({message:`Guest auth error ${error}`})
    }
}

export const logOut = async (req,res) => {
    try {
        await res.clearCookie("token")
        return res.status(200).json({message:"LogOut Successfully"})
    } catch (error) {
         return res.status(500).json({message:`Logout error ${error}`})
    }
    
}