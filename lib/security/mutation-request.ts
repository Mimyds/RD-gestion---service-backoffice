const jsonBodyMethods = new Set(["POST", "PUT", "PATCH"]);

export type MutationRequestFailure = {
  event: "security.content_type_rejected" | "security.csrf_rejected" | "security.request_too_large";
  message: string;
  status: 403 | 413 | 415;
};

export function validateMutationRequest(request: Request, expectedOrigin: string): MutationRequestFailure | null {
  const contentLength = Number(request.headers.get("content-length") || "0");
  if (Number.isFinite(contentLength) && contentLength > 256_000) {
    return { event: "security.request_too_large", message: "Requête trop volumineuse.", status: 413 };
  }

  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  const browserMarker = request.headers.get("x-rd-request");
  if (origin !== expectedOrigin || (fetchSite !== null && fetchSite !== "same-origin") || browserMarker !== "1") {
    return { event: "security.csrf_rejected", message: "Origine de la requête refusée.", status: 403 };
  }

  if (jsonBodyMethods.has(request.method.toUpperCase())) {
    const contentType = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
    if (contentType !== "application/json") {
      return { event: "security.content_type_rejected", message: "Type de contenu non pris en charge.", status: 415 };
    }
  }

  return null;
}
