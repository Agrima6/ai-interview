import mongoose from "mongoose"

const enquirySchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    mobile: { type: String, default: null },
    clientType: {
        type: String,
        enum: ["Organization", "College", "Candidate"],
        required: true,
    },
    subject: { type: String, default: null },
    message: { type: String, required: true },
    status: {
        type: String,
        enum: ["new", "contacted", "closed"],
        default: "new",
    },
}, { timestamps: true })

const Enquiry = mongoose.model("Enquiry", enquirySchema)

export default Enquiry
