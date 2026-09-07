const SITE_URL_VALUE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://orc.pictures";

export const SITE_NAME = "orc.pictures";
export const SITE_TITLE = "orc.pictures · Orc reaction gifs";
export const SITE_DESCRIPTION =
  "Search personal orc reaction gifs. Hover to play, click to copy the URL, and share a permalink.";
export const SITE_URL = new URL(SITE_URL_VALUE);
export const ORCDEV_NAME = "OrcDev";
export const ORCDEV_URL = "https://orcdev.com";
export const ORCDEV_X = "@orcdev";
export const SITE_KEYWORDS = [
  "orc gifs",
  "orc reaction gifs",
  "reaction gif",
  "gif picker",
  "orc.pictures",
  "orcdev",
] as const;

export const pageUrl = (path = "/"): string =>
  new URL(path, SITE_URL).toString();

export const gifPageDescription = (title: string): string =>
  `Copy or download the ${title} orc reaction gif from ${SITE_NAME}.`;
