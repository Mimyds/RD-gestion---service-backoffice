const allowedRedirectPaths = new Set([
  "/",
  "/clients",
  "/courriers",
  "/factures",
]);

const unsafeUrlCharacters = /[\\\u0000-\u001f\u007f]/;

/**
 * Resolves an authentication redirect without ever leaving the application.
 * Authentication callbacks intentionally use a closed list of destinations.
 */
export function safeRedirectUrl(requestedPath: string | null, origin: string) {
  const fallback = new URL("/", origin);
  if (
    !requestedPath
    || unsafeUrlCharacters.test(requestedPath)
    || !allowedRedirectPaths.has(requestedPath)
  ) {
    return fallback;
  }

  try {
    const destination = new URL(requestedPath, origin);
    if (
      destination.origin !== fallback.origin
      || destination.username
      || destination.password
      || destination.search
      || destination.hash
      || destination.pathname !== requestedPath
    ) {
      return fallback;
    }

    return destination;
  } catch {
    return fallback;
  }
}
