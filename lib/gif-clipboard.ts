export type GifFileCopyResult = "copied" | "downloaded";

export const copyGifUrl = async (url: string): Promise<void> => {
  await navigator.clipboard.writeText(url);
};

const downloadGif = (filePath: string, filename: string): void => {
  const link = document.createElement("a");
  link.download = filename;
  link.href = filePath;
  document.body.append(link);
  link.click();
  link.remove();
};

export const copyGifFile = async (
  filePath: string,
  filename: string
): Promise<GifFileCopyResult> => {
  const response = await fetch(filePath);

  if (!response.ok) {
    throw new Error(`Could not fetch ${filename}`);
  }

  const blob = await response.blob();
  const type = "image/gif";
  const file = new File([blob], filename, { type });

  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        [type]: file,
      }),
    ]);

    return "copied";
  } catch {
    downloadGif(filePath, filename);

    return "downloaded";
  }
};
