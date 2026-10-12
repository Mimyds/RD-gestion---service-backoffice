import assert from "node:assert/strict"
import test from "node:test"

import { isValidSiret } from "../lib/siret.ts"

test("accepts a valid 14-digit SIRET", () => {
  assert.equal(isValidSiret("73282932000074"), true)
})

test("rejects malformed or invalid SIRET numbers", () => {
  assert.equal(isValidSiret("7328293200007"), false)
  assert.equal(isValidSiret("73282932000075"), false)
  assert.equal(isValidSiret("732 829 320 00074"), false)
  assert.equal(isValidSiret("ABCDEFGHIJKLMN"), false)
  assert.equal(isValidSiret("00000000000000"), false)
})
