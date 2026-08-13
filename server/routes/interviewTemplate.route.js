import express from "express"
import isAuth from "../middlewares/isAuth.js"
import requireRole from "../middlewares/requireRole.js"
import {
    createInterviewTemplate,
    listInterviewTemplates,
    getInterviewTemplate,
    updateInterviewTemplate,
    deleteInterviewTemplate,
} from "../controllers/interviewTemplate.controller.js"

const interviewTemplateRouter = express.Router()

interviewTemplateRouter.use(isAuth, requireRole("admin", "superadmin"))

interviewTemplateRouter.post("/", createInterviewTemplate)
interviewTemplateRouter.get("/", listInterviewTemplates)
interviewTemplateRouter.get("/:id", getInterviewTemplate)
interviewTemplateRouter.patch("/:id", updateInterviewTemplate)
interviewTemplateRouter.delete("/:id", deleteInterviewTemplate)

export default interviewTemplateRouter
