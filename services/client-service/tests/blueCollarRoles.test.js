import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import { BLUE_COLLAR_ROLES, isBlueCollar, blueCollarLabel } from "../utils/blueCollar.js"

test("the umbrella category and every listed profile count as blue collar; others do not", () => {
    assert.ok(isBlueCollar("BLUE_COLLAR"))
    for (const role of BLUE_COLLAR_ROLES) assert.ok(isBlueCollar(role.value), role.value)
    assert.ok(!isBlueCollar("SOFTWARE_ENGINEERING"))
    assert.ok(!isBlueCollar("BLUE_COLLAR_UNKNOWN"))
    assert.equal(blueCollarLabel("BLUE_COLLAR_WATCHMAN"), "Watchman / Security Guard")
    assert.equal(blueCollarLabel("BLUE_COLLAR"), null)
})

test("the client's role list is identical to the server's", () => {
    const client = fs.readFileSync(new URL("../../../client/src/constants/blueCollarRoles.js", import.meta.url), "utf8")
    const values = [...client.matchAll(/value: '([A-Z_]+)', label: 'Blue Collar - ([^']+)'/g)].map((m) => [m[1], m[2]])
    assert.deepEqual(values, BLUE_COLLAR_ROLES.map((r) => [r.value, r.label]))
})
