/**
 * Fail-closed schedule gate for automated discovery email.
 * A customer-selected project urgency is not an owner-approved exception
 * to the brand's communication hours. Manual, authenticated sends are separate.
 */
export function isWithinDiscoveryBusinessWindow(now: Date = new Date()): boolean {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) return false;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    weekday: 'short',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const day = parts.find((part) => part.type === 'weekday')?.value;
  const hour = Number(parts.find((part) => part.type === 'hour')?.value);
  return day !== undefined && !['Sat', 'Sun'].includes(day) && Number.isInteger(hour) && hour >= 8 && hour < 18;
}
