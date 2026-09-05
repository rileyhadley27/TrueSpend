import Image from "next/image";
import { cn } from "@/lib/utils";

export function DivvyLogo({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative block shrink-0 overflow-hidden rounded-xl bg-[#0A2A69]",
        className,
      )}
    >
      <Image
        src="/brand/divvy-logo.jpeg"
        alt=""
        fill
        sizes="64px"
        className="scale-[1.65] object-cover"
      />
    </span>
  );
}
