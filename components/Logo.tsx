import Image from "next/image";
import { logoSrc } from "@/lib/logo";

/**
 * The club crest. A square box with `object-contain` means the real logo can have any
 * proportions — it is letterboxed rather than distorted, and next/image never has to
 * guess an intrinsic aspect ratio it cannot know.
 */
export function Logo({
  size = 40,
  className = "",
  priority = false,
}: {
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <span
      className={`relative inline-block shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={logoSrc()}
        alt="UMN Table Tennis Club"
        fill
        sizes={`${size}px`}
        priority={priority}
        className="object-contain"
      />
    </span>
  );
}
