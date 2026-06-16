export function formatPostDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

const MINUTE = 60_000;
const HOUR   = 60 * MINUTE;
const DAY    = 24 * HOUR;
const WEEK   = 7  * DAY;

function fmtTime(d: Date): string {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  if (isNaN(diff)) return "";

  if (diff < MINUTE) return "just now";

  if (diff < HOUR) {
    const m = Math.floor(diff / MINUTE);
    return `${m} ${m === 1 ? "min" : "mins"} ago`;
  }

  if (diff < DAY) {
    const h = Math.floor(diff / HOUR);
    return `${h} ${h === 1 ? "hour" : "hours"} ago`;
  }

  const now       = new Date();
  const time      = fmtTime(date);
  const todayMid  = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateMid   = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysDiff  = Math.round((todayMid.getTime() - dateMid.getTime()) / DAY);

  if (daysDiff === 1) return `Yesterday · ${time}`;

  if (diff < WEEK) {
    const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
    return `${weekday} · ${time}`;
  }

  if (date.getFullYear() === now.getFullYear()) {
    const md = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${md} · ${time}`;
  }

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
