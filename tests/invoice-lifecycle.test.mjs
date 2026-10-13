import assert from "node:assert/strict";
import test from "node:test";
import { isAllowedLockedStatusChange, isInvoiceLocked } from "../lib/invoice-lifecycle.ts";

test("locks invoices as soon as they are sent", () => {
  assert.equal(isInvoiceLocked("brouillon"), false);
  assert.equal(isInvoiceLocked("envoyée"), true);
  assert.equal(isInvoiceLocked("payée"), true);
});

test("only allows a sent invoice to become paid", () => {
  assert.equal(isAllowedLockedStatusChange("envoyée", "payée"), true);
  assert.equal(isAllowedLockedStatusChange("envoyée", "brouillon"), false);
  assert.equal(isAllowedLockedStatusChange("payée", "envoyée"), false);
  assert.equal(isAllowedLockedStatusChange("payée", "payée"), false);
});
