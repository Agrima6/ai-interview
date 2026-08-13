import express from "express"
import isAuth from "../middlewares/isAuth.js"
import {
    createInvite,
    listInvites,
    getInviteByToken,
    startInterviewFromInvite,
    advanceToNextRound,
    resendInvite,
} from "../controllers/invite.controller.js"

const inviteRouter = express.Router()

// Public - candidate landing page needs to read invite/template details
// (and start the interview once signed in) without an admin session.
inviteRouter.get("/token/:token", getInviteByToken)
inviteRouter.post("/token/:token/start", isAuth, startInterviewFromInvite)
inviteRouter.post("/token/:token/next-round", isAuth, advanceToNextRound)

inviteRouter.post("/", isAuth, createInvite)
inviteRouter.get("/", isAuth, listInvites)
inviteRouter.post("/:id/resend", isAuth, resendInvite)

export default inviteRouter
