const SOCIAL_CRAWLER_UA =
  /Twitterbot|facebookexternalhit|Facebot|LinkedInBot/iu;

const GIF_FILE_PATH = /^\/gifs\/(?<slug>[a-z0-9-]+)\.gif$/u;

export const isSocialCrawler = (userAgent: string): boolean =>
  SOCIAL_CRAWLER_UA.test(userAgent);

export const gifFileSlug = (pathname: string): string | undefined => {
  const match = GIF_FILE_PATH.exec(pathname);

  return match?.groups?.slug;
};
