import {
  Action,
  ActionPanel,
  Clipboard,
  Grid,
  Icon,
  Keyboard,
  closeMainWindow,
  getPreferenceValues,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";

import {
  absoluteUrl,
  assetUrl,
  bundledCatalog,
  gifsForStyle,
  isGifStyle,
  parseCatalog,
  type GifStyle,
  type StyledGif,
} from "./lib/catalog";
import { ensureLocalGif } from "./lib/copy-gif";

const copyGifFile = async (
  gif: StyledGif,
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
  gif: StyledGif,
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
  gif: StyledGif;
  localGifsDirectory?: string;
  origin: string;
}

const GifActions = ({ gif, localGifsDirectory, origin }: GifActionsProps) => {
  const fileUrl = absoluteUrl(gif.file, origin);
  const pageUrl = absoluteUrl(
    gif.style === "videorc" ? `/${gif.slug}?style=videorc` : `/${gif.slug}`,
    origin
  );

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
        shortcut={Keyboard.Shortcut.Common.Copy}
        title="Copy URL"
      />
      <Action.OpenInBrowser
        shortcut={Keyboard.Shortcut.Common.Open}
        title="Open Permalink"
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
  const [style, setStyle] = useState<GifStyle>("orc");
  const gifs = gifsForStyle(data ?? bundledCatalog, style);

  return (
    <Grid
      aspectRatio="1"
      columns={5}
      fit={Grid.Fit.Fill}
      inset={Grid.Inset.Zero}
      isLoading={isLoading}
      searchBarAccessory={
        <Grid.Dropdown
          onChange={(value) => setStyle(isGifStyle(value) ? value : "orc")}
          storeValue
          tooltip="Style"
        >
          <Grid.Dropdown.Item title="Orc" value="orc" />
          <Grid.Dropdown.Item title="Videorc" value="videorc" />
        </Grid.Dropdown>
      }
      searchBarPlaceholder={
        style === "videorc" ? "Search Videorc GIFs" : "Search orc GIFs"
      }
    >
      {gifs.length === 0 ? (
        <Grid.EmptyView
          description="Could not load the orc.pictures catalog."
          title="No GIFs"
        />
      ) : null}
      {gifs.map((gif) => (
        <Grid.Item
          key={`${gif.style}-${gif.slug}-${gif.revision ?? "current"}`}
          actions={
            <GifActions
              gif={gif}
              localGifsDirectory={localGifsDirectory}
              origin={origin}
            />
          }
          content={assetUrl(gif.poster, origin, gif.revision)}
          keywords={[gif.slug, gif.title, ...gif.tags]}
          title={gif.title}
        />
      ))}
    </Grid>
  );
};

export default SearchOrcGifs;
