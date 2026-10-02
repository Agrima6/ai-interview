import * as communicationService from "../services/communication.service.js"

// GET /track/open/:id.gif - loaded as an <img> src by the recipient's mail
// client, so it's unauthenticated by nature (a mail client never sends our
// bearer tokens) and must always return a valid image regardless of
// whether the id is real, to avoid a broken-image icon in the email.
export const trackOpen = async (req, res) => {
    const id = req.params.id.replace(/\.gif$/, "")
    communicationService.trackOpen(id).catch(() => {})
    res.set({
        "Content-Type": "image/gif",
        "Cache-Control": "no-store, no-cache, must-revalidate, private",
        "Content-Length": communicationService.TRACKING_PIXEL_GIF.length,
    })
    res.end(communicationService.TRACKING_PIXEL_GIF)
}
