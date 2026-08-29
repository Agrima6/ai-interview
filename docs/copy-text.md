# WorkmateIQ — Copy Text Reference

All text below is verbatim from the current codebase (`main` branch). Organized by area, with source file paths so any string can be traced back to where it lives in code.

---

## 1. Marketing Site
`client/src/pages/workmate/WHome.jsx`

### Hero
- Eyebrow: "WorkmateIQ"
- H1: "Where **better talent journeys** begin."
- Subtext: "One intelligent platform for hiring, onboarding and connecting people with opportunity — from first interaction to first day."
- Buttons: "Get Started", "Explore WorkmateIQ"
- Image alt: "Organizations, colleges and candidates connected through WorkmateIQ"

### About
- Eyebrow: "About Us"
- H2: "One hub for every side of hiring."
- Body: "We believe hiring should be intelligent, fair and fast. WorkmateIQ brings organizations, colleges and candidates into one platform to evaluate and move talent forward — clearly, and without the usual friction."
- Body: "Every registration, onboarding link and review moves through the same connected hub — so nothing gets lost between the people trying to find each other."

### Values Strip
| Title | Description |
|---|---|
| Intelligence First | We build for clarity, not complexity — every feature earns its place. |
| Fairness & Inclusion | Every organization, college and candidate is treated with the same rigor. |
| Speed & Efficiency | A journey that used to take weeks should take days. |
| Security & Trust | Professional information is handled with real, structured care. |

### How It Works
- Eyebrow: "The Platform Journey"
- H2: "From first conversation to first opportunity."
- Steps: Discover → Connect → Register → Onboard → Review → Move Forward

### Enterprise AI
- Eyebrow: "Enterprise capabilities"
- H2: "Built for real screening speed."
- Body: "Every score, note and decision is generated the moment an interview ends — organizations see clear, comparable insight instead of a pile of recordings to review later."
- Cards:
  - Enterprise Security — "SOC 2-aligned practices, encrypted storage and controlled access at every layer."
  - Fast by Design — "Registrations, onboarding links and reviews move in minutes, not weeks."
  - Real-Time Analytics — "Every organization, college and candidate sees live progress on their journey."

### Solutions
- Eyebrow: "Solutions"
- H2: "Built around the people who move work forward."

**For Organizations** — "Build stronger talent pipelines, simplify onboarding and create a clearer path from candidate to contributor."
- Streamline Hiring — "End-to-end hiring workflow that saves time."
- Smart Onboarding — "Personalized onboarding that boosts engagement."
- Stronger Teams — "Data-driven insights for better team decisions."

**For Colleges & Institutions** — "Connect students with organizations and create structured pathways from education to opportunity."
- Student Opportunities — "Connect students to verified organizations and roles."
- Institutional Tools — "Manage placements, drives and communications."
- Better Outcomes — "Improve placement rates and student success."

**For Candidates** — "Present your potential, experience and aspirations in one professional journey."
- Build Your Profile — "Highlight skills, experience and achievements."
- Discover Opportunities — "Find relevant roles at verified organizations."
- Grow Your Career — "Track progress and unlock new possibilities."

### Visual Story CTA
- H2: "Potential is everywhere. The right connection changes everything."
- Body: "Join the organizations, colleges and candidates already building better journeys with WorkmateIQ."
- Button: "Get Started"

### Pricing
- Eyebrow: "Pricing"
- H2: "Simple, transparent pricing."
- Subtext: "Choose the plan that fits how you hire, place or apply."

| Plan | Price | Description | Features |
|---|---|---|---|
| Starter | ₹4,999/month | For smaller teams getting started. | Up to 25 active journeys · Email support · Standard onboarding flows |
| Growth (Most popular) | ₹9,999/month | For growing organizations managing larger talent journeys. | Unlimited active journeys · Priority support · Custom onboarding flows · WhatsApp + email delivery |
| Enterprise | Custom | For organizations requiring a tailored deployment. | Dedicated onboarding · Custom integrations · SLA-backed support |

