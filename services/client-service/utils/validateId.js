import mongoose from "mongoose"
import { ApiError } from "./response.js"

// Rejects a malformed id with a clean 404 before it ever reaches Mongoose -
// an invalid ObjectId string passed straight to findOne/findById throws a
// raw CastError that would otherwise propagate to the generic error
// handler instead of a proper "not found".
export const requireValidObjectId = (id, notFoundCode, notFoundMessage) => {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(404, notFoundCode, notFoundMessage)
    }
}
