import { existsSync } from "node:fs";
import path from "node:path";

/**
 * The official crest lives at public/logo.png (or .svg). Until the club drops the real
 * file in, we fall back to a placeholder crest so nothing renders broken - the swap is
 * automatic the moment the file appears.
 */
const CANDIDATES = ["logo.png", "logo.svg", "logo.webp", "logo.jpg"];

let cached: string | null = null;

export function logoSrc(): string {
  if (cached) return cached;
  const publicDir = path.join(process.cwd(), "public");
  const found = CANDIDATES.find((f) => existsSync(path.join(publicDir, f)));
  cached = found ? `/${found}` : "/logo-placeholder.svg";
  return cached;
}
