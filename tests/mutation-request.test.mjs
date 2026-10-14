import assert from "node:assert/strict";
import test from "node:test";

import { validateMutationRequest } from "../lib/security/mutation-request.ts";

const origin = "https://app.example";

function request(method, headers = {}, body) {
  return new Request(`${origin}/api/invoices`, { method, headers, body });
}

test("accepts a marked same-origin JSON mutation", () => {
  const result = validateMutationRequest(request("POST", {
    "Content-Type": "application/json; charset=utf-8",
    "Origin": origin,
    "Sec-Fetch-Site": "same-origin",
    "X-RD-Request": "1",
  }, "{}"), origin);
  assert.equal(result, null);
});

test("rejects missing, foreign, and same-site origins", () => {
  for (const headers of [
    { "Content-Type": "application/json", "X-RD-Request": "1" },
    { "Content-Type": "application/json", "Origin": "https://evil.example", "X-RD-Request": "1" },
    { "Content-Type": "application/json", "Origin": origin, "Sec-Fetch-Site": "same-site", "X-RD-Request": "1" },
  ]) {
    assert.equal(validateMutationRequest(request("POST", headers, "{}"), origin)?.status, 403);
  }
});

test("rejects a mutation without the browser marker", () => {
  const result = validateMutationRequest(request("DELETE", { Origin: origin }), origin);
  assert.equal(result?.event, "security.csrf_rejected");
  assert.equal(result?.status, 403);
});

test("requires JSON for mutations with a body", () => {
  const result = validateMutationRequest(request("POST", {
    "Content-Type": "text/plain",
    "Origin": origin,
    "X-RD-Request": "1",
  }, "{}"), origin);
  assert.equal(result?.status, 415);
});

test("keeps DELETE requests body-free and rejects oversized requests", () => {
  assert.equal(validateMutationRequest(request("DELETE", {
    "Origin": origin,
    "X-RD-Request": "1",
  }), origin), null);

  const result = validateMutationRequest(request("PUT", {
    "Content-Length": "256001",
    "Content-Type": "application/json",
    "Origin": origin,
    "X-RD-Request": "1",
  }, "{}"), origin);
  assert.equal(result?.status, 413);
});
