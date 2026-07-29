import axios from "axios"
import { ServerUrl } from "../constants"

const withOrg = (organizationId) => (organizationId ? { params: { organizationId } } : {})

export const addEmployee = async (name, email, organizationId) => {
    const response = await axios.post(ServerUrl + "/api/admin/employees", { name, email },
        { withCredentials: true, ...withOrg(organizationId) })
    return response.data
}

export const listEmployees = async (organizationId) => {
    const response = await axios.get(ServerUrl + "/api/admin/employees",
        { withCredentials: true, ...withOrg(organizationId) })
    return response.data
}

export const getEmployeeInterviews = async (employeeId, organizationId) => {
    const response = await axios.get(ServerUrl + `/api/admin/employees/${employeeId}/interviews`,
        { withCredentials: true, ...withOrg(organizationId) })
    return response.data
}

export const updateEmployee = async (employeeId, updates, organizationId) => {
    const response = await axios.patch(ServerUrl + `/api/admin/employees/${employeeId}`, updates,
        { withCredentials: true, ...withOrg(organizationId) })
    return response.data
}

export const getTrends = async (organizationId) => {
    const response = await axios.get(ServerUrl + "/api/admin/trends",
        { withCredentials: true, ...withOrg(organizationId) })
    return response.data
}

export const createOrganization = async (orgName, adminName, adminEmail) => {
    const response = await axios.post(ServerUrl + "/api/admin/organizations", { orgName, adminName, adminEmail },
        { withCredentials: true })
    return response.data
}

export const listOrganizations = async () => {
    const response = await axios.get(ServerUrl + "/api/admin/organizations", { withCredentials: true })
    return response.data
}

export const deleteOrganization = async (organizationId) => {
    const response = await axios.delete(ServerUrl + `/api/admin/organizations/${organizationId}`, { withCredentials: true })
    return response.data
}
