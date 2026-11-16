// Every language a coding question can offer. Mirrors services/client-service/utils/oaLanguages.js: the ids and
// labels live here, the starter snippets come from the server with each question.
export const OA_LANGUAGES = Object.freeze([
    ['javascript', 'JavaScript'], ['typescript', 'TypeScript'], ['python', 'Python 3'], ['java', 'Java'], ['c', 'C'], ['cpp', 'C++'],
    ['csharp', 'C#'], ['go', 'Go'], ['rust', 'Rust'], ['kotlin', 'Kotlin'], ['swift', 'Swift'], ['php', 'PHP'], ['ruby', 'Ruby'],
    ['scala', 'Scala'], ['dart', 'Dart'], ['r', 'R'], ['perl', 'Perl'], ['bash', 'Bash'], ['sql', 'SQL'], ['mysql', 'MySQL'],
    ['postgresql', 'PostgreSQL'], ['mongodb', 'MongoDB query'], ['html', 'HTML / CSS'],
])

const LABELS = Object.fromEntries(OA_LANGUAGES)

export const languageLabel = (id) => LABELS[id] || id
