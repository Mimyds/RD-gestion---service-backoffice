import assert from "node:assert/strict";
import test from "node:test";

import { apiFetch } from "../lib/http.ts";

test("adds the CSRF marker and JSON content type to mutations", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_input, init) => new Response(JSON.stringify(Object.fromEntries(init.headers)));

  try {
    const response = await apiFetch("https://app.example/api/clients", { method: "POST", body: "{}" });
    const headers = await response.json();
    assert.equal(headers["x-rd-request"], "1");
    assert.equal(headers["content-type"], "application/json");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("does not add mutation headers to reads", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_input, init) => new Response(JSON.stringify(Object.fromEntries(init.headers)));

  try {
    const response = await apiFetch("https://app.example/api/clients");
    assert.deepEqual(await response.json(), {});
  } finally {
    globalThis.fetch = originalFetch;
  }
});