- Buttons: "Get Started" (Starter/Growth), "Talk to us" (Enterprise)

**FAQ** — "Frequently asked questions"
- Q: "Can I upgrade or downgrade my plan at any time?"
  A: "Yes — changes take effect from your next billing cycle, and we'll prorate the difference."
- Q: "Do you offer special pricing for academic institutions?"
  A: "Yes — mention your institution in the enquiry form below for tailored pricing."
- Q: "Is candidate data encrypted?"
  A: "All data in transit and at rest is encrypted; access is scoped per organization."

### Contact
- Eyebrow: "Contact"
- H2: "Let's build better talent journeys."
- Subtext: "Start your WorkmateIQ journey today — tell us a bit about you below."
- Field placeholders: "Name", "Email", "Mobile number", "Subject", "Message"
- Client type options: "Company / Organization", "College / Institution", "Candidate"
- Submit button: "Submit Enquiry" (loading: "Submitting...")
- Error: "Failed to submit enquiry."
- Success: "Thank you, {name}." / "Your enquiry has been received. Our team will contact you shortly."

---

## 2. Auth Flow

### `client/src/pages/auth/AuthPage.jsx`
- Session expiry banner: "Your session has expired. Please sign in again."
- **Registration success card**: "Thank You!" / "We've received your registration successfully." / "We've sent your onboarding link to the email address you provided. Check the delivery status below." / "Email" / "Need help? Contact {supportEmail}." / "Open onboarding link (dev)" / "Back to registration"
- Status labels: QUEUED → "Queued", SENT → "Sent", MOCK_SENT → "Sent (test mode)", FAILED → "Failed", DELIVERED → "Delivered"
- **Login form**: "Welcome back" / "Sign in to your recruitment desk" / "Email address" (placeholder "you@company.com") / "Password" (placeholder "Enter password") / "Forgot password?" / "Remember me on this browser" / "Sign In" / "Don't have an account? Join Now"
- Error fallbacks: "Invalid email or password.", "Super Admin login failed."
- Register footer: "Already have an account? Sign in"
- **Forgot password**: "Back to Login" / "Reset Password" / "Enter your email address and we'll send you a link to reset your password." / "Email address" / "Send Reset Link"
- **Reset sent**: "Reset Link Sent" / "We've sent a password reset link to {email}. Please check your inbox." / "Back to Login"

### `client/src/components/auth/AuthBrandPanel.jsx`
- Login: "Welcome back!" / "Enter your credentials to access your recruitment desk."
- Register: "Join WorkmateIQ" / "Get started with the ultimate AI-driven recruitment and evaluation platform."
- Features: "Smart Recruitment" — "Streamline hiring with AI-powered tools."; "Secure & Reliable" — "Your data is protected with enterprise-grade security."; "Everything in One Place" — "Manage jobs, candidates and interviews from one platform."

### `client/src/components/auth/RoleSelector.jsx`
- "Choose how you want to join" / "Select a role to create your WorkmateIQ account"
- Error: "Failed to load registration roles."
- Button: "Continue"

### `client/src/components/auth/RoleCard.jsx`
- ORGANIZATION: "Hire smarter and build stronger teams."
- COLLEGE: "Connect students with real opportunities."
- CANDIDATE: "Present potential and get discovered."

### `client/src/components/auth/AuthHeader.jsx`
- Nav: "Home", "About", "How It Works", "Solutions", "Pricing", "Contact"
- Buttons: "Login", "Join Now"

---

## 3. Registration Forms

