import mongoose from "mongoose"

const connectDb = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL)
        console.log(`[${process.env.SERVICE_NAME}] MongoDB connected`)
    } catch (error) {
        console.log(`[${process.env.SERVICE_NAME}] MongoDB connection error`, error)
        process.exit(1)
    }
}

export default connectDb
