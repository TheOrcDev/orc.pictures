import Image from "next/image";
import Link from "next/link";

import { SITE_NAME } from "@/lib/site";

interface SiteBrandProps {
  compact?: boolean;
}

const SiteBrand = ({ compact = false }: SiteBrandProps) => {
  const size = compact ? 28 : 72;
  const mark = (
    <Image
      alt=""
      className="rounded-full object-cover"
      height={size}
      priority
      src="/logo.png"
      width={size}
    />
  );
  const title = (
    <span
      className={
        compact
          ? "font-heading text-sm font-semibold tracking-wider uppercase"
          : "font-heading text-3xl font-semibold tracking-wider uppercase"
      }
    >
      {SITE_NAME}
    </span>
  );

  if (compact) {
    return (
      <Link className="text-muted-foreground flex items-center gap-2" href="/">
        {mark}
        {title}
      </Link>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {mark}
      <h1>{title}</h1>
    </div>
  );
};

export { SiteBrand };
