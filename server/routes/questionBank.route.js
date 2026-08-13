import express from "express"
import isAuth from "../middlewares/isAuth.js"
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

// Any signed-in user can conduct interviews - no admin role required. Each
// user gets a personal workspace auto-provisioned on first use (see
// utils/orgProvision.js), so this only needs to confirm they're logged in.
questionBankRouter.use(isAuth)

questionBankRouter.post("/", createQuestionBank)
questionBankRouter.post("/upload", upload.single("file"), uploadQuestionBank)
questionBankRouter.get("/", listQuestionBanks)
questionBankRouter.get("/:id", getQuestionBank)
questionBankRouter.patch("/:id", updateQuestionBank)
questionBankRouter.delete("/:id", deleteQuestionBank)

export default questionBankRouter
