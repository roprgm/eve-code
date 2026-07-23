const minute = 60_000;
const hour = 60 * minute;
const day = 24 * hour;

export function formatRelativeTime(timestamp: number, now: number): string {
  const elapsed = Math.max(now - timestamp, 0);
  const minutes = Math.floor(elapsed / minute);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(elapsed / hour);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(elapsed / day);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  return `${Math.floor(months / 12)}y`;
}
