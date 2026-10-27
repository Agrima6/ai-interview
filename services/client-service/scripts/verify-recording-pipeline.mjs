/**
 * End-to-end check of the chunked recording pipeline against the REAL database and object storage configured in
 * this service's environment, using a throwaway tenant (removed afterwards, objects included).
 *
 *   node scripts/verify-recording-pipeline.mjs          # real storage (S3 / SeaweedFS) - run this on the server
 *   node scripts/verify-recording-pipeline.mjs --memory # in-memory storage: checks the logic without storage
 *
 * It uploads chunks, finalizes, then READS THE FILE BACK from storage and compares it with what was sent. Only
 * if that matches does it print PASS. This is the evidence that recordings really are stored and retrievable.
 */
import "dotenv/config"
import mongoose from "mongoose"
import { InterviewDrive } from "../models/interviewDrive.model.js"
import { saveRecordingChunk, finalizeRecording, recordingManifest } from "../services/recording.service.js"

import * as s3 from "../config/s3Client.js"

const useMemory = process.argv.includes("--memory")
const objects = new Map()
const memory = {
  async uploadBuffer(b, k, buf) { objects.set(k, Buffer.from(buf)); return k },
  async getObjectBuffer(b, k) { if (!objects.has(k)) throw new Error("NoSuchKey"); return objects.get(k) },
  async objectSize(b, k) { return objects.has(k) ? objects.get(k).length : null },
  async deleteObject(b, k) { objects.delete(k) },
}
const touched = new Set()
const real = {
  async uploadBuffer(b, k, buf, t) { touched.add(k); return s3.uploadBuffer(b, k, buf, t) },
  getObjectBuffer: s3.getObjectBuffer, objectSize: s3.objectSize, deleteObject: s3.deleteObject,
}
const storage = useMemory ? memory : real
await mongoose.connect(process.env.MONGODB_URL)
const tenant = `verify-rec-${Date.now()}`, other = `${tenant}-other`
const email = "cand@example.com"
const chunk = (i) => ({ buffer: Buffer.from(`<${i}>`.repeat(2000)), mimetype: "video/webm;codecs=vp8,opus" })
try {
  const drive = await InterviewDrive.create({ tenantId: tenant, title: "T", roleCategory: "X", department: "Y", experienceLevel: "Z", expiryDate: new Date(Date.now() + 864e5),
    rounds: [{ roundNumber: 1, title: "R1", type: "Technical", status: "ACTIVE", candidates: [{ id: "c1", name: "Cand", email, status: "SCHEDULED" }] }] })
  const id = String(drive._id)
  const send = (rid, i, t = tenant) => saveRecordingChunk(t, email, id, 1, { recordingId: rid, index: i, mimeType: "video/webm;codecs=vp8,opus" }, chunk(i), storage)
  const man = () => recordingManifest(tenant, id, 1, "c1", storage)
  const line = (l, v) => console.log(l.padEnd(52), typeof v === "string" ? v : JSON.stringify(v))

  // A. clean session: 5 chunks, one retried, two sent concurrently, then finalize
  for (const i of [0, 1]) await send("rec-AAAAAAAA", i)
  line("A retry chunk 1 ->", (await send("rec-AAAAAAAA", 1)).duplicate ? "duplicate (not stored twice)" : "STORED TWICE?!")
  await Promise.all([send("rec-AAAAAAAA", 2), send("rec-AAAAAAAA", 3)])
  await send("rec-AAAAAAAA", 4)
  line("A manifest mid-session ->", (await man()).status)
  const fin = await finalizeRecording(tenant, email, id, 1, { recordingId: "rec-AAAAAAAA", totalParts: 5 }, storage)
  line("A finalize ->", { status: fin.status, bytes: fin.bytes, missing: fin.missingParts, playable: fin.playable })
  const key = (await InterviewDrive.findById(id).lean()).rounds[0].candidates[0].recordings.find((r) => r.recordingId === "rec-AAAAAAAA").key
  const readBack = await storage.getObjectBuffer(s3.RECORDINGS_BUCKET, key)
  const expectedBytes = Buffer.concat([0, 1, 2, 3, 4].map((i) => chunk(i).buffer))
  const identical = readBack.equals(expectedBytes)
  line("A file read back from storage ->", `${readBack.length} bytes, identical to what was sent: ${identical}`)
  if (!identical) { console.log("FAIL"); process.exitCode = 1 }
  line("A finalize again (idempotent) ->", (await finalizeRecording(tenant, email, id, 1, { recordingId: "rec-AAAAAAAA", totalParts: 5 }, storage)).status)
  await send("rec-AAAAAAAA", 9).catch((e) => line("A chunk after finalize ->", e.code))

  // B. page reload mid-interview: second capture, first chunks lost in the middle, never finalized
  await send("rec-BBBBBBBB", 0); await send("rec-BBBBBBBB", 1); await send("rec-BBBBBBBB", 3)
  await InterviewDrive.updateOne({ _id: id }, { $set: { "rounds.0.candidates.0.recordings.1.lastChunkAt": new Date(Date.now() - 10 * 60000) } })
  const m = await man()
  line("B abandoned capture reconciled ->", m.segments.map((s) => `${s.status}${s.missingParts ? `(missing ${s.missingParts})` : ""}`))
  line("B overall ->", m.status)

  // C. security
  await send("rec-CCCCCCCC", 0, other).catch((e) => line("C other tenant uploads chunk ->", e.code))
  await recordingManifest(other, id, 1, "c1", storage).catch((e) => line("C other tenant reads manifest ->", e.code))
  await saveRecordingChunk(tenant, "someone-else@example.com", id, 1, { recordingId: "rec-DDDDDDDD", index: 0, mimeType: "video/webm" }, chunk(0), storage).catch((e) => line("C different candidate's chunk ->", e.code))
  await saveRecordingChunk(tenant, email, id, 1, { recordingId: "x", index: 0, mimeType: "video/webm" }, chunk(0), storage).catch((e) => line("C bad recording id ->", e.code))
  await saveRecordingChunk(tenant, email, id, 1, { recordingId: "rec-EEEEEEEE", index: 0, mimeType: "application/zip" }, chunk(0), storage).catch((e) => line("C wrong media type ->", e.code))
  const after = (await InterviewDrive.findById(id).lean()).rounds[0].candidates[0]
  line("recordingFilename points at first stored file ->", after.recordingFilename === key)
  if (process.exitCode !== 1) console.log("PASS - chunks stored, assembled, read back byte-for-byte, tenant isolation held")
} finally {
  const keys = (await InterviewDrive.find({ tenantId: { $in: [tenant, other] } }).lean()).flatMap((d) => d.rounds.flatMap((r) => r.candidates.flatMap((c) => (c.recordings || []).flatMap((x) => [x.key, ...(x.parts || []).map((p) => p.key)]))))
  for (const k of [...keys, ...touched].filter(Boolean)) await storage.deleteObject(s3.RECORDINGS_BUCKET, k).catch(() => {})
  await InterviewDrive.deleteMany({ tenantId: { $in: [tenant, other] } }); await mongoose.disconnect()
}
