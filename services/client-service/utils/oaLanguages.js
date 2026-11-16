// Every language a coding question can offer, with the snippet a candidate starts from. The client keeps a mirror of
// the ids and labels (client/src/components/oa/oaLanguages.js); the snippets live only here and travel with the paper.

const lang = (id, label, starter) => Object.freeze({ id, label, starter })

export const OA_LANGUAGES = Object.freeze([
    lang("javascript", "JavaScript", "// Read input from stdin and print the answer\nfunction solve(input) {\n    // your code here\n    return ''\n}\n\nconsole.log(solve(require('fs').readFileSync(0, 'utf8').trim()))\n"),
    lang("typescript", "TypeScript", "// Read input from stdin and print the answer\nfunction solve(input: string): string {\n    // your code here\n    return ''\n}\n\nconsole.log(solve(require('fs').readFileSync(0, 'utf8').trim()))\n"),
    lang("python", "Python 3", "import sys\n\ndef solve(data: str) -> str:\n    # your code here\n    return ''\n\nif __name__ == '__main__':\n    print(solve(sys.stdin.read().strip()))\n"),
    lang("java", "Java", "import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner in = new Scanner(System.in);\n        // your code here\n    }\n}\n"),
    lang("c", "C", "#include <stdio.h>\n\nint main(void) {\n    // your code here\n    return 0;\n}\n"),
    lang("cpp", "C++", "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    // your code here\n    return 0;\n}\n"),
    lang("csharp", "C#", "using System;\n\npublic class Program {\n    public static void Main() {\n        // your code here\n    }\n}\n"),
    lang("go", "Go", "package main\n\nimport \"fmt\"\n\nfunc main() {\n\t// your code here\n\tfmt.Println()\n}\n"),
    lang("rust", "Rust", "use std::io::{self, Read};\n\nfn main() {\n    let mut input = String::new();\n    io::stdin().read_to_string(&mut input).unwrap();\n    // your code here\n}\n"),
    lang("kotlin", "Kotlin", "fun main() {\n    val input = generateSequence(::readLine).joinToString(\"\\n\")\n    // your code here\n}\n"),
    lang("swift", "Swift", "import Foundation\n\n// your code here\nwhile let line = readLine() {\n    print(line)\n}\n"),
    lang("php", "PHP", "<?php\n$input = trim(stream_get_contents(STDIN));\n// your code here\necho $input;\n"),
    lang("ruby", "Ruby", "input = STDIN.read.strip\n# your code here\nputs input\n"),
    lang("scala", "Scala", "object Main extends App {\n  val input = scala.io.Source.stdin.mkString.trim\n  // your code here\n}\n"),
    lang("dart", "Dart", "import 'dart:io';\n\nvoid main() {\n  final input = stdin.readLineSync() ?? '';\n  // your code here\n}\n"),
    lang("r", "R", "input <- readLines(file('stdin'))\n# your code here\ncat(input, sep = '\\n')\n"),
    lang("perl", "Perl", "use strict;\nuse warnings;\n\nmy @lines = <STDIN>;\n# your code here\n"),
    lang("bash", "Bash", "#!/bin/bash\nread -r input\n# your code here\necho \"$input\"\n"),
    lang("sql", "SQL", "-- Write your query here\nSELECT 1;\n"),
    lang("mysql", "MySQL", "-- Write your query here\nSELECT 1;\n"),
    lang("postgresql", "PostgreSQL", "-- Write your query here\nSELECT 1;\n"),
    lang("mongodb", "MongoDB query", "// Write your query here\ndb.collection.find({})\n"),
    lang("html", "HTML / CSS", "<!doctype html>\n<html>\n<head>\n  <style>\n    /* your styles here */\n  </style>\n</head>\n<body>\n  <!-- your markup here -->\n</body>\n</html>\n"),
])

export const CODE_LANGUAGES = Object.freeze(OA_LANGUAGES.map((l) => l.id))

const BY_ID = new Map(OA_LANGUAGES.map((l) => [l.id, l]))

export const defaultStarter = (id) => BY_ID.get(id)?.starter || ""

/** The snippet a candidate sees for each allowed language: the organizer's own where they wrote one, else the default. */
export const starterCodesFor = (question) => {
    const own = question.starterCodes || {}
    const out = {}
    for (const id of question.codeLanguages || []) {
        const custom = typeof own[id] === "string" && own[id].trim() ? own[id] : ""
        // `starterCode` is the single snippet older questions carry: it belongs to their first language.
        const legacy = !custom && id === question.codeLanguages[0] && question.starterCode ? question.starterCode : ""
        out[id] = custom || legacy || defaultStarter(id)
    }
    return out
}
