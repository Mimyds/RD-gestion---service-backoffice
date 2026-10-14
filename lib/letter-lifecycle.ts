export type LetterStatus = "brouillon" | "finalisé" | "envoyé" | "archivé";

export const isLetterLocked = (status: LetterStatus) => status !== "brouillon";

export const isAllowedDraftLetterStatus = (requested: unknown) =>
  requested === "brouillon" || requested === "finalisé";

export function isAllowedLockedLetterStatusChange(current: LetterStatus, requested: unknown) {
  if (current === "finalisé") return requested === "brouillon" || requested === "envoyé";
  if (current === "envoyé") return requested === "archivé";
  return false;
}
