const FRENCH_VAT_PATTERN = /^FR\d{11}$/

export function normalizeFrenchVatNumber(value: string) {
  return value.replace(/\s/g, "").toUpperCase()
}

export function frenchVatDigits(value: string) {
  const normalized = normalizeFrenchVatNumber(value)
  return (normalized.startsWith("FR") ? normalized.slice(2) : normalized).replace(/\D/g, "").slice(0, 11)
}

export function isValidFrenchVatNumber(value: string) {
  const normalized = normalizeFrenchVatNumber(value)
  if (!FRENCH_VAT_PATTERN.test(normalized)) return false

  const key = Number(normalized.slice(2, 4))
  const siren = normalized.slice(4)
  if (siren === "000000000") return false

  return key === (12 + 3 * (Number(siren) % 97)) % 97
}
