import express from "express"
import isAuth from "../middlewares/isAuth.js"
import requireRole from "../middlewares/requireRole.js"
import {
    addEmployee,
    bulkAddEmployees,
    listEmployees,
    getEmployeeInterviews,
    updateEmployee,
    getTrends,
    createOrganization,
    listOrganizations,
    deleteOrganization,
} from "../controllers/admin.controller.js"

const adminRouter = express.Router()

adminRouter.use(isAuth, requireRole("admin", "superadmin"))

adminRouter.post("/employees", addEmployee)
adminRouter.post("/employees/bulk", bulkAddEmployees)
adminRouter.get("/employees", listEmployees)
adminRouter.get("/employees/:id/interviews", getEmployeeInterviews)
adminRouter.patch("/employees/:id", updateEmployee)
adminRouter.get("/trends", getTrends)

adminRouter.post("/organizations", requireRole("superadmin"), createOrganization)
adminRouter.get("/organizations", requireRole("superadmin"), listOrganizations)
adminRouter.delete("/organizations/:id", requireRole("superadmin"), deleteOrganization)

export default adminRouter
