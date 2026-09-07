export const copyGifUrl = async (url: string): Promise<void> => {
  await navigator.clipboard.writeText(url);
};

const fetchGifFile = async (
  filePath: string,
  filename: string
): Promise<File> => {
  const response = await fetch(filePath);

  if (!response.ok) {
    throw new Error(`Could not fetch ${filename}`);
  }

  const blob = await response.blob();

  return new File([blob], filename, { type: "image/gif" });
};

export const copyGifFile = async (
  filePath: string,
  filename: string
): Promise<void> => {
  await navigator.clipboard.write([
    new ClipboardItem({
      "image/gif": fetchGifFile(filePath, filename),
    }),
  ]);
};
