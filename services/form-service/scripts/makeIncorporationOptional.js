import "dotenv/config"
import connectDb from "../config/connectDb.js"
import FormDefinition from "../models/formDefinition.model.js"
import FormVersion from "../models/formVersion.model.js"

// One-off for a live database: the company onboarding form's "Certificate of incorporation" becomes optional.
// It changes only that one field's `required` flag on the ACTIVE version (nothing else is touched, no new version is made).
// Run it as a preview first, then for real:   node scripts/makeIncorporationOptional.js        (preview)
//                                              node scripts/makeIncorporationOptional.js --apply
const apply = process.argv.includes("--apply")

const run = async () => {
    await connectDb()
    const definition = await FormDefinition.findOne({ type: "ORGANIZATION", stage: "ONBOARDING" })
    if (!definition?.activeVersionId) { console.log("No active organization onboarding form found."); process.exit(0) }
    const version = await FormVersion.findById(definition.activeVersionId)
    const field = version?.sections?.flatMap((s) => s.fields || []).find((f) => f.key === "incorporation_certificate")
    if (!field) { console.log("The active form has no certificate field."); process.exit(0) }
    console.log(`Certificate of incorporation is currently ${field.required ? "REQUIRED" : "optional"}.`)
    if (!field.required) process.exit(0)
    if (!apply) { console.log("Preview only. Run again with --apply to make it optional."); process.exit(0) }
    const result = await FormVersion.updateOne(
        { _id: version._id },
        { $set: { "sections.$[].fields.$[f].required": false } },
        { arrayFilters: [{ "f.key": "incorporation_certificate" }] },
    )
    console.log(`Done: ${result.modifiedCount} form updated. The certificate is now optional.`)
    process.exit(0)
}

run().catch((err) => { console.error(err); process.exit(1) })
