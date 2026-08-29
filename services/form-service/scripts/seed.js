import "dotenv/config"
import connectDb from "../config/connectDb.js"
import * as formService from "../services/form.service.js"

// Shared per-field-type validation - keep both the pattern and its
// human-readable message together so a failed match always has a specific
// error, not a generic "is invalid."
const NAME_VALIDATION = { pattern: "^[A-Za-z]+(?:[\\s'-][A-Za-z]+)*$", patternMessage: "Please enter a valid name using letters only." }
const INSTITUTION_NAME_VALIDATION = { minLength: 2, maxLength: 150, pattern: "^[A-Za-z0-9][A-Za-z0-9.,&'()\\- ]*$", patternMessage: "Please enter a valid name." }
const REGISTRATION_NUMBER_VALIDATION = { minLength: 3, maxLength: 30, pattern: "^[A-Za-z0-9]+$", patternMessage: "Registration number can contain letters and numbers only." }
const ADDRESS_VALIDATION = { maxLength: 500 }

const registrationForms = [
    {
        type: "ORGANIZATION", stage: "REGISTRATION", name: "Organization Registration",
        sections: [{
            key: "contact", title: "Contact Details", order: 1,
            fields: [
                { key: "company_name", label: "Company name", type: "TEXT", required: true, placeholder: "Enter company name", validation: INSTITUTION_NAME_VALIDATION },
                { key: "contact_name", label: "Contact person", type: "TEXT", required: true, placeholder: "Full name", validation: NAME_VALIDATION },
                { key: "email", label: "Work email", type: "EMAIL", required: true, placeholder: "you@company.com" },
                { key: "phone", label: "Phone number", type: "PHONE", required: true, placeholder: "+91 XXXXX XXXXX" },
                { key: "company_size", label: "Company size", type: "SELECT", required: false, options: [{ label: "1-10", value: "1-10" }, { label: "11-50", value: "11-50" }, { label: "51-200", value: "51-200" }, { label: "200+", value: "200+" }] },
                { key: "message", label: "What are you hiring for?", type: "TEXTAREA", required: false },
            ],
        }],
    },
    {
        type: "COLLEGE", stage: "REGISTRATION", name: "College Registration",
        sections: [{
            key: "contact", title: "Contact Details", order: 1,
            fields: [
                { key: "college_name", label: "College / institution name", type: "TEXT", required: true, validation: INSTITUTION_NAME_VALIDATION },
                { key: "contact_name", label: "Contact person", type: "TEXT", required: true, validation: NAME_VALIDATION },
                { key: "email", label: "Official email", type: "EMAIL", required: true },
                { key: "phone", label: "Phone number", type: "PHONE", required: true },
                { key: "student_count", label: "Approximate student count", type: "NUMBER", required: false, validation: { min: 0 } },
            ],
        }],
    },
    {
        type: "CANDIDATE", stage: "REGISTRATION", name: "Candidate Registration",
        sections: [{
            key: "contact", title: "Your Details", order: 1,
            fields: [
                { key: "full_name", label: "Full name", type: "TEXT", required: true, validation: NAME_VALIDATION },
                { key: "email", label: "Email address", type: "EMAIL", required: true },
                { key: "phone", label: "Phone number", type: "PHONE", required: true },
                { key: "highest_qualification", label: "Highest qualification", type: "SELECT", required: false, options: [{ label: "High School", value: "HIGH_SCHOOL" }, { label: "Bachelor's", value: "BACHELORS" }, { label: "Master's", value: "MASTERS" }, { label: "Other", value: "OTHER" }] },
                { key: "resume", label: "Resume", type: "FILE", required: false, accept: ".pdf,.doc,.docx", maxFileSizeMb: 10 },
            ],
        }],
    },
]

