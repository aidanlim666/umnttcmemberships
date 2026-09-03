/**
 * `?next=` comes from the URL bar, so it is attacker-controlled. Only same-site paths
 * are honoured — anything else falls back to the shop.
 */
export function safeNext(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}