### `client/src/pages/public/RegisterForm.jsx`
- Badge: "Registration form"
- Heading: "{Type} registration" (fallback "Registration")
- Helper: "Fields marked with * are required."
- Submit: "Submit registration"
- Captcha errors: "CAPTCHA verification expired. Please complete the CAPTCHA again." / "That's not the right answer. Please try again."
- Consent: "I agree to be contacted by WorkmateIQ about this registration."
- **Success**: "Registration received" / "We've sent your onboarding link. Check the delivery status below." / "Email — {status}" / "WhatsApp — {status}" / "Open onboarding link (local dev)" / "Back to home"
- Errors: "Something went wrong, please try again.", "Please accept the consent checkbox."
- Nav: "Back", "Home"

### `client/src/components/auth/RegistrationModal.jsx`
- Title: "{Role} Registration"
- Subheader: "Please fill in the details below to register as a partner with WorkmateIQ."
- Captcha placeholder: "Enter your answer"
- Consent: "I agree to be contacted by WorkmateIQ about this registration and understand how my information will be used."
- Submit: "Create Account"
- Errors: "Please accept the consent checkbox.", "Please complete the CAPTCHA correctly.", "Something went wrong. Please try again.", "Failed to load form settings."

### Form Field Definitions
`services/form-service/scripts/seed.js`

**Registration forms**

| Type | Section | Fields |
|---|---|---|
| Organization | Contact Details | Company name (placeholder: Enter company name) · Contact person (placeholder: Full name) · Work email (placeholder: you@company.com) · Phone number (placeholder: +91 XXXXX XXXXX) · Company size (1-10 / 11-50 / 51-200 / 200+) · What are you hiring for? |
| College | Contact Details | College / institution name · Contact person · Official email · Phone number · Approximate student count |
| Candidate | Your Details | Full name · Email address · Phone number · Highest qualification (High School / Bachelor's / Master's / Other) · Resume |

**Onboarding forms**

