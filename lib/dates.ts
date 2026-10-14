// Calendar date (YYYY-MM-DD) in the user's time zone, not UTC.
export function localDate(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export const formatDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString("fr-FR");

export const fileName = (value: string, fallback: string) => value
  .normalize("NFD")
  .replace(/[̀-ͯ]/g, "")
  .replace(/[^a-zA-Z0-9]+/g, "-")
  .replace(/^-|-$/g, "")
  .toLowerCase() || fallback;
