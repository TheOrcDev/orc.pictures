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

const gifToPngBlob = async (image: Blob): Promise<Blob> => {
  const bitmap = await createImageBitmap(image);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const context = canvas.getContext("2d");

  if (!context) {
    bitmap.close();
    throw new Error("Could not draw the GIF");
  }

  context.drawImage(bitmap, 0, 0);
  bitmap.close();

  return canvas.convertToBlob({ type: "image/png" });
};

const encodeGifAsPng = async (gifPromise: Promise<Blob>): Promise<Blob> => {
  const gif = await gifPromise;

  return gifToPngBlob(gif);
};

export const copyGifFile = async (
  filePath: string,
  filename: string
): Promise<void> => {
  const gifPromise = fetchGifFile(filePath, filename);
  const canWriteGif = ClipboardItem.supports?.("image/gif") === true;

  if (canWriteGif) {
    await navigator.clipboard.write([
      new ClipboardItem({
        "image/gif": gifPromise,
      }),
    ]);
    return;
  }

  await navigator.clipboard.write([
    new ClipboardItem({
      "image/png": encodeGifAsPng(gifPromise),
    }),
  ]);
};
