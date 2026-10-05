// Calendar-only dates use UTC arithmetic; completion timestamps are grouped in
// the browser's IANA timezone so midnight and daylight-saving changes are safe.
export function shiftDate(day, amount) {
  const value = new Date(`${day}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}
export function weekFor(day) {
  const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
  const start = shiftDate(day, -((weekday + 6) % 7));
  return { start, end: shiftDate(start, 6) };
}
export function dateInTimezone(timestamp, formatter) {
  const parts = Object.fromEntries(formatter.formatToParts(new Date(timestamp)).map(p => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
