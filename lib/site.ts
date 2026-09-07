const SITE_URL_VALUE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://orc.pictures";

export const SITE_NAME = "orc.pictures";
export const SITE_DESCRIPTION = "Search and copy personal orc reaction gifs.";
export const SITE_URL = new URL(SITE_URL_VALUE);
