import express from "express"
import isAuth from "../middlewares/isAuth.js"
import requireRole from "../middlewares/requireRole.js"
import {
    createInvite,
    listInvites,
    getInviteByToken,
    startInterviewFromInvite,
    advanceToNextRound,
} from "../controllers/invite.controller.js"

const inviteRouter = express.Router()

// Public - candidate landing page needs to read invite/template details
// (and start the interview once signed in) without an admin session.
inviteRouter.get("/token/:token", getInviteByToken)
inviteRouter.post("/token/:token/start", isAuth, startInterviewFromInvite)
inviteRouter.post("/token/:token/next-round", isAuth, advanceToNextRound)

inviteRouter.post("/", isAuth, requireRole("admin", "superadmin"), createInvite)
inviteRouter.get("/", isAuth, requireRole("admin", "superadmin"), listInvites)

export default inviteRouter
