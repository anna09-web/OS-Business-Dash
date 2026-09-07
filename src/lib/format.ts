export function formatEUR(amount: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(amount);
}

export function formatBerlinDate(value: string | Date, options?: Intl.DateTimeFormatOptions) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    dateStyle: "medium",
    ...options,
  }).format(date);
}

export function formatBerlinDateTime(value: string | Date) {
  return formatBerlinDate(value, { dateStyle: "medium", timeStyle: "short" });
}
