const mutationMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Adds the browser-request marker required by the API's CSRF protection. */
export function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const method = (init.method || "GET").toUpperCase();
  const headers = new Headers(init.headers);

  if (mutationMethods.has(method)) {
    headers.set("X-RD-Request", "1");
    if (init.body && typeof init.body === "string" && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
  }

  return fetch(input, { ...init, headers });
}
