import assert from "node:assert/strict";
import test from "node:test";

import { safeRedirectUrl } from "../lib/security/safe-redirect.ts";

const origin = "https://app.example";

test("allows only known internal destinations", () => {
  for (const path of ["/", "/clients", "/courriers", "/factures"]) {
    assert.equal(safeRedirectUrl(path, origin).href, `${origin}${path}`);
  }
});

test("falls back for external or ambiguous destinations", () => {
  for (const path of [
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "/%5c%5cevil.example",
    "javascript:alert(1)",
    "/factures?next=https://evil.example",
    "/factures#https://evil.example",
    "/factures/../clients",
    "/inconnue",
    "\u0000/factures",
  ]) {
    assert.equal(safeRedirectUrl(path, origin).href, `${origin}/`, path);
  }
});

test("falls back when no destination is requested", () => {
  assert.equal(safeRedirectUrl(null, origin).href, `${origin}/`);
  assert.equal(safeRedirectUrl("", origin).href, `${origin}/`);
});
