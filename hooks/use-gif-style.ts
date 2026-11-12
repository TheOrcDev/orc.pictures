"use client";

import { useQueryState } from "nuqs";

import { gifSearchParams } from "@/lib/search-params";

export const useGifStyle = () => useQueryState("style", gifSearchParams.style);
