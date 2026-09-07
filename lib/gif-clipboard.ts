export const copyGifUrl = async (url: string): Promise<void> => {
  await navigator.clipboard.writeText(url);
};
