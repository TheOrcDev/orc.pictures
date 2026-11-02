import { parseAsString } from "nuqs/server";

export const gifSearchParams = {
  q: parseAsString.withDefault(""),
};
