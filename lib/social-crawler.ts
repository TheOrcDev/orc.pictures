const SOCIAL_CRAWLER_UA =
  /Twitterbot|facebookexternalhit|Facebot|LinkedInBot/iu;
const GIF_SLUG = /^[a-z0-9-]+$/u;
const GIF_PREFIX = "/gifs/";
const GIF_SUFFIX = ".gif";

export const isSocialCrawler = (userAgent: string): boolean =>
  SOCIAL_CRAWLER_UA.test(userAgent);

export const gifFileSlug = (pathname: string): string | undefined => {
  if (!pathname.startsWith(GIF_PREFIX) || !pathname.endsWith(GIF_SUFFIX)) {
    return undefined;
  }

  const slug = pathname.slice(GIF_PREFIX.length, -GIF_SUFFIX.length);

  if (!GIF_SLUG.test(slug)) {
    return undefined;
  }

  return slug;
};
