import {
  createSerializer,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs/server";

import { DEFAULT_GIF_STYLE, GIF_STYLES } from "@/lib/gifs";

export const gifSearchParams = {
  q: parseAsString.withDefault(""),
  style: parseAsStringLiteral(GIF_STYLES).withDefault(DEFAULT_GIF_STYLE),
};

export const serializeGifSearchParams = createSerializer(gifSearchParams);
