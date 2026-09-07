const gifFileCache = new Map<string, Promise<File>>();

export const copyGifUrl = async (url: string): Promise<void> => {
  await navigator.clipboard.writeText(url);
};

const fetchGifFile = async (
  filePath: string,
  filename: string
): Promise<File> => {
  const response = await fetch(filePath);

  if (!response.ok) {
    gifFileCache.delete(filePath);
    throw new Error(`Could not fetch ${filename}`);
  }

  const blob = await response.blob();

  return new File([blob], filename, { type: "image/gif" });
};

export const loadGifFile = (
  filePath: string,
  filename: string
): Promise<File> => {
  const cached = gifFileCache.get(filePath);

  if (cached) {
    return cached;
  }

  const pending = fetchGifFile(filePath, filename);
  gifFileCache.set(filePath, pending);

  return pending;
};

export const canShareGifFile = (file: File): boolean =>
  navigator.canShare?.({ files: [file] }) === true;

export const shareGifFile = async (file: File): Promise<void> => {
  await navigator.share({ files: [file] });
};

export const addGifToDataTransfer = (
  dataTransfer: DataTransfer,
  file: File
): void => {
  dataTransfer.effectAllowed = "copy";
  dataTransfer.items.add(file);
};

export const isShareAbort = (error: DOMException): boolean =>
  error.name === "AbortError";