const onboardingForms = [
    {
        type: "ORGANIZATION", stage: "ONBOARDING", name: "Organization Onboarding",
        sections: [
            {
                key: "business_details", title: "Business Details", order: 1,
                fields: [
                    { key: "company_name", label: "Company name", type: "TEXT", required: true, validation: INSTITUTION_NAME_VALIDATION },
                    { key: "industry", label: "Industry", type: "SELECT", required: true, options: [{ label: "Technology", value: "TECHNOLOGY" }, { label: "Finance", value: "FINANCE" }, { label: "Healthcare", value: "HEALTHCARE" }, { label: "Other", value: "OTHER" }] },
                    { key: "website", label: "Company website", type: "URL", required: false },
                    { key: "headquarters_address", label: "Headquarters address", type: "ADDRESS", required: true, validation: ADDRESS_VALIDATION },
                ],
            },
            {
                key: "operations_legal", title: "Operations & Legal", order: 2,
                fields: [
                    { key: "gst_number", label: "GST Number", type: "TEXT", required: true, validation: { pattern: "^[0-9A-Z]{15}$", patternMessage: "GST number must be 15 characters (letters and numbers only)." } },
                    { key: "registration_number", label: "Company registration number", type: "TEXT", required: true, validation: REGISTRATION_NUMBER_VALIDATION },
                    { key: "employee_count", label: "Number of employees", type: "NUMBER", required: false, validation: { min: 0 } },
                ],
            },
            {
                key: "brand_documents", title: "Brand & Documents", order: 3,
                fields: [
                    { key: "logo", label: "Company logo", type: "IMAGE", required: false, accept: ".png,.jpg,.jpeg", maxFileSizeMb: 5 },
                    { key: "primary_color", label: "Primary Theme Color", type: "COLOR", required: false, placeholder: "#4F46E5" },
                    { key: "secondary_color", label: "Secondary Theme Color", type: "COLOR", required: false, placeholder: "#10B981" },
                    { key: "incorporation_certificate", label: "Certificate of incorporation", type: "FILE", required: true, accept: ".pdf", maxFileSizeMb: 10 },
                ],
            },
        ],
    },
    {
        type: "COLLEGE", stage: "ONBOARDING", name: "College Onboarding",
        sections: [
            {
                key: "institution_profile", title: "Institution Profile", order: 1,
                fields: [
                    { key: "college_name", label: "College name", type: "TEXT", required: true, validation: INSTITUTION_NAME_VALIDATION },
                    { key: "affiliation", label: "University affiliation", type: "TEXT", required: false, validation: INSTITUTION_NAME_VALIDATION },
                    { key: "address", label: "Campus address", type: "ADDRESS", required: true, validation: ADDRESS_VALIDATION },
                ],
            },
            {
                key: "academic_details", title: "Academic Details", order: 2,
                fields: [
                    { key: "programs_offered", label: "Programs offered", type: "MULTI_SELECT", required: true, options: [{ label: "Engineering", value: "ENGINEERING" }, { label: "Management", value: "MANAGEMENT" }, { label: "Arts & Science", value: "ARTS_SCIENCE" }, { label: "Law", value: "LAW" }, { label: "Other", value: "OTHER" }] },
                    { key: "student_count", label: "Total student count", type: "NUMBER", required: true, validation: { min: 1 } },
                    { key: "placement_officer_name", label: "Placement officer name", type: "TEXT", required: true, validation: NAME_VALIDATION },
                ],
            },
            {
                key: "brand_documents", title: "Brand & Documents", order: 3,
                fields: [
                    { key: "logo", label: "Institution logo", type: "IMAGE", required: false, accept: ".png,.jpg,.jpeg", maxFileSizeMb: 5 },
                    { key: "primary_color", label: "Primary Theme Color", type: "COLOR", required: false, placeholder: "#4F46E5" },
                    { key: "secondary_color", label: "Secondary Theme Color", type: "COLOR", required: false, placeholder: "#10B981" },
                    { key: "accreditation_certificate", label: "Accreditation certificate", type: "FILE", required: false, accept: ".pdf", maxFileSizeMb: 10 },
                ],
            },
        ],
    },
    {
        type: "CANDIDATE", stage: "ONBOARDING", name: "Candidate Onboarding",
        sections: [
            {
                key: "personal_education", title: "Personal & Education", order: 1,
                fields: [
                    { key: "full_name", label: "Full name", type: "TEXT", required: true, validation: NAME_VALIDATION },
                    { key: "date_of_birth", label: "Date of birth", type: "DATE", required: true },
                    { key: "highest_qualification", label: "Highest qualification", type: "SELECT", required: true, options: [{ label: "High School", value: "HIGH_SCHOOL" }, { label: "Bachelor's", value: "BACHELORS" }, { label: "Master's", value: "MASTERS" }, { label: "Other", value: "OTHER" }] },
                    { key: "college_name", label: "College attended", type: "TEXT", required: false, validation: INSTITUTION_NAME_VALIDATION },
                ],
            },
            {
                key: "experience_skills", title: "Experience & Skills", order: 2,
                fields: [
                    { key: "years_experience", label: "Years of experience", type: "NUMBER", required: false },
                    { key: "skills", label: "Key skills", type: "MULTI_SELECT", required: true, options: [{ label: "JavaScript", value: "JAVASCRIPT" }, { label: "Python", value: "PYTHON" }, { label: "Product", value: "PRODUCT" }, { label: "Design", value: "DESIGN" }, { label: "Sales", value: "SALES" }] },
                    { key: "linkedin_url", label: "LinkedIn profile", type: "URL", required: false },
                ],
            },
            {
                key: "documents", title: "Documents", order: 3,
                fields: [
                    { key: "resume", label: "Resume", type: "FILE", required: true, accept: ".pdf,.doc,.docx", maxFileSizeMb: 10 },
                    { key: "photo", label: "Profile photo", type: "IMAGE", required: false, accept: ".png,.jpg,.jpeg", maxFileSizeMb: 5 },
                ],
            },
        ],
    },
]

const run = async () => {
    await connectDb()
    for (const form of [...registrationForms, ...onboardingForms]) {
        await formService.seedPublished(form)
        console.log(`Published ${form.stage} form for ${form.type}`)
    }
    process.exit(0)
}

run().catch((err) => { console.error(err); process.exit(1) })
