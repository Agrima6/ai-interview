// Curated starter question sets per role, used to pre-fill a new Question
// Bank so interviewers don't have to write everything from scratch. Fully
// editable after picking one - these just seed the form.

const q = (text, type, difficulty, skillTags, expectedDurationSec = 90) => ({
    text, type, difficulty, skillTags, expectedDurationSec,
})

export const QUESTION_BANK_TEMPLATES = [
    {
        id: "software-engineer",
        role: "Software Engineer",
        description: "General-purpose SWE screen covering DS&A, system thinking, and behavior.",
        questions: [
            q("Walk me through a project you're proud of and the technical decisions you made.", "Technical", "Easy", ["communication", "projects"]),
            q("How would you find whether a linked list contains a cycle, and what's the time/space complexity?", "Technical", "Medium", ["data structures", "algorithms"]),
            q("Design a rate limiter for a public API. What approach would you use and why?", "System Design", "Hard", ["system design", "scalability"], 150),
            q("Tell me about a time you disagreed with a teammate's technical approach. What did you do?", "Behavioral", "Medium", ["collaboration"]),
            q("How do you approach debugging a production issue you can't reproduce locally?", "Technical", "Medium", ["debugging", "production"]),
            q("What tradeoffs would you consider between SQL and NoSQL for a new feature?", "Technical", "Medium", ["databases"]),
            q("Describe a time you had to learn an unfamiliar technology quickly to ship something.", "Behavioral", "Easy", ["learning agility"]),
        ],
    },
    {
        id: "frontend-developer",
        role: "Frontend Developer",
        description: "UI engineering, performance, accessibility, and component design.",
        questions: [
            q("How do you decide when to lift state up versus keep it local to a component?", "Technical", "Easy", ["react", "state management"]),
            q("What causes unnecessary re-renders in a React app, and how do you diagnose them?", "Technical", "Medium", ["react", "performance"]),
            q("How would you make a complex data table accessible to screen reader users?", "Technical", "Medium", ["accessibility"]),
            q("Design the component structure for a multi-step checkout form.", "System Design", "Medium", ["component design", "forms"], 120),
            q("Tell me about a time you had to push back on a design that wasn't technically feasible.", "Behavioral", "Medium", ["collaboration", "design"]),
            q("How do you approach optimizing a page with a poor Largest Contentful Paint score?", "Technical", "Hard", ["performance", "web vitals"]),
        ],
    },
    {
        id: "backend-developer",
        role: "Backend Developer",
        description: "APIs, data modeling, reliability, and distributed systems basics.",
        questions: [
            q("How do you design an API to be backwards compatible as requirements evolve?", "Technical", "Medium", ["api design"]),
            q("Explain how you'd model a many-to-many relationship and when you'd denormalize it.", "Technical", "Medium", ["databases", "data modeling"]),
            q("Design a URL shortener service that needs to handle high read traffic.", "System Design", "Hard", ["system design", "caching"], 150),
            q("How do you ensure an operation is idempotent when a client might retry a request?", "Technical", "Medium", ["reliability"]),
            q("Tell me about a time a service you owned went down. How did you handle it?", "Behavioral", "Medium", ["incident response"]),
            q("What's your approach to writing tests for code that talks to external services?", "Technical", "Medium", ["testing"]),
        ],
    },
    {
        id: "data-analyst",
        role: "Data Analyst",
        description: "SQL fluency, metrics thinking, and communicating findings clearly.",
        questions: [
            q("Walk me through how you'd investigate a sudden drop in a key product metric.", "Case Study", "Medium", ["metrics", "root cause analysis"], 120),
            q("Write a SQL query to find the second-highest value in a column without using LIMIT/OFFSET.", "Technical", "Medium", ["sql"]),
            q("How do you decide which chart type best communicates a given insight?", "Technical", "Easy", ["data visualization"]),
            q("Tell me about a time your analysis changed a stakeholder's decision.", "Behavioral", "Medium", ["stakeholder management"]),
            q("What's the difference between correlation and causation, and how do you test for the latter?", "Technical", "Medium", ["statistics"]),
            q("How would you explain a complex statistical result to a non-technical stakeholder?", "Behavioral", "Easy", ["communication"]),
        ],
    },
    {
        id: "product-manager",
        role: "Product Manager",
        description: "Prioritization, strategy, and cross-functional leadership.",
        questions: [
            q("Walk me through how you'd prioritize a backlog with limited engineering capacity.", "Case Study", "Medium", ["prioritization"], 120),
            q("Tell me about a product decision you made that you later reversed. What did you learn?", "Behavioral", "Medium", ["judgment"]),
            q("How would you measure the success of a feature before and after launch?", "Technical", "Medium", ["metrics"]),
            q("Design a product improvement for an app you use daily. Walk me through your process.", "Case Study", "Hard", ["product sense"], 150),
            q("How do you handle disagreement between engineering and design on scope?", "Behavioral", "Medium", ["cross-functional"]),
            q("What's a time you had to say no to a stakeholder's request? How did you handle it?", "Managerial Round", "Medium", ["stakeholder management"]),
        ],
    },
    {
        id: "hr-people-ops",
        role: "HR / People Operations",
        description: "Culture fit, conflict resolution, and process judgment.",
        questions: [
            q("Tell me about yourself and what draws you to this role.", "HR", "Easy", ["intro"]),
            q("How do you handle a conflict between two team members with different working styles?", "HR", "Medium", ["conflict resolution"]),
            q("Describe a time you had to deliver difficult feedback to someone.", "HR", "Medium", ["feedback"]),
            q("What would you do if you noticed a pattern of disengagement across a team?", "HR", "Medium", ["employee engagement"]),
            q("Where do you see yourself in the next few years, and how does this role fit that?", "HR", "Easy", ["career goals"]),
            q("How do you stay organized when managing multiple confidential cases at once?", "HR", "Medium", ["organization"]),
        ],
    },
    {
        id: "sales-executive",
        role: "Sales Executive",
        description: "Pipeline discipline, objection handling, and closing ability.",
        questions: [
            q("Walk me through how you qualify a lead before investing time in it.", "Technical", "Easy", ["qualification"]),
            q("Tell me about the toughest deal you've closed and how you got there.", "Behavioral", "Medium", ["negotiation"]),
            q("How do you handle a prospect who says your product is too expensive?", "Case Study", "Medium", ["objection handling"], 90),
            q("Describe a time you lost a deal you expected to win. What did you learn?", "Behavioral", "Medium", ["resilience"]),
            q("How do you keep a pipeline organized across dozens of active prospects?", "Technical", "Easy", ["pipeline management"]),
        ],
    },
    {
        id: "marketing-specialist",
        role: "Marketing Specialist",
        description: "Campaign strategy, channel thinking, and measuring impact.",
        questions: [
            q("How would you launch a campaign for a product with a near-zero budget?", "Case Study", "Medium", ["strategy"], 120),
            q("Tell me about a campaign you ran that underperformed. What did you change?", "Behavioral", "Medium", ["iteration"]),
            q("How do you decide which channels to prioritize for a new audience segment?", "Technical", "Medium", ["channel strategy"]),
            q("What metrics would you track to prove a brand campaign's impact, given it's hard to attribute directly?", "Technical", "Hard", ["measurement"]),
            q("Describe how you'd work with a designer and copywriter to ship a campaign on a tight deadline.", "Behavioral", "Easy", ["collaboration"]),
        ],
    },
]
