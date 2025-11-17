export const normalizeAllyCode = (
  value: string | number | null | undefined,
): string | null => {
  if (value === null || value === undefined) {
    return null
  }

  const digits = value.toString().replace(/\D/g, "")
  if (digits.length !== 9) {
    return null
  }

  return digits
}

export const sanitizeAllyCodeList = (
  codes?: (string | number | null | undefined)[],
): string[] =>
  (codes ?? [])
    .map((code) => normalizeAllyCode(code))
    .filter((code): code is string => Boolean(code))


