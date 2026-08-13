import express from "express"
import isAuth from "../middlewares/isAuth.js"
import requireRole from "../middlewares/requireRole.js"
import { upload } from "../middlewares/multer.js"
import {
    createQuestionBank,
    uploadQuestionBank,
    listQuestionBanks,
    getQuestionBank,
    updateQuestionBank,
    deleteQuestionBank,
} from "../controllers/questionBank.controller.js"

const questionBankRouter = express.Router()

questionBankRouter.use(isAuth, requireRole("admin", "superadmin"))

questionBankRouter.post("/", createQuestionBank)
questionBankRouter.post("/upload", upload.single("file"), uploadQuestionBank)
questionBankRouter.get("/", listQuestionBanks)
questionBankRouter.get("/:id", getQuestionBank)
questionBankRouter.patch("/:id", updateQuestionBank)
questionBankRouter.delete("/:id", deleteQuestionBank)

export default questionBankRouter
