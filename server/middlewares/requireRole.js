// Must run after isAuth (relies on req.user being attached already).
const requireRole = (...roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ message: "You don't have permission to do this." })
    }
    next()
}

export default requireRole
