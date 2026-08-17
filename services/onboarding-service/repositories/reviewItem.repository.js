import ReviewItem from "../models/reviewItem.model.js"

export const createMany = (items) => ReviewItem.insertMany(items)
export const findOpenForOnboarding = (onboardingId) => ReviewItem.find({ onboardingId, status: "OPEN" })
export const resolveAllForOnboarding = (onboardingId) =>
    ReviewItem.updateMany({ onboardingId, status: "OPEN" }, { status: "RESOLVED", resolvedAt: new Date() })
