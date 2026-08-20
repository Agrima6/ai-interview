import mongoose from "mongoose"

const paymentSchema = new mongoose.Schema({
     userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    planId: String,
    amount: { type: Number, min: 0 },
    credits: { type: Number, min: 0 },
    razorpayOrderId: String,
    razorpayPaymentId: String,
    status: {
      type: String,
      enum: ["created", "paid", "failed"],
      default: "created",
    },
},{timestamps:true})

const Payment = mongoose.model("Payment",paymentSchema)

export default Payment