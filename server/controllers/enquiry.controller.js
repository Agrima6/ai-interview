import Enquiry from "../models/enquiry.model.js"

const VALID_CLIENT_TYPES = ["Organization", "College", "Candidate"]

export const createEnquiry = async (req, res) => {
    try {
        const name = req.body.name?.trim()
        const email = req.body.email?.trim().toLowerCase()
        const mobile = req.body.mobile?.trim() || null
        const clientType = VALID_CLIENT_TYPES.find((t) => t === req.body.clientType)
        const subject = req.body.subject?.trim() || null
        const message = req.body.message?.trim()

        if (!name || !email || !message) {
            return res.status(400).json({ message: "name, email and message are required" })
        }
        if (!clientType) {
            return res.status(400).json({ message: `clientType must be one of ${VALID_CLIENT_TYPES.join(", ")}` })
        }

        const enquiry = await Enquiry.create({ name, email, mobile, clientType, subject, message })
        return res.status(201).json({ message: "Enquiry received", id: enquiry._id })
    } catch (error) {
        return res.status(500).json({ message: `failed to submit enquiry ${error}` })
    }
}

// Superadmin-only visibility into submitted enquiries - no dedicated UI yet,
// but useful for checking submissions came through without DB access.
export const listEnquiries = async (req, res) => {
    try {
        const enquiries = await Enquiry.find().sort({ createdAt: -1 }).limit(200)
        return res.json(enquiries)
    } catch (error) {
        return res.status(500).json({ message: `failed to list enquiries ${error}` })
    }
}
