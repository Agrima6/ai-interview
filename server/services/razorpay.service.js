import dotenv from "dotenv"
dotenv.config()
import Razorpay from "razorpay"

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_placeholder",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "rzp_placeholder_secret",
});

export default razorpay