| Type | Section | Fields |
|---|---|---|
| Organization | Business Details | Company name · Industry (Technology / Finance / Healthcare / Other) · Company website · Headquarters address |
| Organization | Operations & Legal | GST Number · Company registration number · Number of employees |
| Organization | Brand & Documents | Company logo · Primary Theme Color (#4F46E5) · Secondary Theme Color (#10B981) · Certificate of incorporation |
| College | Institution Profile | College name · University affiliation · Campus address |
| College | Academic Details | Programs offered (Engineering / Management / Arts & Science / Law / Other) · Total student count · Placement officer name |
| College | Brand & Documents | Institution logo · Primary Theme Color (#4F46E5) · Secondary Theme Color (#10B981) · Accreditation certificate |
| Candidate | Personal & Education | Full name · Date of birth · Highest qualification (High School / Bachelor's / Master's / Other) · College attended |
| Candidate | Experience & Skills | Years of experience · Key skills (JavaScript / Python / Product / Design / Sales) · LinkedIn profile |
| Candidate | Documents | Resume · Profile photo |

**Shared field-validation messages**
- "Please enter a valid name using letters only."
- "Please enter a valid name."
- "Registration number can contain letters and numbers only."
- "GST number must be 15 characters (letters and numbers only)."

---

## 4. Onboarding Flow
`client/src/pages/onboarding/OnboardingFlow.jsx`

- Loading: "Loading onboarding configuration..."
- Invalid link: "This onboarding link is invalid" / {error text} / "Return to Home Page"

**Welcome screen**
- "Onboarding Setup"
- "We need a few details to set up your account profile. This step-by-step flow will guide you through entering profile details and documents."
- "Onboarding Overview" / "{totalSteps} steps in total"
- "Your information is encrypted and transmitted securely."
- Button: "Start Onboarding"

**Step form**
- Optional label suffix: "(optional)"
- Autosave chips: "Draft Saved", "Save Failed"
- Verification feedback banner: "Verification Feedback" — "Fields that need updating are highlighted below." or "Please review the notes below before resubmitting."
- File upload: "Choose a file or drag here"
- Captcha placeholder: "Enter your answer"
- Review step: "Review & Submit" — "Please review all your details carefully before submitting."
- Empty states: "Not uploaded", "Not specified", "Yes" / "No"
- Section: "Declaration & Consent"
- Nav: "Back", "Continue", "Submit Onboarding" (loading: "Submitting...")
- Validation errors: "Please enter a valid email address.", "Please enter a valid 10-digit mobile number.", "Enter a valid URL.", "Please resolve all validation errors before submitting.", "File upload failed.", "Failed to load onboarding session.", "Failed to load captcha", "Submission failed."

**Success screen**
- "Thank You!"
- "We've received your onboarding form successfully."
- "Our team will review the information and send updates to your provided contact details."
- "Need help? Contact {supportEmail}."
- Buttons: "Sign in to Candidate Dashboard" (candidate) / "Back to Home" (others)

---

## 5. Email Templates
`services/communication-service/scripts/seed.js`

### ONBOARDING_LINK (email)
**Subject:** Complete your WorkmateIQ onboarding

> Hi {{recipientGreeting}},
>
> Thank you for registering {{clientName}} with WorkmateIQ.
>
> You're almost there. Please complete the remaining onboarding details so our team can review your institution and get everything set up.
>
> Complete Onboarding: {{onboardingUrl}}
>
> This link is valid for 7 days.
>
> If you have any questions or run into an issue while completing the form, please contact our support team at {{supportEmail}}.
>
> Regards,
> The WorkmateIQ Team

### ONBOARDING_LINK (WhatsApp)
> Hi {{recipientGreeting}}! Continue your WorkmateIQ onboarding for {{clientName}}: {{onboardingUrl}}

### PASSWORD_RESET (email)
**Subject:** Reset your WorkmateIQ password

> Hi {{recipientGreeting}},
>
> We received a request to reset your WorkmateIQ password. Reset it here:
> {{resetUrl}}
>
> This link is valid for 1 hour. If you didn't request this, you can safely ignore this email - your password won't be changed.
>
> If you have any questions, please contact our support team at {{supportEmail}}.
>
> Regards,
> The WorkmateIQ Team

### CLIENT_APPROVED (email)
**Subject:** {{clientName}} is approved on WorkmateIQ - here's your login

> Hi {{recipientGreeting}},
>
> Great news - {{clientName}} has been approved on WorkmateIQ. You can now sign in to your dashboard:
> {{loginUrl}}
>
> Email: {{recipientEmail}}
> Temporary password: {{tempPassword}}
>
> You'll be asked to set a new password the first time you sign in.
>
> If you have any questions, please contact our support team at {{supportEmail}}.
>
> Regards,
> The WorkmateIQ Team

### ONBOARDING_SUBMITTED (email)
**Subject:** We've received your onboarding application

> Hi {{recipientGreeting}},
>
> Thank you for completing the onboarding for {{clientName}}.
>
> We've received your onboarding form successfully.
>
> Our team will review the information and share the next update with you using your provided contact details.
>
> If you have any questions or experience an issue, please contact our support team at {{supportEmail}}.
>
> Regards,
> The WorkmateIQ Team

### ONBOARDING_CHANGES_REQUESTED (email)
**Subject:** A few updates needed on your WorkmateIQ onboarding

> Hi {{recipientGreeting}},
>
> Our team reviewed the onboarding application for {{clientName}} and needs a few things corrected before we can proceed:
>
> {{changesListText}}
>
> Update your onboarding here: {{resumeUrl}}
>
> Everything else you already entered is saved - just update the items above and resubmit.
>
> If you have any questions, please contact our support team at {{supportEmail}}.
>
> Regards,
> The WorkmateIQ Team

> **Note:** the HTML versions of all five templates carry the same copy plus a heading, a CTA button ("Complete Onboarding →", "Reset Password →", "Sign In →", "Update Onboarding →"), and a highlighted note ("This link is valid for **7 days**." / "**1 hour**.").

---

## 6. Admin Panel

### `client/src/pages/dashboard/AdminDashboard.jsx`
- "You don't have access to the dashboard."
- "Dashboard" — "An overview of registrations moving through WorkmateIQ."
- "Attention Required"
- "Registrations & Enquiries over time" — empty: "No activity in this period."
- "Registrations by audience" — empty: "No registrations in this period."
- "Onboarding funnel" — empty: "No onboarding activity yet."
- "Recent Activity" — empty: "No recent activity yet."

### `client/src/pages/onboarding-admin/OnboardingReviewList.jsx`
- "Onboarding Review" — "Review submitted onboarding applications."
- Status filter: "All statuses", "Submitted", "Resubmitted", "Changes requested", "Approved", "Rejected"

### `client/src/pages/onboarding-admin/OnboardingReviewDetail.jsx`
- "Loading..."
- Buttons: "Approve", "Reject"
- "No file uploaded"
- Sections: "Contact", "Open review items"
- Approve confirm: "Approve this onboarding?" / "Approve"
- Reject modal: "Reject this onboarding" / "Reject" / toast "Onboarding rejected."
- Request changes modal: "Request changes" / "Check each field that needs correcting and say what's wrong. The applicant gets one email listing everything you flag here." / "General note (optional)" / "Cancel" / "Send to applicant" / toast "Change request emailed to applicant."

### `client/src/pages/clients/ClientList.jsx`
- "Clients" — "Organizations and colleges approved through onboarding."
- Filters: "All types", "All statuses", "Active", "Blocked", "Pending", "Rejected"
- Row action: "Block" / "Unblock"
- Confirm: "Block {client.name}?" / "Unblock {client.name}?" — "Blocking this client will prevent access to the current application."
- Toasts: "{client.name} has been blocked." / "{client.name} has been unblocked."

### `client/src/pages/enquiries/EnquiryList.jsx`
- "Enquiries" — "Messages submitted through the public site and registration flow."
- Filter: "All statuses"
- Toasts: "Status updated.", "Call logged."

### `client/src/pages/admin/FormBuilderPage.jsx`
- "You don't have access to the form builder."
- "Form builder" — "Create and publish the registration and onboarding forms by audience."
- "Loading form configuration…"
- Field labels: "Form name", "Field label", "Field key", "Type", "Required", "Placeholder", "Helper text", "Options"
- Buttons: "Remove", "Remove field", "Add field", "Add section"
- Toasts: "Draft saved.", "Form published successfully.", "Unable to publish the form.", "Section removed. Save the draft to keep this change.", "Field removed. Save the draft to keep this change."

---

## 7. Shared UI Components
- `Toast.jsx` — no hardcoded copy (messages passed in by caller); dismiss button aria-label "Dismiss".
- `ConfirmModal.jsx` — default `confirmLabel`: "Confirm", default `cancelLabel`: "Cancel", loading state: "Please wait...".
- `EmptyState.jsx` — no hardcoded copy; `title`/`description`/`actionLabel` always passed in by caller.

---

## 8. Error Messages
`client/src/api/errorMessages.js`

| Error code(s) | Friendly message |
|---|---|
| TOKEN_EXPIRED, UNAUTHORIZED, NO_REFRESH_TOKEN, INVALID_REFRESH_TOKEN, REFRESH_TOKEN_EXPIRED, REFRESH_TOKEN_REVOKED | Your session has expired. Please sign in again. |
| FORBIDDEN, SERVICE_FORBIDDEN | You don't have permission to perform this action. |
| NOT_FOUND | The requested resource was not found. |
| INTERNAL_ERROR | Something went wrong. Please try again. |
| NETWORK_ERROR | Unable to connect. Check your internet connection and try again. |
| TOO_MANY_REQUESTS | Too many attempts. Please try again later. |
| (unrecognized 5xx / no status) | Something went wrong. Please try again. |
| (any other 4xx) | Backend's own message, passed through unchanged |
