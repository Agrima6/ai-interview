import express from "express"
import isAuth from "../middlewares/isAuth.js"
import requireRole from "../middlewares/requireRole.js"
import { createEnquiry, listEnquiries } from "../controllers/enquiry.controller.js"

const enquiryRouter = express.Router()

// Public - the marketing landing page's enquiry form has no auth context.
enquiryRouter.post("/", createEnquiry)
enquiryRouter.get("/", isAuth, requireRole("superadmin"), listEnquiries)

export default enquiryRouter
