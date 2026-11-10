export function formatPhone(digits: string) {
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return digits;
}

export function formatWhen(iso: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}

export function displayName(input: string) {
  return input.normalize("NFC").trim().replace(/\s+/g, " ");
}

export function normalizeName(input: string) {
  return input.normalize("NFC").trim().replace(/\s+/g, "").toLowerCase();
}

export function normalizePhone(input: string) {
  return input.replace(/\D/g, "");
}
