import mongoose from "mongoose"

const connectDb = async () => {
    try {
        const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URL
        if (!mongoUri) {
            console.error(`[${process.env.SERVICE_NAME}] MONGO_URI/MONGODB_URL is not set!`)
            process.exit(1)
        }

        const options = {
            maxPoolSize: parseInt(process.env.MONGO_MAX_POOL_SIZE || "20", 10),
            minPoolSize: parseInt(process.env.MONGO_MIN_POOL_SIZE || "5", 10),
            serverSelectionTimeoutMS: parseInt(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || "5000", 10),
            socketTimeoutMS: parseInt(process.env.MONGO_SOCKET_TIMEOUT_MS || "45000", 10),
            connectTimeoutMS: parseInt(process.env.MONGO_CONNECT_TIMEOUT_MS || "10000", 10),
        }

        await mongoose.connect(mongoUri, options)
        console.log(`[${process.env.SERVICE_NAME}] MongoDB connected with pool size: min=${options.minPoolSize}, max=${options.maxPoolSize}`)
    } catch (error) {
        console.error(`[${process.env.SERVICE_NAME}] MongoDB connection error`, error)
        process.exit(1)
    }
}

export default connectDb
