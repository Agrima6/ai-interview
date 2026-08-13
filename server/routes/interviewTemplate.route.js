import express from "express"
import isAuth from "../middlewares/isAuth.js"
import {
    createInterviewTemplate,
    listInterviewTemplates,
    getInterviewTemplate,
    updateInterviewTemplate,
    deleteInterviewTemplate,
} from "../controllers/interviewTemplate.controller.js"

const interviewTemplateRouter = express.Router()

// Any signed-in user can conduct interviews - see questionBank.route.js.
interviewTemplateRouter.use(isAuth)

interviewTemplateRouter.post("/", createInterviewTemplate)
interviewTemplateRouter.get("/", listInterviewTemplates)
interviewTemplateRouter.get("/:id", getInterviewTemplate)
interviewTemplateRouter.patch("/:id", updateInterviewTemplate)
interviewTemplateRouter.delete("/:id", deleteInterviewTemplate)

export default interviewTemplateRouter
