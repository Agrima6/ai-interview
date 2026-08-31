// Path-prefix -> upstream service. The browser only ever talks to this
// gateway; it never learns a service's real host/port.
export const routeTable = [
    { prefix: "/api/v1/auth", target: process.env.AUTH_SERVICE_URL },
    { prefix: "/api/v1/me", target: process.env.AUTH_SERVICE_URL },
    { prefix: "/api/v1/registration-types", target: process.env.REGISTRATION_SERVICE_URL },
    { prefix: "/api/v1/captcha", target: process.env.REGISTRATION_SERVICE_URL },
    { prefix: "/api/v1/registrations", target: process.env.REGISTRATION_SERVICE_URL },
    { prefix: "/api/v1/forms", target: process.env.FORM_SERVICE_URL },
    { prefix: "/api/v1/onboarding", target: process.env.ONBOARDING_SERVICE_URL },
    { prefix: "/api/v1/onboardings", target: process.env.ONBOARDING_SERVICE_URL },
    { prefix: "/api/v1/clients", target: process.env.CLIENT_SERVICE_URL },
    { prefix: "/api/v1/dashboard", target: process.env.DASHBOARD_SERVICE_URL },
    { prefix: "/api/v1/enquiries", target: process.env.ENQUIRY_SERVICE_URL },
    { prefix: "/api/v1/drives", target: process.env.CLIENT_SERVICE_URL },
    { prefix: "/api/v1/question-banks", target: process.env.CLIENT_SERVICE_URL },
    { prefix: "/api/v1/organization", target: process.env.CLIENT_SERVICE_URL },
    // Order matters here: Express matches the first registered prefix a
    // request starts with, so the more specific /organizations/me/dashboard
    // route (served by dashboard-service) must be registered before the
    // general /organizations route (served by client-service - "my
    // organization" self-service is just the caller's own Client record),
    // or every /organizations/* request would be swallowed by the latter.
    { prefix: "/api/v1/organizations/me/dashboard", target: process.env.DASHBOARD_SERVICE_URL },
    { prefix: "/api/v1/organizations", target: process.env.CLIENT_SERVICE_URL },
]
