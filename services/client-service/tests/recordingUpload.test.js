import test from "node:test"
import assert from "node:assert/strict"
import { uploadRecordingChunk } from "../middlewares/recordingUpload.js"

// Run just the file filter the way multer does: (req, file, cb).
const filter = (partType, declared) => new Promise((resolve) => {
    uploadRecordingChunk.fileFilter({ body: declared === undefined ? {} : { mimeType: declared } }, { mimetype: partType }, (err, ok) => resolve({ err, ok }))
})
// multer exposes the options on the instance it builds
test("labelled webm/mp4 slices are accepted, with or without codec parameters", async () => {
    for (const t of ["video/webm", "video/webm;codecs=vp8,opus", "audio/webm;codecs=opus", "video/mp4;codecs=avc1"]) assert.equal((await filter(t)).ok, true, t)
})
test("a slice sent as text/plain, octet-stream or untyped is accepted when the recorder declared an allowed type", async () => {
    for (const t of ["text/plain", "application/octet-stream", ""]) assert.equal((await filter(t, "video/webm;codecs=vp8,opus")).ok, true, t)
})
test("an unlabelled slice with no allowed declared type is refused, and the error names the received type", async () => {
    const r = await filter("text/plain", undefined)
    assert.ok(r.err && /text\/plain/.test(r.err.message))
    assert.ok((await filter("text/plain", "text/html")).err)
})
test("real other types are refused even if a webm type is declared", async () => {
    assert.ok((await filter("application/pdf", "video/webm")).err)
    assert.ok((await filter("image/png", "video/webm")).err)
})
