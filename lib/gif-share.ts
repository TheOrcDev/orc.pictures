export const gifAbsoluteUrl = (file: string, origin: string): string =>
  new URL(file, origin).toString();

export const gifMarkdown = (title: string, url: string): string =>
  `![${title}](${url})`;
