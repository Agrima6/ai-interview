#!/usr/bin/env node
/**
 * Runs every backend service (plus the communication queue worker) in one terminal.
 *
 * Usage (from the services/ folder):   node run_all.js
 * Stop everything:                     Ctrl+C
 *
 * Each service is started with `node <entry>` directly - not `npm run start` through a shell - so
 * Ctrl+C stops the real Node process instead of leaving it orphaned on its port.
 * Plain CommonJS so it runs on any Node version without a package.json "type" setting.
 */
const { spawn, spawnSync } = require("node:child_process")
const fs = require("node:fs")
const path = require("node:path")

const ROOT = __dirname

// name, entry file, port (null = no port, e.g. a queue worker)
const SERVICES = [
    { name: "auth-service", entry: "server.js" },
    { name: "form-service", entry: "server.js" },
    { name: "registration-service", entry: "server.js" },
    { name: "onboarding-service", entry: "server.js" },
    { name: "communication-service", entry: "server.js" },
    { name: "communication-worker", dir: "communication-service", entry: "worker.js", noPort: true },
    { name: "client-service", entry: "server.js" },
    { name: "dashboard-service", entry: "server.js" },
    { name: "enquiry-service", entry: "server.js" },
    { name: "api-gateway", entry: "server.js" },
]

const COLORS = [36, 32, 33, 35, 34, 96, 92, 93, 95, 94]
const useColor = process.stdout.isTTY
const paint = (code, text) => (useColor ? `\x1b[${code}m${text}\x1b[0m` : text)
const tag = (svc) => paint(svc.color, svc.name.padEnd(22))

const readPort = (dir) => {
    try {
        const env = fs.readFileSync(path.join(ROOT, dir, ".env"), "utf8")
        const match = env.match(/^PORT\s*=\s*(\d+)/m)
        return match ? Number(match[1]) : null
    } catch {
        return null
    }
}

// macOS/Linux: pid listening on a port (lsof ships with macOS). Returns null if nothing listens.
const pidOnPort = (port) => {
    const res = spawnSync("lsof", ["-tiTCP:" + port, "-sTCP:LISTEN"], { encoding: "utf8" })
    const pid = (res.stdout || "").split("\n")[0].trim()
    return pid ? Number(pid) : null
}

const running = []
let shuttingDown = false

const pipeLines = (stream, svc, write) => {
    let buffer = ""
    stream.on("data", (chunk) => {
        buffer += chunk.toString()
        const lines = buffer.split("\n")
        buffer = lines.pop()
        for (const line of lines) if (line.trim()) write(`${tag(svc)} ${line}\n`)
    })
    stream.on("end", () => {
        if (buffer.trim()) write(`${tag(svc)} ${buffer}\n`)
    })
}

const start = (svc) => {
    const dir = svc.dir || svc.name
    const cwd = path.join(ROOT, dir)

    if (!fs.existsSync(path.join(cwd, svc.entry))) {
        console.error(`${tag(svc)} ${paint(31, `skipped - ${dir}/${svc.entry} not found`)}`)
        return
    }
    if (!fs.existsSync(path.join(cwd, "node_modules"))) {
        console.log(`${tag(svc)} installing dependencies (first run)...`)
        const install = spawnSync("npm", ["install", "--no-audit", "--no-fund"], { cwd, stdio: "inherit" })
        if (install.status !== 0) {
            console.error(`${tag(svc)} ${paint(31, "npm install failed - skipped")}`)
            return
        }
    }

    if (!svc.noPort) {
        const port = readPort(dir)
        const holder = port ? pidOnPort(port) : null
        if (holder) {
            console.error(`${tag(svc)} ${paint(33, `port ${port} is already in use by pid ${holder} - skipped (stop it with: kill ${holder})`)}`)
            return
        }
    }

    if (svc.noPort) {
        // A worker has no port to test, so look for an already-running copy instead.
        const dup = spawnSync("pgrep", ["-f", `node ${svc.entry}`], { encoding: "utf8" }).stdout.trim()
        if (dup) {
            console.error(`${tag(svc)} ${paint(33, `already running (pid ${dup.split("\n")[0]}) - skipped`)}`)
            return
        }
    }

    const child = spawn(process.execPath, [svc.entry], { cwd, env: process.env, stdio: ["ignore", "pipe", "pipe"] })
    pipeLines(child.stdout, svc, (line) => process.stdout.write(line))
    pipeLines(child.stderr, svc, (line) => process.stderr.write(line))
    child.on("error", (err) => console.error(`${tag(svc)} ${paint(31, `failed to start: ${err.message}`)}`))
    child.on("exit", (code, signal) => {
        if (shuttingDown) return
        console.log(`${tag(svc)} ${paint(code === 0 ? 33 : 31, `exited (code ${code}${signal ? `, signal ${signal}` : ""}) - other services keep running`)}`)
    })
    running.push({ svc, child })
    console.log(`${tag(svc)} started (pid ${child.pid})`)
}

const shutdown = (reason) => {
    if (shuttingDown) return
    shuttingDown = true
    console.log(`\n${reason} - stopping ${running.length} process(es)...`)
    for (const { child } of running) if (child.exitCode === null) child.kill("SIGTERM")
    // Anything that ignores SIGTERM is force-killed after a grace period.
    setTimeout(() => {
        for (const { svc, child } of running) {
            if (child.exitCode === null) {
                console.log(`${tag(svc)} force killing`)
                child.kill("SIGKILL")
            }
        }
        process.exit(0)
    }, 4000).unref()
    const check = setInterval(() => {
        if (running.every(({ child }) => child.exitCode !== null || child.signalCode !== null)) {
            clearInterval(check)
            process.exit(0)
        }
    }, 150)
}

process.on("SIGINT", () => shutdown("Ctrl+C"))
process.on("SIGTERM", () => shutdown("SIGTERM"))
process.on("SIGHUP", () => shutdown("terminal closed"))
process.on("uncaughtException", (err) => {
    console.error("Uncaught exception:", err)
    shutdown("fatal error")
})

SERVICES.forEach((svc, i) => {
    svc.color = COLORS[i % COLORS.length]
    start(svc)
})
console.log(paint(1, `\nStarted ${running.length}/${SERVICES.length}. Press Ctrl+C to stop everything.`))
