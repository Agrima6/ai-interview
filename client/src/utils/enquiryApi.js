import axios from "axios"
import { ServerUrl } from "../constants"

export const submitEnquiry = async (payload) => {
    const response = await axios.post(ServerUrl + "/api/enquiries", payload)
    return response.data
}
