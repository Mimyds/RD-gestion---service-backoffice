import assert from "node:assert/strict"
import test from "node:test"

import { frenchVatDigits, isValidFrenchVatNumber, normalizeFrenchVatNumber } from "../lib/vat-number.ts"

test("accepts a French VAT number whose key matches its SIREN", () => {
  assert.equal(isValidFrenchVatNumber("FR40303265045"), true)
  assert.equal(isValidFrenchVatNumber("fr40 303 265 045"), true)
})

test("rejects malformed VAT numbers and invalid control keys", () => {
  assert.equal(isValidFrenchVatNumber("FR41303265045"), false)
  assert.equal(isValidFrenchVatNumber("FR4012345678"), false)
  assert.equal(isValidFrenchVatNumber("DE40303265045"), false)
  assert.equal(isValidFrenchVatNumber("FR00000000000"), false)
})

test("normalizes display and extracts the eleven editable digits", () => {
  assert.equal(normalizeFrenchVatNumber("fr40 303 265 045"), "FR40303265045")
  assert.equal(frenchVatDigits("FR40303265045"), "40303265045")
  assert.equal(frenchVatDigits("FR 40 303 265 045"), "40303265045")
})
