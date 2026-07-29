import jwt from "jsonwebtoken"
import User from "../models/user.model.js"


const isAuth = async (req,res,next) => {
    try {
        let {token} = req.cookies

        if(!token){
            return res.status(400).json({message:"user does not have a token"})
        }
        const verifyToken = jwt.verify(token , process.env.JWT_SECRET)

        if(!verifyToken){
            return res.status(400).json({message:"user does not have a valid token"})
        }

        const user = await User.findById(verifyToken.userId)
        if(!user){
            return res.status(401).json({message:"user does not exist"})
        }
        if(user.active === false){
            return res.status(403).json({message:"This account has been deactivated"})
        }

        req.userId = user._id
        req.user = user

        next()


    } catch (error) {
        return res.status(500).json({message:`isAuth error ${error}`})
    }

}

export default isAuth
