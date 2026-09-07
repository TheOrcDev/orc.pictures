import {
  Action,
  ActionPanel,
  Clipboard,
  Grid,
  Icon,
  closeMainWindow,
  getPreferenceValues,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";

import {
  absoluteUrl,
  bundledCatalog,
  parseCatalog,
  type CatalogGif,
} from "./lib/catalog";
import { ensureLocalGif } from "./lib/copy-gif";

const copyGifFile = async (
  gif: CatalogGif,
  origin: string,
  localGifsDirectory?: string
): Promise<void> => {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Copying GIF…",
  });

  try {
    const path = await ensureLocalGif(gif, origin, localGifsDirectory);
    await Clipboard.copy({ file: path });
    await closeMainWindow();
    await showHUD(`Copied ${gif.title}`);
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not copy GIF";
    toast.message = error instanceof Error ? error.message : "Unknown error";
  }
};

const pasteGifFile = async (
  gif: CatalogGif,
  origin: string,
  localGifsDirectory?: string
): Promise<void> => {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Pasting GIF…",
  });

  try {
    const path = await ensureLocalGif(gif, origin, localGifsDirectory);
    await Clipboard.paste({ file: path });
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not paste GIF";
    toast.message = error instanceof Error ? error.message : "Unknown error";
  }
};

interface GifActionsProps {
  gif: CatalogGif;
  localGifsDirectory?: string;
  origin: string;
}

const GifActions = ({ gif, localGifsDirectory, origin }: GifActionsProps) => {
  const fileUrl = absoluteUrl(gif.file, origin);
  const pageUrl = absoluteUrl(`/${gif.slug}`, origin);

  return (
    <ActionPanel>
      <Action
        icon={Icon.Clipboard}
        title="Copy GIF"
        onAction={() => copyGifFile(gif, origin, localGifsDirectory)}
      />
      <Action
        icon={Icon.Download}
        shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
        title="Paste GIF"
        onAction={() => pasteGifFile(gif, origin, localGifsDirectory)}
      />
      <Action.CopyToClipboard
        content={fileUrl}
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        title="Copy URL"
      />
      <Action.OpenInBrowser
        shortcut={{ modifiers: ["cmd"], key: "o" }}
        title="Open on orc.pictures"
        url={pageUrl}
      />
    </ActionPanel>
  );
};

const SearchOrcGifs = () => {
  const { catalogUrl, localGifsDirectory, siteUrl } =
    getPreferenceValues<Preferences>();
  const origin = siteUrl || "https://orc.pictures";
  const { data, isLoading } = useFetch(catalogUrl, {
    keepPreviousData: true,
    async parseResponse(response) {
      if (!response.ok) {
        throw new Error(`Catalog ${response.status}`);
      }

      return parseCatalog(await response.json());
    },
    onError() {
      // Bundled catalog covers first launch before /catalog.json is live.
    },
  });
  const gifs = data ?? bundledCatalog;

  return (
    <Grid
      aspectRatio="1"
      columns={5}
      fit={Grid.Fit.Fill}
      inset={Grid.Inset.Zero}
      isLoading={isLoading}
      navigationTitle="orc.pictures"
      searchBarPlaceholder="Search orc GIFs"
    >
      {gifs.map((gif) => (
        <Grid.Item
          key={gif.slug}
          actions={
            <GifActions
              gif={gif}
              localGifsDirectory={localGifsDirectory}
              origin={origin}
            />
          }
          content={absoluteUrl(gif.poster, origin)}
          keywords={[gif.slug, gif.title, ...gif.tags]}
          title={gif.title}
        />
      ))}
    </Grid>
  );
};

export default SearchOrcGifs;
