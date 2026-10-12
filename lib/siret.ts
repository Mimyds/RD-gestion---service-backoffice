const SIRET_PATTERN = /^\d{14}$/
const LA_POSTE_SIREN = "356000000"

export function isValidSiret(value: string) {
  if (!SIRET_PATTERN.test(value)) return false
  if (value === "00000000000000") return false

  // La Poste uses a public exception to the usual Luhn rule for its establishments.
  if (value.startsWith(LA_POSTE_SIREN)) {
    return [...value].reduce((sum, digit) => sum + Number(digit), 0) % 5 === 0
  }

  let sum = 0
  for (let index = 0; index < value.length; index += 1) {
    let digit = Number(value[index])
    if (index % 2 === 0) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
  }

  return sum % 10 === 0
}
